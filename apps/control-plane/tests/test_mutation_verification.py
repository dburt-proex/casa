import pytest

import casa.middleware as middleware
from casa.middleware import (
    FieldDeltaExpectation,
    MutationExecutionFailed,
    MutationVerificationContract,
    PartialExecutionDetected,
    PostMutationReadCheckFailed,
    SessionIsolated,
    SubAgentSession,
    ToolExecutionContract,
    VerificationContractRequired,
    casa_guard,
)


@pytest.fixture(autouse=True)
def allow_execution(monkeypatch):
    monkeypatch.setattr(middleware, "evaluate_action", lambda agent, action: "ALLOW")


def _update_contract(state_reader):
    return ToolExecutionContract(
        mutates_data=True,
        verification=MutationVerificationContract(
            target_key="customer-1",
            state_reader=state_reader,
            expected_delta={
                "status": FieldDeltaExpectation(
                    before="pending",
                    after="active",
                )
            },
            expect_resource_exists=True,
        ),
    )


def test_mutation_performs_target_bound_pre_and_post_reads_before_memory_commit():
    state = {"customer-1": {"status": "pending", "balance": 100}}
    reads = []
    memory = []

    def state_reader(target_key):
        reads.append(target_key)
        return dict(state.get(target_key, {}))

    def update_customer():
        state["customer-1"]["status"] = "active"
        return {"updated": "customer-1"}

    result = casa_guard(
        "agent-1",
        "update_customer",
        update_customer,
        execution_contract=_update_contract(state_reader),
        session=SubAgentSession(session_id="session-1"),
        memory_committer=memory.append,
    )

    assert result == {"updated": "customer-1"}
    assert reads == ["customer-1", "customer-1"]
    assert memory == [{"updated": "customer-1"}]


def test_unexpected_delta_isolates_session_routes_review_and_blocks_memory():
    state = {"customer-1": {"status": "pending", "balance": 100}}
    routed_incidents = []
    memory = []
    session = SubAgentSession(session_id="session-2")

    def state_reader(target_key):
        return dict(state.get(target_key, {}))

    def partially_corrupting_update():
        state["customer-1"]["status"] = "active"
        state["customer-1"]["balance"] = 0
        return {"updated": "customer-1"}

    with pytest.raises(PartialExecutionDetected) as error:
        casa_guard(
            "agent-1",
            "update_customer",
            partially_corrupting_update,
            execution_contract=_update_contract(state_reader),
            session=session,
            exception_handler=routed_incidents.append,
            memory_committer=memory.append,
        )

    assert session.isolated is True
    assert session.isolation_reason == "PARTIAL_EXECUTION_DETECTED"
    assert len(session.review_queue) == 1
    assert routed_incidents == session.review_queue
    assert error.value.incident.actual_delta["balance"] == (100, 0)
    assert memory == []


def test_missing_contract_blocks_mutation_before_tool_execution():
    calls = []

    with pytest.raises(VerificationContractRequired):
        casa_guard(
            "agent-1",
            "delete_customer",
            lambda: calls.append("tool-called"),
        )

    assert calls == []


def test_post_mutation_read_failure_isolates_session_and_blocks_memory():
    calls = {"reads": 0}
    memory = []
    session = SubAgentSession(session_id="session-3")

    def state_reader(target_key):
        calls["reads"] += 1
        if calls["reads"] == 1:
            return {"status": "pending"}
        raise RuntimeError("resource store unavailable")

    with pytest.raises(PostMutationReadCheckFailed):
        casa_guard(
            "agent-1",
            "update_customer",
            lambda: {"updated": "customer-1"},
            execution_contract=_update_contract(state_reader),
            session=session,
            memory_committer=memory.append,
        )

    assert session.isolated is True
    assert session.isolation_reason == "POST_MUTATION_READ_FAILED"
    assert memory == []


def test_mislabeled_mutation_cannot_bypass_verification_contract():
    calls = []

    with pytest.raises(VerificationContractRequired):
        casa_guard(
            "agent-1",
            "update_customer",
            lambda: calls.append("tool-called"),
            execution_contract=ToolExecutionContract(mutates_data=False),
        )

    assert calls == []


def test_failed_mutation_is_verified_then_isolated_before_memory_commit():
    state = {"customer-1": {"status": "pending"}}
    session = SubAgentSession(session_id="session-4")
    memory = []

    def state_reader(target_key):
        return dict(state[target_key])

    def tool_that_fails_after_mutation():
        state["customer-1"]["status"] = "active"
        raise RuntimeError("downstream timeout")

    with pytest.raises(MutationExecutionFailed):
        casa_guard(
            "agent-1",
            "update_customer",
            tool_that_fails_after_mutation,
            execution_contract=_update_contract(state_reader),
            session=session,
            memory_committer=memory.append,
        )

    assert session.isolated is True
    assert session.isolation_reason == "MUTATION_TOOL_EXECUTION_FAILED"
    assert memory == []


def test_isolated_session_cannot_execute_follow_up_tools():
    session = SubAgentSession(
        session_id="session-5",
        isolated=True,
        isolation_reason="PARTIAL_EXECUTION_DETECTED",
    )
    calls = []

    with pytest.raises(SessionIsolated):
        casa_guard(
            "agent-1",
            "read_customer",
            lambda: calls.append("tool-called"),
            session=session,
        )

    assert calls == []
