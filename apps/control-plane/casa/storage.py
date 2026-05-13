import json
import os
from contextlib import contextmanager
from typing import Any, Dict, List

import psycopg
from psycopg.rows import dict_row


def postgres_enabled() -> bool:
    return bool(os.getenv("DATABASE_URL", "").strip())


@contextmanager
def connect():
    database_url = os.getenv("DATABASE_URL", "").strip()
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        yield connection


def ensure_schema() -> None:
    if not postgres_enabled():
        return

    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS governance_decisions (
                    id BIGSERIAL PRIMARY KEY,
                    decision_id TEXT UNIQUE,
                    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    agent TEXT NOT NULL,
                    action TEXT NOT NULL,
                    risk TEXT,
                    decision TEXT NOT NULL,
                    signals JSONB NOT NULL DEFAULT '{}'::jsonb,
                    policy_version TEXT NOT NULL DEFAULT 'unknown',
                    hash TEXT,
                    previous_hash TEXT,
                    payload JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS governance_decisions_decision_idx ON governance_decisions(decision)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS governance_decisions_agent_idx ON governance_decisions(agent)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS governance_decisions_time_idx ON governance_decisions(occurred_at)"
            )
        connection.commit()


def _normalize_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(entry)
    if "time" not in normalized and normalized.get("timestamp"):
        normalized["time"] = normalized["timestamp"]
    if "timestamp" not in normalized and normalized.get("time"):
        normalized["timestamp"] = normalized["time"]
    normalized.setdefault("signals", {})
    normalized.setdefault("policy_version", "unknown")
    return normalized


def append_decision(entry: Dict[str, Any]) -> Dict[str, Any]:
    ensure_schema()
    normalized = _normalize_entry(entry)
    occurred_at = normalized.get("time") or normalized.get("timestamp")

    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO governance_decisions (
                    decision_id, occurred_at, agent, action, risk, decision,
                    signals, policy_version, hash, previous_hash, payload
                ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s::jsonb)
                ON CONFLICT (decision_id) DO NOTHING
                """,
                (
                    normalized.get("decision_id"),
                    occurred_at,
                    normalized.get("agent"),
                    normalized.get("action"),
                    normalized.get("risk"),
                    normalized.get("decision"),
                    json.dumps(normalized.get("signals", {})),
                    normalized.get("policy_version", "unknown"),
                    normalized.get("hash"),
                    normalized.get("previous_hash"),
                    json.dumps(normalized),
                ),
            )
        connection.commit()

    return normalized


def read_decisions() -> List[Dict[str, Any]]:
    ensure_schema()
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT payload
                FROM governance_decisions
                ORDER BY id ASC
                """
            )
            rows = cursor.fetchall()

    return [_normalize_entry(dict(row["payload"])) for row in rows]


def last_hash() -> str:
    ensure_schema()
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT hash
                FROM governance_decisions
                WHERE hash IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
                """
            )
            row = cursor.fetchone()
    return row["hash"] if row and row.get("hash") else "0"


def migrate_file_entries(entries: List[Dict[str, Any]]) -> int:
    if not postgres_enabled():
        return 0

    count = 0
    for entry in entries:
        append_decision(entry)
        count += 1
    return count
