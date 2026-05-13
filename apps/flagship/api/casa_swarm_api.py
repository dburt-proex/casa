"""CASA Swarm API — Block 2

Additive FastAPI surface for the CASA supervised swarm demo.

Endpoint:
    POST /swarm/evaluate

Purpose:
    Run a task through the supervised swarm core loop and return a governed
    decision packet. Airtable logging is represented as an optional adapter
    contract so credentials are not hardcoded in the repository.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import uuid
from typing import Any, Dict, List, Literal, Optional

try:
    from fastapi import FastAPI
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "FastAPI and Pydantic are required to run this API. Install with: pip install fastapi pydantic uvicorn"
    ) from exc


Gate = Literal["ALLOW", "REVIEW", "HALT"]
QAStatus = Literal["PASS", "FAIL"]


class SwarmEvaluateRequest(BaseModel):
    task: str = Field(..., min_length=1, description="Task or action to evaluate")
    block_name: str = Field(default="CASA Swarm API Evaluation", description="Execution block name")
    objective: Optional[str] = Field(default=None, description="Optional explicit objective")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional caller metadata")


class SwarmDecisionPacket(BaseModel):
    task_id: str
    block_name: str
    objective: str
    gate: Gate
    risk_score: float
    qa_status: QAStatus
    agents_run: List[str]
    decision_summary: str
    ledger_entry: Dict[str, Any]
    rollback_defined: bool
    accepted: bool
    created_at: str
    next_gate: str
    airtable_logging: Dict[str, Any]


class SupervisorAgent:
    name = "Supervisor"

    def plan(self, request: SwarmEvaluateRequest) -> Dict[str, Any]:
        objective = request.objective or request.task
        return {
            "block_name": request.block_name,
            "objective": objective,
            "steps": ["Builder", "QA", "Governance", "Ledger"],
            "scope_boundary": "single API evaluation only",
        }


class BuilderAgent:
    name = "Builder"

    def build(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "artifact_type": "decision_draft",
            "summary": f"Prepared governed execution draft for: {plan['objective']}",
            "rollback_path": "No external mutation performed by demo API.",
        }


class QAAgent:
    name = "QA"

    def validate(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        required = ["artifact_type", "summary", "rollback_path"]
        missing = [key for key in required if not artifact.get(key)]
        status: QAStatus = "FAIL" if missing else "PASS"
        return {
            "qa_status": status,
            "missing_fields": missing,
            "checks": {
                "artifact_present": bool(artifact),
                "rollback_defined": bool(artifact.get("rollback_path")),
                "summary_present": bool(artifact.get("summary")),
            },
        }


class GovernanceAgent:
    name = "Governance"

    def classify(self, request: SwarmEvaluateRequest, qa_result: Dict[str, Any]) -> Dict[str, Any]:
        task_text = f"{request.task} {request.objective or ''}".lower()
        risky_terms = [
            "deploy",
            "delete",
            "payment",
            "credential",
            "secret",
            "production",
            "customer data",
            "database write",
        ]
        high_risk_hits = [term for term in risky_terms if term in task_text]

        if qa_result["qa_status"] == "FAIL":
            return {"gate": "REVIEW", "risk_score": 0.62, "reason": "QA failed required checks"}

        if high_risk_hits:
            return {
                "gate": "REVIEW",
                "risk_score": 0.72,
                "reason": f"Task contains review-gated terms: {', '.join(high_risk_hits)}",
            }

        return {"gate": "ALLOW", "risk_score": 0.12, "reason": "Low-risk demo evaluation"}


class Ledger:
    def __init__(self) -> None:
        self.entries: List[Dict[str, Any]] = []

    def append(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        self.entries.append(entry)
        return entry


class AirtableLogger:
    """Optional adapter contract for Airtable logging.

    This class intentionally does not perform a live API call because repository
    code must not contain Airtable credentials. Runtime integration should set
    AIRTABLE_BASE_ID, AIRTABLE_SWARM_EXECUTIONS_TABLE_ID, and AIRTABLE_API_KEY,
    then replace `log` internals with an authenticated Airtable client call.
    """

    def log(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        configured = all(
            os.getenv(name)
            for name in [
                "AIRTABLE_BASE_ID",
                "AIRTABLE_SWARM_EXECUTIONS_TABLE_ID",
                "AIRTABLE_API_KEY",
            ]
        )
        return {
            "configured": configured,
            "mode": "adapter_contract_only" if not configured else "ready_for_runtime_client",
            "target_base_env": "AIRTABLE_BASE_ID",
            "target_table_env": "AIRTABLE_SWARM_EXECUTIONS_TABLE_ID",
            "note": "No credentialed Airtable call is performed by this demo module.",
        }


ledger = Ledger()
airtable_logger = AirtableLogger()
app = FastAPI(title="CASA Swarm API", version="0.2.0")


@app.get("/swarm/health")
def swarm_health() -> Dict[str, Any]:
    return {"status": "ok", "service": "casa-swarm-api", "version": "0.2.0"}


@app.post("/swarm/evaluate", response_model=SwarmDecisionPacket)
def evaluate_swarm(request: SwarmEvaluateRequest) -> SwarmDecisionPacket:
    task_id = str(uuid.uuid4())
    created_at = _dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    supervisor = SupervisorAgent()
    builder = BuilderAgent()
    qa = QAAgent()
    governance = GovernanceAgent()

    plan = supervisor.plan(request)
    artifact = builder.build(plan)
    qa_result = qa.validate(artifact)
    gate_result = governance.classify(request, qa_result)

    ledger_entry = ledger.append(
        {
            "task_id": task_id,
            "created_at": created_at,
            "request": request.model_dump(),
            "plan": plan,
            "artifact": artifact,
            "qa": qa_result,
            "governance": gate_result,
        }
    )

    decision_summary = f"{gate_result['gate']} — {gate_result['reason']}"

    raw_packet = {
        "task_id": task_id,
        "block_name": plan["block_name"],
        "objective": plan["objective"],
        "gate": gate_result["gate"],
        "risk_score": gate_result["risk_score"],
        "qa_status": qa_result["qa_status"],
        "agents_run": ["Supervisor", "Builder", "QA", "Governance", "Ledger"],
        "decision_summary": decision_summary,
        "ledger_entry": ledger_entry,
        "rollback_defined": bool(artifact.get("rollback_path")),
        "accepted": False,
        "created_at": created_at,
        "next_gate": "User Acceptance" if gate_result["gate"] == "ALLOW" else "Human Review",
    }

    raw_packet["airtable_logging"] = airtable_logger.log(raw_packet)
    return SwarmDecisionPacket(**raw_packet)


if __name__ == "__main__":  # pragma: no cover
    sample = SwarmEvaluateRequest(task="Demonstrate governed API execution")
    result = evaluate_swarm(sample)
    print(json.dumps(result.model_dump(), indent=2))
