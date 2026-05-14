from typing import Any, Dict, List


def _label(value: Any) -> str:
    return str(value).replace("_", " ").replace("-", " ")


def collect_risk_factors(risk: str, signals: Dict[str, Any] | None) -> List[str]:
    signals = signals or {}
    factors = [f"Risk classified as {risk}"]

    data_exposure = signals.get("data_exposure")
    if data_exposure:
        factors.append(f"Data exposure is {_label(data_exposure)}")

    if signals.get("customer_facing") is True:
        factors.append("Workflow is customer-facing")

    reversibility = signals.get("reversibility")
    if reversibility:
        factors.append(f"Reversibility is {_label(reversibility)}")

    confidence = signals.get("confidence")
    if isinstance(confidence, (int, float)):
        if confidence < 0.75:
            factors.append(f"Model confidence is {confidence:.2f}, below the preferred demo threshold")
        else:
            factors.append(f"Model confidence is {confidence:.2f}")

    risk_score = signals.get("risk_score")
    if isinstance(risk_score, (int, float)):
        factors.append(f"Signal risk score is {risk_score:.2f}")

    if signals.get("sensitive"):
        factors.append("Sensitive data signal raised risk")
    if signals.get("external"):
        factors.append("External exposure signal raised risk")
    if signals.get("system_critical"):
        factors.append("System-critical signal forced critical risk")

    return factors


def explain_gate_decision(
    agent: str,
    action: str,
    risk: str,
    policy_result: str,
    decision: str,
    signals: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Build the deterministic explanation for a CASA gate decision."""
    if policy_result == "FORBIDDEN":
        reason_code = "POLICY_FORBIDDEN"
        reason = (
            f"CASA halted this action because policy does not permit agent "
            f"'{agent}' to run '{action}', or the action is explicitly forbidden."
        )
        next_step = "Do not execute. Route to an administrator to adjust policy or redesign the workflow."
    elif risk == "CRITICAL":
        reason_code = "RISK_CRITICAL"
        reason = "CASA halted this action because it was classified as CRITICAL risk."
        next_step = "Do not execute automatically. Require an explicit human approval path."
    elif risk == "HIGH":
        reason_code = "RISK_HIGH_REVIEW"
        reason = "CASA routed this action to REVIEW because high-risk actions require human review."
        next_step = "Send to the review gate before execution."
    elif policy_result == "REVIEW":
        reason_code = "POLICY_REVIEW"
        reason = "CASA routed this action to REVIEW because the active policy marks it as review-required."
        next_step = "Send to the review gate before execution."
    else:
        reason_code = "POLICY_ALLOW"
        reason = "CASA allowed this action because policy permits it and the risk level does not require review or halt."
        next_step = "Execution can proceed and the decision evidence should remain in the ledger."

    return {
        "reason": reason,
        "reason_code": reason_code,
        "policy_result": policy_result,
        "risk_factors": collect_risk_factors(risk, signals),
        "signals_used": signals or {},
        "recommended_next_step": next_step,
    }
