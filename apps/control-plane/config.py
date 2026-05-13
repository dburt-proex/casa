from pathlib import Path


APP_ROOT = Path(__file__).resolve().parent
POLICY_FILE = str(APP_ROOT / "policy.json")
LEDGER_FILE = str(APP_ROOT / "ledger.log")

RISK_MATRIX = {
    "read_database": "LOW",
    "send_email": "LOW",
    "write_database": "HIGH",
    "delete_database": "CRITICAL",
    "summarize public support ticket": "LOW",
    "send customer-facing email": "HIGH",
    "delete customer records": "CRITICAL"
}
