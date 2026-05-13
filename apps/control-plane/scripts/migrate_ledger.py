"""Migrate local JSONL ledger entries into Postgres.

Run this after setting DATABASE_URL:
    python scripts/migrate_ledger.py
"""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import LEDGER_FILE
from casa.storage import migrate_file_entries, postgres_enabled


def read_jsonl(path: Path):
    entries = []
    if not path.exists():
        return entries

    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Invalid JSON on line {line_number}: {exc}") from exc
    return entries


def main():
    if not postgres_enabled():
        raise SystemExit("DATABASE_URL is required before running the migration.")

    entries = read_jsonl(Path(LEDGER_FILE))
    migrated = migrate_file_entries(entries)
    print(f"Migrated {migrated} ledger entries.")


if __name__ == "__main__":
    main()
