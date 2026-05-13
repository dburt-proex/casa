# CASA Swarm Demo — Block 1

## Block Name

CASA Swarm Runner Core Loop

## Objective

Create a minimal, reviewable demonstration of supervised agent delegation controlled by CASA-style governance gates.

The demo proves this loop:

```text
User Request
→ Supervisor Agent
→ Builder Agent
→ QA Agent
→ Governance Gate
→ Ledger Entry
→ Final Decision Packet
```

## Scope Included

- Supervised agent swarm model
- Deterministic agent role definitions
- CASA gate classification using ALLOW / REVIEW / HALT
- In-memory audit ledger
- Markdown-friendly execution record
- Airtable/Notion-friendly field schema
- Runnable Python demo module

## Scope Excluded

- Production auth
- External LLM calls
- GitHub mutation actions
- Deployment
- Persistent database writes
- Payment logic
- Client data handling
- Autonomous multi-agent loops

## Changed Files

| File | Purpose |
|---|---|
| `demos/casa_swarm_demo.py` | Runnable Block 1 demo module |
| `docs/casa-swarm-demo-block-1.md` | Markdown documentation and operating record |
| `docs/casa-swarm-airtable-schema.md` | Notion/Airtable crossover schema |

## Dependencies

No external dependencies.

Runtime:

```text
Python 3.10+
```

## Acceptance Criteria

Block 1 passes when:

- A task can be passed into the swarm runner
- Supervisor creates a block plan
- Builder returns an implementation stub
- QA validates against acceptance criteria
- Governance classifies the result as ALLOW, REVIEW, or HALT
- Ledger records the execution packet
- Final output contains a decision packet suitable for Markdown, Notion, or Airtable capture

## Risk Notes

| Risk | Mitigation |
|---|---|
| Swarm overengineering | Use deterministic functions, not external agent frameworks |
| Autonomous drift | Supervisor owns scope and sequencing |
| Uncontrolled actions | Governance gate blocks high-risk execution |
| Poor auditability | Every run writes a ledger entry |
| Weak crossover documentation | Provide Airtable-friendly schema separately |

## Rollback Path

Delete the following additive files:

```text
demos/casa_swarm_demo.py
docs/casa-swarm-demo-block-1.md
docs/casa-swarm-airtable-schema.md
```

No existing application code is modified in Block 1.

## CASA Gate

Initial block classification: `ALLOW`

Reason:

- Additive demo only
- No production state mutation
- No credentials
- No external calls
- No deployment impact

## Agent Model

| Agent | Role | Authority |
|---|---|---|
| Supervisor | Defines block scope and coordinates flow | Can plan and delegate |
| Builder | Produces implementation output | Cannot mutate external systems |
| QA | Validates acceptance criteria | Can pass/fail output |
| Governance | Classifies risk and gate state | Can ALLOW / REVIEW / HALT |
| Ledger | Records execution packet | Append-only in demo memory |

## Demo Command

```bash
python demos/casa_swarm_demo.py
```

## Expected Output

The script prints a JSON decision packet containing:

- `task_id`
- `block_name`
- `gate`
- `risk_score`
- `agents_run`
- `qa_status`
- `ledger_entry`
- `next_gate`

## Notion Copy

### CASA Swarm Demo — Block 1

**Status:** Draft / Demo Ready  
**Gate:** ALLOW  
**Block Type:** Vertical slice / governance demo  
**Owner:** CASA Operator  
**System:** CASA-Flagship  

**Objective:** Demonstrate supervised agent delegation controlled by CASA gating and recorded in an audit ledger.

**Execution Flow:** User Request → Supervisor → Builder → QA → Governance Gate → Ledger → Decision Packet

**Acceptance:** The demo passes if a task produces a complete governed execution packet with a readable ledger entry.

**Next Block:** Block 2 should connect this runner to a visible UI/API surface or persistent ledger, depending on demo priority.
