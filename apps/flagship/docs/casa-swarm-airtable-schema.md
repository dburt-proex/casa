# CASA Swarm — Airtable / Notion Schema

## Table: Swarm Executions

| Field Name | Type | Description |
|---|---|---|
| task_id | Single line text | Unique execution ID |
| block_name | Single line text | Name of block executed |
| objective | Long text | Task objective |
| gate | Single select | ALLOW / REVIEW / HALT |
| risk_score | Number | Computed risk score (0–1) |
| qa_status | Single select | PASS / FAIL |
| agents_run | Multiple select | Supervisor, Builder, QA, Governance |
| decision_summary | Long text | Final output summary |
| ledger_entry | Long text | Full execution log |
| rollback_defined | Checkbox | Whether rollback path exists |
| accepted | Checkbox | User acceptance |
| created_at | Date | Execution timestamp |

## Table: Blocks

| Field Name | Type |
|---|---|
| block_name | Single line text |
| objective | Long text |
| scope_included | Long text |
| scope_excluded | Long text |
| dependencies | Long text |
| acceptance_criteria | Long text |
| risk_notes | Long text |
| rollback_path | Long text |
| gate_classification | Single select |
| status | Single select |

## Notes

- This schema is designed for both Airtable and Notion database compatibility.
- All fields map cleanly to JSON for export or ingestion.
- Can be extended later with:
  - execution duration
  - agent cost tracking
  - model usage
  - production flags
