# AGENTS.md — Codex Operating Contract

This file is the mandatory operating contract for Codex and supervised AI agents working in the CASA Flagship repository.

---

## Project Context

This repository is part of the CASA / PromptBP build system.

CASA is a governed control-plane architecture for AI-assisted execution. The project prioritizes deterministic behavior, auditable decisions, bounded implementation, and demo-ready proof over speculative feature expansion.

PromptBP is the instruction-control framework used to structure build prompts, reduce drift, and improve execution reliability.

CASA Flagship is the operator-facing application layer. Changes here must preserve frontend/backend contract integrity with the CASA control plane.

---

## Codex Authority

Codex may:
- Inspect repository structure.
- Read relevant files.
- Propose implementation plans.
- Edit files only when explicitly scoped.
- Run tests, linters, and build commands.
- Create branches and pull request summaries.
- Produce documentation for completed work.

Codex may not:
- Merge pull requests.
- Deploy to production.
- Delete files without explicit instruction.
- Modify secrets, tokens, credentials, or environment variables.
- Change production configuration unless explicitly scoped.
- Remove routes, tests, or middleware without verifying dependencies.
- Rewrite architecture without review.
- Invent test results.
- Claim success without validation evidence.

---

## Required Workflow

For every task:

1. Restate the objective.
2. Identify the scoped files or directories.
3. Inspect before editing.
4. Make the smallest viable change.
5. Run relevant validation.
6. Report changed files.
7. Report tests and results.
8. Identify risks.
9. Provide rollback instructions.
10. Recommend the next bounded block.

---

## Gate Policy

Use CASA-style gate classification for all work.

ALLOW:
- Documentation updates.
- Read-only audits.
- Small low-risk fixes.
- Formatting changes.
- Non-functional cleanup.

REVIEW:
- API route changes.
- Frontend/backend contract changes.
- Auth, permissions, or session logic.
- Test rewrites.
- Dependency changes.
- Deployment config changes.
- UI changes that alter buyer-facing demo behavior.

HALT:
- Secrets or credentials.
- Production deploys.
- Destructive file deletion.
- Irreversible migrations.
- Security-sensitive changes without explicit authorization.
- Any change Codex cannot validate.

---

## Block-Boundary Execution

Never perform broad “fix everything” work.

Every implementation must define:

- Block name
- Scope
- Included files
- Excluded files
- Acceptance criteria
- Tests to run
- Rollback path
- Gate classification

---

## PR Output Standard

Every PR or proposed change must include:

- Summary
- Scope
- Explicit non-scope
- Files changed
- Tests run
- Test results
- CASA gate classification
- Risk notes
- Rollback plan
- Recommended next block

---

## Repository Priorities

Prioritize in this order:

1. Stable demo path.
2. Backend/frontend contract alignment.
3. Ledger and audit visibility.
4. Operator-console usability.
5. Test coverage.
6. Clear documentation.
7. Monetizable proof artifact.

Avoid adding infrastructure before validating demo usefulness, buyer clarity, or revenue path.

---

## CASA Flagship Specific Constraints

Codex must preserve:

1. Existing route behavior unless explicitly scoped.
2. Backend bridge compatibility.
3. Clear failure states for unavailable API endpoints.
4. Demo readability over UI novelty.
5. Operator-facing language that explains gate decisions, risks, and audit traces.

Codex must not remove frontend calls to backend endpoints without first identifying every dependent component.

---

## Default Constraint

When uncertain, stop and classify the issue as REVIEW instead of guessing.
