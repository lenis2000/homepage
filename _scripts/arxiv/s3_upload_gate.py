"""
Shared upload gate: prevents S3 uploads more than once per 30 days.

Usage in other scripts:
    from s3_upload_gate import should_upload, record_upload

    if should_upload(force=args.force_upload):
        # do the upload
        record_upload()
    else:
        print("Skipping upload (last upload < 30 days ago)")
"""

import json
import time
from pathlib import Path

GATE_FILE = Path(__file__).resolve().parent / ".last-s3-upload"
UPLOAD_INTERVAL = 30 * 24 * 3600  # 30 days in seconds


def _read_gate() -> dict:
    if GATE_FILE.exists():
        try:
            return json.loads(GATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def should_upload(force: bool = False) -> bool:
    """Return True if an upload should proceed."""
    if force:
        return True
    gate = _read_gate()
    last = gate.get("timestamp", 0)
    return (time.time() - last) >= UPLOAD_INTERVAL


def record_upload():
    """Record that an upload just happened."""
    GATE_FILE.write_text(json.dumps({"timestamp": time.time()}))


def days_until_next() -> float:
    """Days remaining until next upload is allowed."""
    gate = _read_gate()
    last = gate.get("timestamp", 0)
    remaining = UPLOAD_INTERVAL - (time.time() - last)
    return max(0, remaining / 86400)
