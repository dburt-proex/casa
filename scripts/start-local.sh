#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROL_PLANE_DIR="$ROOT_DIR/apps/control-plane"
FLAGSHIP_DIR="$ROOT_DIR/apps/flagship"

printf "\n[1/6] Entering control-plane...\n"
cd "$CONTROL_PLANE_DIR"

if [ ! -d ".venv" ]; then
  printf "[2/6] Creating virtual environment...\n"
  python3 -m venv .venv
else
  printf "[2/6] Virtual environment already exists.\n"
fi

printf "[3/6] Activating virtual environment and installing Python deps...\n"
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -r requirements-dev.txt

printf "[4/6] Seeding demo data...\n"
python demo_setup.py stable

printf "[5/6] Preparing flagship env...\n"
cd "$FLAGSHIP_DIR"
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
  cp .env.example .env.local
fi
if [ -f ".env.local" ]; then
  python3 - <<'PY'
from pathlib import Path
p = Path('.env.local')
text = p.read_text(encoding='utf-8') if p.exists() else ''
line = 'CASA_GOVERNANCE_API_URL=http://127.0.0.1:5000'
if 'CASA_GOVERNANCE_API_URL=' not in text:
    text += ('\n' if text and not text.endswith('\n') else '') + line + '\n'
    p.write_text(text, encoding='utf-8')
PY
fi
npm ci

printf "[6/6] Starting services...\n"
printf "- Governance API: http://127.0.0.1:5000\n"
printf "- Flagship UI: run in second terminal with: cd %s && npm run dev\n\n" "$FLAGSHIP_DIR"

cd "$CONTROL_PLANE_DIR"
exec .venv/bin/python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000
