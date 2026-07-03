# CASA Demo Media Capture Checklist

This file exists to close the last obvious proof gap in the public CASA artifact: committed runtime media.

## Required media set

Commit the following files under `assets/demo/`:

- `casa-console-overview.png`
- `casa-allow-review-halt.gif`
- `casa-policy-lab.png`
- `casa-audit-ledger.png`

## Capture sequence

### 1. Console overview screenshot

Goal: prove the flagship app is real and navigable.

Capture a clean screenshot showing:

- left navigation
- main dashboard shell
- `Demo Readiness`
- visible admin or operator state

Suggested file:

- `assets/demo/casa-console-overview.png`

### 2. ALLOW / REVIEW / HALT GIF

Goal: prove the core gating model in a way a buyer or hiring manager can understand in under 10 seconds.

Record a short GIF that shows:

1. `Workflow Intake`
2. click `Load ALLOW demo`
3. click `Evaluate with CASA`
4. visible result
5. click `Load REVIEW demo`
6. click `Evaluate with CASA`
7. visible result
8. click `Load HALT demo`
9. click `Evaluate with CASA`
10. visible result

Suggested file:

- `assets/demo/casa-allow-review-halt.gif`

### 3. Policy Lab screenshot

Goal: show that CASA is not only a gate, but an operational governance surface.

Capture:

- `Policy Lab`
- selected target policy
- environment selector
- visible `Simulation Results`
- disabled apply action / approval-pending state

Suggested file:

- `assets/demo/casa-policy-lab.png`

### 4. Audit Ledger screenshot

Goal: show replayability and audit posture.

Capture:

- `Audit Ledger`
- one or more visible decisions
- timestamps, reasoning, or outcome fields if available

Suggested file:

- `assets/demo/casa-audit-ledger.png`

## Recording guidance

- keep the browser width stable
- use a clean seeded demo scenario
- prefer dark-on-light clarity over cinematic styling
- trim GIF to the shortest sequence that proves the gate states
- avoid fake data that looks like production customer information

## Suggested setup

Backend:

```bash
cd apps/control-plane
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python demo_setup.py stable
python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
```

Frontend:

```bash
cd apps/flagship
npm ci
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Set:

```text
CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000
```

## Done criteria

The public repo should let a new visitor see, within one minute:

- what CASA is
- what ALLOW / REVIEW / HALT means
- that a real interface exists
- that governance and audit are implemented, not merely described
