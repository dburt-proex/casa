"""Deterministic execution boundary for CASA-managed tool calls."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, TypeAlias

from casa.evaluator import evaluate_action


class _Sentinel:
    """Identity sentinel used to express an absent value or unconstrained boundary."""

    def __init__(self, label: str) -> None:
        self.label = label

    def __repr__(self) -> str:
        return self.label


MISSING = _Sentinel("MISSING")
ANY = _Sentinel("ANY")

StateSnapshot: TypeAlias = Mapping[str, Any] | None
StateReader: TypeAlias = Callable[[str], StateSnapshot]
ToolFunction: TypeAlias = Callable[[], Any]
MemoryCommitter: TypeAlias = Callable[[Any], None]


class VerificationContractRequired(RuntimeError):
    """Raised before execution when a mutating tool lacks a verification contract."""


class PostMutationReadCheckFailed(RuntimeError):
    """Raised when CASA cannot read the target resource immediately after mutation."""


class PartialExecutionDetected(RuntimeError):
    """Raised when the observed state delta exceeds the declared mutation boundary."""

    def __init__(self, incident: "VerificationIncident") -> None:
        super().__init__(
            "PartialExecutionDetected: observed state delta does not match "
            "the declared mutation boundary"
        )
        self.incident = incident


@dataclass(frozen=True)
class FieldDeltaExpectation:
    """Expected before/after values for one top-level resource field."""

    before: Any = ANY
    after: Any = ANY


@dataclass(frozen=True)
class MutationVerificationContract:
    """Target-bound read-after-write contract for one data mutation."""

    target_key: str
    state_reader: StateReader
    expected_delta: Mapping[str, FieldDeltaExpectation] = field(default_factory=dict)
    expect_resource_exists: bool | None = None
    allow_unexpected_fields: bool = False


@dataclass(frozen=True)
class ToolExecutionContract:
    """Explicit tool metadata required by the CASA middleware."""

    mutates_data: bool
    verification: MutationVerificationContract | None = None


@dataclass
class SubAgentSession:
    """Minimal containment state; isolated sessions must not receive memory writes."""

    session_id: str
    isolated: bool = False
    isolation_reason: str | None = None
    review_queue: list["VerificationIncident"] = field(default_factory=list)


@dataclass(frozen=True)
class VerificationIncident:
    """Structured evidence produced before an agent is isolated."""

    agent: str
    action: str
    session_id: str
    target_key: str
    stage: str
    error_code: str
    detail: str
    pre_state: dict[str, Any] | None
    post_state: dict[str, Any] | None
    actual_delta: Mapping[str, tuple[Any, Any]]


ExceptionHandler: TypeAlias = Callable[[VerificationIncident], None]


_MUTATION_ACTION_PREFIXES = (
    "create",
    "update",
    "delete",
    "write",
    "insert",
    "remove",
    "set",
    "put",
    "patch",
    "upsert",
    "archive",
)


def _looks_like_mutation(action: str) -> bool:
    normalized = action.strip().lower()
    return any(
        normalized == prefix
        or normalized.startswith(f"{prefix}_")
        or normalized.startswith(f"{prefix}-")
        or normalized.startswith(f"{prefix} ")
        for prefix in _MUTATION_ACTION_PREFIXES
    )


def _copy_state(state: StateSnapshot) -> dict[str, Any] | None:
    if state is None:
        return None
    if not isinstance(state, Mapping):
        raise TypeError("State readers must return a mapping or None")
    return dict(state)


def _state_delta(
    pre_state: dict[str, Any] | None,
    post_state: dict[str, Any] | None,
) -> dict[str, tuple[Any, Any]]:
    before = pre_state or {}
    after = post_state or {}
    return {
        field_name: (before.get(field_name, MISSING), after.get(field_name, MISSING))
        for field_name in sorted(set(before) | set(after))
        if before.get(field_name, MISSING) != after.get(field_name, MISSING)
    }


def _matches(expected: Any, actual: Any) -> bool:
    return expected is ANY or expected == actual


def _delta_mismatches(
    contract: MutationVerificationContract,
    pre_state: dict[str, Any] | None,
    post_state: dict[str, Any] | None,
    actual_delta: Mapping[str, tuple[Any, Any]],
) -> list[str]:
    mismatches: list[str] = []

    if contract.expect_resource_exists is not None:
        observed_exists = post_state is not None
        if observed_exists != contract.expect_resource_exists:
            mismatches.append(
                "resource existence did not match expected post-mutation state"
            )

    for field_name, expectation in contract.expected_delta.items():
        actual = actual_delta.get(field_name)
        if actual is None:
            mismatches.append(f"{field_name}: expected a state change")
            continue
        if not _matches(expectation.before, actual[0]):
            mismatches.append(f"{field_name}: unexpected pre-mutation value")
        if not _matches(expectation.after, actual[1]):
            mismatches.append(f"{field_name}: unexpected post-mutation value")

    if not contract.allow_unexpected_fields:
        unexpected = sorted(set(actual_delta) - set(contract.expected_delta))
        if unexpected:
            mismatches.append(
                "unexpected state changes: " + ", ".join(unexpected)
            )

    return mismatches


def _isolate_and_route(
    session: SubAgentSession,
    incident: VerificationIncident,
    exception_handler: ExceptionHandler | None,
) -> None:
    """Contain the session before any memory committer can run."""

    session.isolated = True
    session.isolation_reason = incident.error_code
    session.review_queue.append(incident)

    if exception_handler is not None:
        exception_handler(incident)


def _verification_contract_or_fail(
    action: str,
    execution_contract: ToolExecutionContract | None,
) -> MutationVerificationContract | None:
    if execution_contract is None:
        if _looks_like_mutation(action):
            raise VerificationContractRequired(
                "Mutating action requires ToolExecutionContract with a "
                "MutationVerificationContract"
            )
        return None

    if execution_contract.mutates_data and execution_contract.verification is None:
        raise VerificationContractRequired(
            "Data-mutating tool requires a MutationVerificationContract"
        )
    if not execution_contract.mutates_data and execution_contract.verification:
        raise VerificationContractRequired(
            "Non-mutating tool cannot declare a mutation verification contract"
        )
    return execution_contract.verification


def casa_guard(
    agent: str,
    action: str,
    tool_function: ToolFunction,
    *,
    execution_contract: ToolExecutionContract | None = None,
    session: SubAgentSession | None = None,
    exception_handler: ExceptionHandler | None = None,
    memory_committer: MemoryCommitter | None = None,
) -> Any:
    """Gate and execute a tool call, verifying every declared data mutation.

    For mutations, CASA performs a target-key-bound pre-read, invokes the tool,
    then performs the post-read immediately. The session is isolated and routed
    to review before any memory committer can receive a failed execution result.
    """

    verification = _verification_contract_or_fail(action, execution_contract)
    active_session = session or SubAgentSession(session_id=f"{agent}:{action}")

    print("\n[CASA] Intercepting tool request")
    decision = evaluate_action(agent, action)

    if decision != "ALLOW":
        if decision == "REVIEW":
            print("[CASA] Manual review required")
        elif decision == "HALT":
            print("[CASA] Action blocked by CASA")
        return None

    print("[CASA] Executing tool")

    if verification is None:
        result = tool_function()
        if memory_committer is not None:
            memory_committer(result)
        return result

    try:
        pre_state = _copy_state(verification.state_reader(verification.target_key))
    except Exception as error:
        incident = VerificationIncident(
            agent=agent,
            action=action,
            session_id=active_session.session_id,
            target_key=verification.target_key,
            stage="pre_mutation_read",
            error_code="PRE_MUTATION_READ_FAILED",
            detail=str(error),
            pre_state=None,
            post_state=None,
            actual_delta={},
        )
        _isolate_and_route(active_session, incident, exception_handler)
        raise PostMutationReadCheckFailed(
            "CASA could not read the target resource before mutation"
        ) from error

    result = tool_function()

    try:
        post_state = _copy_state(verification.state_reader(verification.target_key))
    except Exception as error:
        incident = VerificationIncident(
            agent=agent,
            action=action,
            session_id=active_session.session_id,
            target_key=verification.target_key,
            stage="post_mutation_read",
            error_code="POST_MUTATION_READ_FAILED",
            detail=str(error),
            pre_state=pre_state,
            post_state=None,
            actual_delta={},
        )
        _isolate_and_route(active_session, incident, exception_handler)
        raise PostMutationReadCheckFailed(
            "CASA could not read the target resource immediately after mutation"
        ) from error

    actual_delta = _state_delta(pre_state, post_state)
    mismatches = _delta_mismatches(
        verification,
        pre_state,
        post_state,
        actual_delta,
    )
    if mismatches:
        incident = VerificationIncident(
            agent=agent,
            action=action,
            session_id=active_session.session_id,
            target_key=verification.target_key,
            stage="state_delta_assertion",
            error_code="PARTIAL_EXECUTION_DETECTED",
            detail="; ".join(mismatches),
            pre_state=pre_state,
            post_state=post_state,
            actual_delta=actual_delta,
        )
        _isolate_and_route(active_session, incident, exception_handler)
        raise PartialExecutionDetected(incident)

    if memory_committer is not None:
        memory_committer(result)
    return result
