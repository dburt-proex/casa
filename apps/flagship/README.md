# CASA-Flagship

CASA-Flagship is the operator-facing console for CASA.

It provides a web UI and server orchestration layer for:

- live workflow evaluation
- ALLOW / REVIEW / HALT gate visibility
- governance dashboard visibility
- boundary stress analysis
- policy dry-run simulation
- decision replay
- review queue workflows
- operator tooling and future admin workflows

This app is the frontend and server integration layer in the canonical `dburt-proex/casa` monorepo. It connects to the CASA governance backend in `apps/control-plane`:

```txt
Backend: apps/control-plane
Runtime: Python
Start: uvicorn governance_api:app --host 0.0.0.0 --port $PORT
Health: /health
```

Current build is intended for design partner evaluation and controlled prototype demonstration. Auth middleware is in active development. Not production-certified, enterprise-secure, or compliance-ready unless separately verified and documented.

---

## Architecture

### This app: `apps/flagship`

Responsible for:

- frontend UI
- server-side orchestration
- backend bridge calls
- environment-based governance API wiring
- operator-facing workflow intake
- dashboard, replay, review, and policy surfaces
- future auth, audit, and session integrations

### Backend app: `apps/control-plane`

Responsible for:

- deterministic governance evaluation
- ALLOW / REVIEW / HALT routing
- policy loading and dry-run simulation
- audit ledger reads and writes
- decision replay
- boundary stress analysis
- governance dashboard data
- review queue endpoints

---

## Required Backend Contract

CASA-Flagship expects the CASA governance backend to expose:

```txt
GET  /health
POST /evaluate
GET  /ledger
GET  /policy
GET  /dashboard
GET  /dashboard/text
GET  /boundary-stress
POST /policy/dryrun
GET  /decision-replay/{decision_id}
GET  /decisions/flagged
POST /decisions/{decision_id}/review
```

The canonical backend repository already contains these routes in `governance_api.py`.

---

## Environment Variables

Create a local `.env.local` file or configure these in your deployment platform. Clerk's React Vite setup uses `VITE_CLERK_PUBLISHABLE_KEY`; see https://clerk.com/docs/react/getting-started/quickstart.

Required:

```env
CASA_GOVERNANCE_API_URL=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ENABLE_DEV_LOGIN=false
JWT_SECRET=
DATABASE_URL=
```

Optional:

```env
GEMINI_API_KEY=
GEMINI_CASA_API=
REDIS_URL=
```

Notes:

- `CASA_GOVERNANCE_API_URL` is the primary backend URL for the canonical CASA governance API.
- `BACKEND_API_URL` is retained only as a compatibility fallback for existing bridge code.
- Clerk keys enable production authentication.
- `JWT_SECRET` should be a long random secret outside local development.
- `DATABASE_URL` enables durable Postgres audit logging.
- `REDIS_URL` is optional unless session storage is configured.

---

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local`:

```env
CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000
VITE_CLERK_PUBLISHABLE_KEY=
ENABLE_DEV_LOGIN=true
JWT_SECRET=
```

3. Run the CASA governance backend separately:

```bash
cd ../control-plane
pip install -r requirements.txt
uvicorn governance_api:app --host 127.0.0.1 --port 5000
```

4. Start CASA-Flagship:

```bash
npm run dev
```

5. Verify backend reachability:

```bash
curl http://127.0.0.1:5000/health
curl http://127.0.0.1:5000/policy
curl http://127.0.0.1:5000/ledger
curl http://127.0.0.1:5000/dashboard
```

---

## Deployment Notes

Deploy CASA-Flagship as the operator console.

Set these runtime variables:

```env
CASA_GOVERNANCE_API_URL=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ENABLE_DEV_LOGIN=false
JWT_SECRET=
DATABASE_URL=
```

Deploy from the canonical monorepo root `render.yaml` so Render provisions Flagship, the governance API, and Postgres together.

---

## Primary Features

### Workflow Intake

Submits a proposed AI workflow action to `/evaluate` and renders the CASA gate result.

Expected result fields include:

```txt
agent
action
risk
decision
```

### Dashboard

Loads governance metrics from `/dashboard`.

Expected normalized UI fields:

```txt
activePolicies
decisions24h
boundaryAlerts
systemStatus
```

### Boundary Stress

Loads policy boundary stress data from `/boundary-stress`.

Expected normalized UI fields:

```txt
stressLevel
criticalBoundaries
recommendations
```

### Policy Dry-Run

Sends a policy simulation request to `/policy/dryrun`.

Expected normalized UI fields:

```txt
status
simulatedOutcome
impactScore
logs
```

### Decision Replay

Fetches a previous decision context from `/decision-replay/{decision_id}`.

Expected normalized UI fields:

```txt
decisionId
timestamp
originalOutcome
policyApplied
context
```

---

## Troubleshooting

### Dashboard shows fetch error

Likely causes:

- `CASA_GOVERNANCE_API_URL` is missing or wrong
- deployed app was not restarted after env var changes
- backend service is asleep or unavailable
- route contract mismatch between Flagship and `casa-control-plane`

### Backend URL is wrong

Current expected backend URL:

```env
CASA_GOVERNANCE_API_URL=https://casa-control-plane.onrender.com
```

### Render backend health check

Use:

```txt
/health
```

---

## Recommended Near-Term Next Steps

- deploy or redeploy `dburt-proex/casa-control-plane`
- set `CASA_GOVERNANCE_API_URL` in CASA-Flagship
- run ALLOW / REVIEW / HALT verification through `/evaluate`
- confirm each successful decision appears in `/ledger`
- verify dashboard values are real backend data
- keep claims bounded to controlled prototype and design partner evaluation

---

## Repositories

```txt
Operator console: dburt-proex/CASA-Flagship
Governance backend: dburt-proex/casa-control-plane
```

## Status

Current status: active integration and stabilization between CASA-Flagship and the canonical CASA governance backend.
