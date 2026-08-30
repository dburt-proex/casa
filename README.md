# CASA

**Portfolio evidence:** [Systems & proof](https://drew-burt-portfolio.daxxer-os.chatgpt.site/systems) · [Governance Lab](https://drew-burt-portfolio.daxxer-os.chatgpt.site/lab)

## Control Awareness System Architecture

Deterministic execution governance for AI systems.

CASA is a governance control plane that sits between AI reasoning and real-world execution. Instead of letting agents, copilots, or workflows act directly, CASA evaluates each proposed action and routes it into a closed decision set:

- **ALLOW** — safe to execute automatically
- **REVIEW** — requires human approval
- **HALT** — blocked by policy or safety boundary

CASA is built for teams that need bounded autonomy, replayable decisions, and auditable execution control.

---

## Why CASA Exists

Most AI systems still follow the unsafe default pattern:

```text
User / Trigger
  ↓
LLM / Agent
  ↓
Tool Call / External Action
```

That works for demos. It breaks down in production.

CASA inserts an explicit control boundary before execution so that:

- actions are evaluated before they run
- high-risk operations cannot bypass governance
- the same inputs produce the same gate outcome
- every decision leaves a replayable audit record

---

## Core Thesis

Autonomy becomes deployable when execution authority is structurally bounded.

CASA governs execution, not model cognition. It does **not** claim perfect reasoning, legal correctness, or universal safety. It enforces explicit boundaries around what an AI system is allowed to do.

---

## System Placement

```text
Human Authority
  ↓
Policy Definition
  ↓
AI Reasoning System
  ↓
CASA Control Plane
  ↓
Execution Router
  ↓
External Tools / APIs / State Changes
  ↓
Immutable Audit Ledger
```

Reasoning systems never execute directly. All execution passes through CASA.

---

## What CASA Guarantees

CASA is designed to guarantee:

- explicit execution boundaries
- deterministic routing
- replayable decision records
- version-bound governance
- machine-detectable violations
- Tier 3 / hard-violation actions always halt

CASA does **not** guarantee:

- correctness of the underlying model
- perfect safety in all contexts
- automatic legal compliance
- policy quality by default

---

## Decision Model

CASA routes proposed actions into a closed state set:

- **ALLOW** — low-risk action may execute
- **REVIEW** — human approval required
- **HALT** — action blocked

Minimal routing logic:

```python
if hard_violation:
    return "HALT"
if tier == 3:
    return "HALT"
if risk_score >= review_threshold:
    return "REVIEW"
if confidence < min_confidence:
    return "REVIEW"
return "ALLOW"
```

---

## Quick Start

Run the governance API locally:

```bash
git clone https://github.com/dburt-proex/casa.git
cd casa/apps/control-plane
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python demo_setup.py stable
python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
```

Open a second terminal if you want the operator console:

```bash
cd apps/flagship
npm ci
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Set `CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000` in `apps/flagship/.env.local`.

### Verify the demo

Health check:

```bash
curl http://127.0.0.1:5000/health
```

Evaluate a governance decision:

```bash
curl -X POST http://127.0.0.1:5000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "trading_system",
    "action": "place_trade",
    "signals": {"order_size": 500000, "sector": "tech"}
  }'
```

Explore observability:

```bash
curl http://127.0.0.1:5000/dashboard | python -m json.tool
curl http://127.0.0.1:5000/boundary-stress | python -m json.tool
curl http://127.0.0.1:5000/decision-replay/all | python -m json.tool
```

---

## Demo Proof

The current flagship experience includes explicit demo-ready controls and verification points:

- health endpoints for both the governance API and flagship app
- visible **Load ALLOW demo** / **Load REVIEW demo** / **Load HALT demo** controls
- read-only operator posture for restricted workflows
- admin workflow intake, policy simulation, and governance sprint flows

### Demo Media

> Media slot prepared. Actual runtime captures still need to be committed.

- `assets/demo/casa-console-overview.png`
- `assets/demo/casa-allow-review-halt.gif`
- `assets/demo/casa-policy-lab.png`
- `assets/demo/casa-audit-ledger.png`

Capture checklist: [`docs/DEMO_MEDIA_CAPTURE.md`](docs/DEMO_MEDIA_CAPTURE.md)

---

## Architectural Layers

### 1. Policy Control Layer
Defines execution boundaries, policy version, invariants, tier rules, and thresholds.

### 2. Signal Instrumentation Layer
Extracts measurable governance signals from a proposed action, including tool risk, permission risk, data exposure risk, context volatility, and evidence completeness.

### 3. Risk & Confidence Engine
Aggregates signals into deterministic routing variables such as `risk_score`, `confidence`, and `hard_violation`.

### 4. Deterministic Gate Engine
Routes each action into the closed state set: ALLOW, REVIEW, or HALT.

### 5. Execution Router
Enforces the gate outcome. Execution is impossible without gate authorization.

### 6. Immutable Audit Ledger
Records each decision with policy version, signals snapshot, risk score, confidence, gate outcome, execution result, and prior hash linkage.

### 7. Safety State Machine
Transitions between NORMAL, DEGRADED, and SAFE_MODE. SAFE_MODE prohibits irreversible actions and escalates review requirements.

---

## Threat Model

CASA is engineered around structural governance failures, not abstract AI ethics.

Primary threat classes covered in the current specification include:

- execution without gate
- invariant drift
- boundary reclassification
- evidence suppression
- non-deterministic routing
- ledger corruption
- context saturation decay

See:

- [`apps/control-plane/THREAT_MODEL.md`](apps/control-plane/THREAT_MODEL.md)
- [`apps/control-plane/ARCHITECTURE.md`](apps/control-plane/ARCHITECTURE.md)

---

## Built Proof Inside This Repo

### Governance and audit

- FastAPI governance API
- deterministic gate engine
- append-only ledger and audit trail
- decision replay endpoints
- policy dry-run simulator
- boundary stress and drift instrumentation

### Operator experience

- flagship operator console
- admin and operator postures
- demo readiness workflows
- review gate and governance sprint flows

### Validation

Run backend tests:

```bash
cd apps/control-plane
python -m pytest
```

Run flagship checks:

```bash
cd apps/flagship
npm run lint
npm test
npm run build
```

---

## Repository Layout

```text
apps/
  flagship/       # operator console
  control-plane/  # FastAPI governance API, docs, and demo setup
```

If you only want the governance engine and formal specifications, start in `apps/control-plane/`.

---

## Best Entry Points

- buyer / hiring-manager overview: `README.md`
- formal architecture spec: `apps/control-plane/ARCHITECTURE.md`
- formal threat model: `apps/control-plane/THREAT_MODEL.md`
- local governance demo: `apps/control-plane/demo_setup.py`
- flagship smoke validation: `apps/flagship/tests/smoke/app.smoke.spec.ts`

---

## Current Status

Active development.

The codebase already contains the core proof for deterministic governance, demo scenarios, operator flows, and formal architecture. The main remaining public-proof gap is committed runtime media showing the console and ALLOW / REVIEW / HALT flow in action.
