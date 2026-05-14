# CASA Monorepo

This repository combines the CASA operator console and governance backend while keeping them as separate deployable apps.

## Layout

```txt
apps/
  flagship/       # Vite + Express operator console
  control-plane/  # FastAPI governance API and optional Streamlit dashboard
```

The browser talks to the Flagship server. The Flagship server calls the governance API through `CASA_GOVERNANCE_API_URL`. This keeps secrets and privileged backend calls server-side while removing the operational friction of two separate repositories.

## Local Development

Run the backend:

```bash
cd apps/control-plane
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements-dev.txt
python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
```

Run the Flagship app in another terminal:

```bash
cd apps/flagship
npm ci
copy .env.example .env.local
npm run dev
```

Set `CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000` in `apps/flagship/.env.local`. For Clerk local auth, set `VITE_CLERK_PUBLISHABLE_KEY` from the Clerk React quickstart: https://clerk.com/docs/react/getting-started/quickstart.

## Render Deployment

The root `render.yaml` defines both services with Render `rootDir` settings:

- `casa-governance-api` builds from `apps/control-plane`
- `casa-flagship` builds from `apps/flagship`
- `casa-postgres` stores governance decisions and Flagship audit events

Render injects the governance API private `host:port` into Flagship through `CASA_GOVERNANCE_API_URL`; the Flagship server normalizes it to `http://...` before calling the backend. Render also injects the internal Postgres `DATABASE_URL` into both services and generates `JWT_SECRET` for local-token fallback paths.

`ENABLE_DEV_LOGIN` is set to `false` in the Blueprint. Configure these Render environment variables during the first Blueprint sync:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CORS_ORIGINS` with the final Flagship URL after Render assigns it

The Postgres database uses an empty `ipAllowList`, so it is reachable over Render private networking only.

## Auth

Flagship uses Clerk when `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are configured. Clerk metadata drives CASA roles:

- `publicMetadata.role = "operator"` for normal operators
- `publicMetadata.role = "admin"` or `privateMetadata.role = "admin"` for admin policy changes

The `/api/auth/dev-login` endpoint is only for local development and only works when `ENABLE_DEV_LOGIN=true`.

## Ledger Storage

The governance API writes ledger decisions to Postgres when `DATABASE_URL` is configured. If `DATABASE_URL` is missing, it falls back to the local JSONL ledger file for development and tests.

To migrate an existing local ledger into Postgres:

```bash
cd apps/control-plane
python scripts/migrate_ledger.py
```

## Verification

```bash
cd apps/control-plane
python -m pytest
```

```bash
cd apps/flagship
npm run lint
npm test
npm run build
```
