print("Evaluator loaded")
from casa.risk_engine import classify_risk
from casa.policy_loader import check_policy
from casa.gate_engine import gate_decision
from casa.router import route
from casa.ledger import log_event


def evaluate_action(agent, action):

    print(f"\n[CASA] Evaluating action: {action}")

    # Step 1: Risk classification
    risk = classify_risk(action)
    print("Risk level:", risk)

    # Step 2: Policy evaluation
    policy = check_policy(agent, action)
    print("Policy result:", policy)

    # Step 3: Governance gate decision
    decision = gate_decision(policy, risk)
    print("Gate decision:", decision)

    # Step 4: Log event to ledger
    log_event(agent, action, risk, decision)

    # Step 5: Route execution
    route(decision, action)

    return decision

