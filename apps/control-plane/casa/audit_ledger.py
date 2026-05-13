import datetime
import json
import hashlib
import os
from pathlib import Path
from typing import List, Dict, Any

from config import LEDGER_FILE
from casa.storage import append_decision, last_hash, postgres_enabled, read_decisions


def _ledger_path() -> Path:
    return Path(LEDGER_FILE)


def compute_hash(entry: Dict[str, Any], previous_hash: str = "0") -> str:
    """Compute SHA-256 hash of an entry with previous hash included."""
    entry_with_previous = {
        "previous_hash": previous_hash,
        **entry
    }
    entry_str = json.dumps(entry_with_previous, sort_keys=True)
    return hashlib.sha256(entry_str.encode()).hexdigest()


def _get_previous_hash() -> str:
    """Return the hash of the last ledger entry without reading the whole file."""
    if postgres_enabled():
        return last_hash()

    ledger_path = _ledger_path()
    try:
        file_size = os.path.getsize(ledger_path)
    except FileNotFoundError:
        return "0"

    if file_size == 0:
        return "0"

    try:
        chunk_size = min(4096, file_size)
        with open(ledger_path, "rb") as f:
            f.seek(-chunk_size, 2)
            chunk = f.read(chunk_size).decode("utf-8", errors="replace")

        lines = [line for line in chunk.splitlines() if line.strip()]
        if not lines:
            return "0"

        last_entry = json.loads(lines[-1])
        return last_entry.get("hash", "0")
    except (json.JSONDecodeError, KeyError, OSError):
        return "0"


def record_decision(agent: str, action: str, risk: str, decision: str) -> Dict[str, Any]:
    """Record a governance decision with hash chain integrity."""
    previous_hash = _get_previous_hash()

    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "agent": agent,
        "action": action,
        "risk": risk,
        "decision": decision
    }

    entry_hash = compute_hash(entry, previous_hash)
    entry_with_hash = {
        **entry,
        "hash": entry_hash,
        "previous_hash": previous_hash
    }

    if postgres_enabled():
        return append_decision(entry_with_hash)

    ledger_path = _ledger_path()
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with open(ledger_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry_with_hash) + "\n")

    return entry_with_hash


def read_ledger() -> List[Dict[str, Any]]:
    """Read and parse entire ledger file."""
    if postgres_enabled():
        return read_decisions()

    entries = []
    ledger_path = _ledger_path()
    try:
        with open(ledger_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        pass
    return entries


def verify_ledger_integrity() -> Dict[str, Any]:
    """Verify hash chain integrity of entire ledger."""
    entries = read_ledger()
    errors = []

    if not entries:
        return {
            "valid": True,
            "total_entries": 0,
            "broken_at_index": None,
            "errors": []
        }

    if entries[0].get("previous_hash") != "0":
        errors.append("First entry does not have previous_hash='0'")

    for i, entry in enumerate(entries):
        stored_hash = entry.get("hash")
        previous_hash = entry.get("previous_hash", "0")

        entry_copy = {k: v for k, v in entry.items() if k != "hash"}
        computed_hash = compute_hash(entry_copy, previous_hash)

        if stored_hash != computed_hash:
            errors.append(f"Entry {i}: hash mismatch (stored={stored_hash}, computed={computed_hash})")
            return {
                "valid": False,
                "total_entries": len(entries),
                "broken_at_index": i,
                "errors": errors
            }

        if i > 0:
            previous_entry_hash = entries[i-1].get("hash")
            if previous_hash != previous_entry_hash:
                errors.append(f"Entry {i}: previous_hash mismatch")
                return {
                    "valid": False,
                    "total_entries": len(entries),
                    "broken_at_index": i,
                    "errors": errors
                }

    return {
        "valid": True,
        "total_entries": len(entries),
        "broken_at_index": None,
        "errors": errors
    }


def get_decision_by_id(index: int) -> Dict[str, Any]:
    """Retrieve a decision entry by its index in the ledger."""
    entries = read_ledger()
    if 0 <= index < len(entries):
        return entries[index]
    raise IndexError(f"No entry at index {index}")
