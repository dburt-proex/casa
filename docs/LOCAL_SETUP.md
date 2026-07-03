# Local Setup

This guide is the fastest reliable way to run CASA on a local machine.

## Before you start

You must run the helper scripts **from the cloned repo root**, not from `C:\Windows\System32`.

Example:

```powershell
cd C:\path\to\casa
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

If you are not sure where the repo is, find it first and then `cd` into that folder.

## What runs locally

CASA has two primary local components:

- `apps/control-plane` — FastAPI governance API
- `apps/flagship` — operator console / flagship UI

Run them in separate terminals.

---

## Option A — fastest path with helper scripts

### macOS / Linux

```bash
cd /path/to/casa
bash scripts/start-local.sh
```

Then open a second terminal:

```bash
cd apps/flagship
npm run dev
```

### Windows PowerShell

```powershell
cd C:\path\to\casa
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Then open a second PowerShell window:

```powershell
cd apps\flagship
npm run dev
```

---

## Option B — manual setup

### 1. Start the governance API

```bash
cd apps/control-plane
python -m venv .venv
```

Activate it:

```bash
# macOS / Linux
. .venv/bin/activate

# Windows
.venv\Scripts\activate
```

Install dependencies and seed demo data:

```bash
pip install -r requirements-dev.txt
python demo_setup.py stable
python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
```

### 2. Start the flagship UI

In a second terminal:

```bash
cd apps/flagship
npm ci
cp .env.example .env.local  # Windows: copy .env.example .env.local
```

Add this line to `.env.local` if it is missing:

```text
CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000
```

Start the UI:

```bash
npm run dev
```

---

## What to verify

### Governance API

```bash
curl http://127.0.0.1:5000/health
```

### Flagship UI

Confirm the UI exposes:

- `Demo Readiness`
- `Load ALLOW demo`
- `Load REVIEW demo`
- `Load HALT demo`

---

## Useful checks

### Backend tests

```bash
cd apps/control-plane
python -m pytest
```

### Frontend checks

```bash
cd apps/flagship
npm run lint
npm test
npm run build
```

---

## Common friction points

### Script path does not exist

You are probably not in the repo root. Run:

```powershell
pwd
```

If the current folder is not the cloned `casa` directory, `cd` into it and retry.

### Python command mismatch

If `python` fails, try `python3` on macOS/Linux.

### PowerShell execution policy

If script execution is blocked, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

### Clerk/auth setup

Some local flows may expect Clerk keys for the full auth path. Start by verifying the governance API and demo-ready UI shell first.

### Missing Node dependencies

If `npm ci` fails, verify Node and npm are installed and retry from `apps/flagship`.
