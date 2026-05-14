import datetime
import json
from pathlib import Path
import uuid

from config import LEDGER_FILE
from casa.storage import append_decision, postgres_enabled


def log_event(
    agent,
    action,
    risk,
    decision,
    signals=None,
    policy_version=None,
    policy_result=None,
    reason=None,
    reason_code=None,
    risk_factors=None,
    recommended_next_step=None,
):
    """Log governance decision with optional signals and policy tracking."""
    entry = {
        "decision_id": str(uuid.uuid4()),
        "time": datetime.datetime.utcnow().isoformat(),
        "agent": agent,
        "action": action,
        "risk": risk,
        "decision": decision,
        "signals": signals or {},
        "policy_version": policy_version or "unknown"
    }
    if policy_result is not None:
        entry["policy_result"] = policy_result
    if reason is not None:
        entry["reason"] = reason
    if reason_code is not None:
        entry["reason_code"] = reason_code
    if risk_factors is not None:
        entry["risk_factors"] = risk_factors
    if recommended_next_step is not None:
        entry["recommended_next_step"] = recommended_next_step

    if postgres_enabled():
        append_decision(entry)
        return entry

    ledger_path = Path(LEDGER_FILE)
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with open(ledger_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


record_decision = log_event
