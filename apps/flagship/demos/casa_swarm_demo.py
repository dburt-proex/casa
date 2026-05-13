import uuid
import datetime

# --- AGENTS ---

def supervisor(task):
    return {
        "block_name": "CASA Swarm Runner Core Loop",
        "objective": task,
        "plan": ["build", "qa", "governance"]
    }


def builder(plan):
    return {
        "output": f"Built artifact for: {plan['objective']}"
    }


def qa(output):
    if "Built" in output["output"]:
        return {"qa_status": "PASS"}
    return {"qa_status": "FAIL"}


def governance(qa_result):
    if qa_result["qa_status"] == "PASS":
        return {"gate": "ALLOW", "risk_score": 0.1}
    return {"gate": "REVIEW", "risk_score": 0.6}


# --- LEDGER ---
ledger = []


def write_ledger(entry):
    ledger.append(entry)


# --- RUNNER ---

def run(task):
    task_id = str(uuid.uuid4())

    sup = supervisor(task)
    built = builder(sup)
    qa_result = qa(built)
    gov = governance(qa_result)

    entry = {
        "task_id": task_id,
        "timestamp": str(datetime.datetime.utcnow()),
        "task": task,
        "qa": qa_result,
        "governance": gov
    }

    write_ledger(entry)

    decision_packet = {
        "task_id": task_id,
        "block_name": sup["block_name"],
        "gate": gov["gate"],
        "risk_score": gov["risk_score"],
        "agents_run": ["Supervisor", "Builder", "QA", "Governance"],
        "qa_status": qa_result["qa_status"],
        "ledger_entry": entry,
        "next_gate": "User Acceptance"
    }

    return decision_packet


# --- DEMO EXECUTION ---
if __name__ == "__main__":
    task = "Demonstrate CASA swarm execution"
    result = run(task)
    import json
    print(json.dumps(result, indent=2))
