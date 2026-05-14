from casa.decision_reasoning import explain_gate_decision


def test_forbidden_policy_reason_halts():
    result = explain_gate_decision("agent-x", "write_database", "HIGH", "FORBIDDEN", "HALT", {})

    assert result["reason_code"] == "POLICY_FORBIDDEN"
    assert result["policy_result"] == "FORBIDDEN"
    assert "halted" in result["reason"].lower()


def test_critical_risk_reason_halts():
    result = explain_gate_decision("admin_agent", "delete_database", "CRITICAL", "ALLOW", "HALT", {})

    assert result["reason_code"] == "RISK_CRITICAL"
    assert result["recommended_next_step"].startswith("Do not execute")


def test_high_risk_reason_reviews():
    result = explain_gate_decision("agent_01", "write_database", "HIGH", "ALLOW", "REVIEW", {})

    assert result["reason_code"] == "RISK_HIGH_REVIEW"
    assert "review" in result["reason"].lower()


def test_policy_review_reason_reviews():
    result = explain_gate_decision("demo-agent", "send customer-facing email", "MEDIUM", "REVIEW", "REVIEW", {})

    assert result["reason_code"] == "POLICY_REVIEW"
    assert "policy" in result["reason"].lower()


def test_allow_reason_allows_and_includes_signals():
    signals = {
        "risk_score": 0.35,
        "confidence": 0.9,
        "data_exposure": "internal",
        "customer_facing": False,
        "reversibility": "reversible",
    }
    result = explain_gate_decision("analytics_agent", "read_database", "LOW", "ALLOW", "ALLOW", signals)

    assert result["reason_code"] == "POLICY_ALLOW"
    assert result["signals_used"] == signals
    assert "Data exposure is internal" in result["risk_factors"]
