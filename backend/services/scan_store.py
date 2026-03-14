"""
Lightweight in-memory + JSON-backed store for scans and settings.
"""

from __future__ import annotations

import json
import os
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_retention_days(value) -> int | None:
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() == "indefinitely":
        return None
    try:
        days = int(value)
        if days <= 0:
            return None
        return days
    except Exception:
        return None


def _format_time_ago(ts: float) -> str:
    delta = max(0, int(time.time() - ts))
    if delta < 60:
        return f"{delta}s ago"
    if delta < 3600:
        return f"{delta // 60} mins ago"
    if delta < 86400:
        return f"{delta // 3600} hrs ago"
    return f"{delta // 86400} days ago"


def _status_from_result(verdict: str, confidence: float) -> str:
    if verdict == "FAKE":
        if confidence >= 0.9:
            return "CRITICAL"
        if confidence >= 0.65:
            return "WARNING"
        return "WARNING"
    if verdict == "REAL":
        return "SAFE"
    return "WARNING"


class ScanStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.state_path = os.path.join(self.data_dir, "state.json")
        self._state = {
            "settings": {
                "auto_scan": True,
                "aggressive_mode": False,
                "notifications": True,
                "digest_reports": True,
                "data_retention_days": 30,
                "confidence_threshold": 0.92,
            },
            "scans": [],
        }
        self._active = set()
        self._load()

    def _load(self) -> None:
        os.makedirs(self.data_dir, exist_ok=True)
        if not os.path.exists(self.state_path):
            self._load_env_defaults()
            self._save()
            return
        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                self._state = json.load(f)
            self._load_env_defaults(merge_only=True)
        except Exception as e:
            logger.warning(f"Failed to load state file: {e}")
            self._load_env_defaults()
            self._save()

    def _load_env_defaults(self, merge_only: bool = False) -> None:
        settings = self._state.get("settings", {}) if merge_only else {}
        env_threshold = os.getenv("CONFIDENCE_THRESHOLD")
        if env_threshold is not None:
            try:
                settings["confidence_threshold"] = float(env_threshold)
            except Exception:
                pass
        env_retention = os.getenv("DATA_RETENTION_DAYS")
        if env_retention is not None:
            try:
                settings["data_retention_days"] = int(env_retention)
            except Exception:
                pass
        if not merge_only:
            self._state["settings"] = {
                "auto_scan": True,
                "aggressive_mode": False,
                "notifications": True,
                "digest_reports": True,
                "data_retention_days": settings.get("data_retention_days", 30),
                "confidence_threshold": settings.get("confidence_threshold", 0.92),
            }
        else:
            if "confidence_threshold" in settings:
                self._state.setdefault("settings", {})["confidence_threshold"] = settings["confidence_threshold"]

    def _save(self) -> None:
        try:
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump(self._state, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save state file: {e}")

    # Settings
    def get_settings(self) -> dict:
        return dict(self._state.get("settings", {}))

    def update_settings(self, updates: dict) -> dict:
        settings = self._state.setdefault("settings", {})
        for key, value in updates.items():
            if key not in settings:
                continue
            settings[key] = value
        self._save()
        return dict(settings)

    # Scans
    def start_scan(self, scan_id: str, filename: str, file_type: str) -> None:
        self._active.add(scan_id)
        entry = {
            "scan_id": scan_id,
            "filename": filename,
            "file_type": file_type,
            "status": "PROCESSING",
            "confidence": 0.0,
            "verdict": "UNKNOWN",
            "timestamp": _now_iso(),
            "timestamp_epoch": time.time(),
        }
        self._state.setdefault("scans", []).append(entry)
        self._trim_retention()
        self._save()

    def finish_scan(self, result: dict) -> None:
        scan_id = result.get("scan_id")
        self._active.discard(scan_id)
        scans = self._state.setdefault("scans", [])
        for entry in reversed(scans):
            if entry.get("scan_id") == scan_id:
                entry.update({
                    "status": _status_from_result(result.get("verdict", "UNKNOWN"), result.get("confidence", 0.0)),
                    "confidence": result.get("confidence", 0.0),
                    "verdict": result.get("verdict", "UNKNOWN"),
                })
                break
        self._trim_retention()
        self._save()

    def fail_scan(self, scan_id: str, error: str) -> None:
        self._active.discard(scan_id)
        scans = self._state.setdefault("scans", [])
        for entry in reversed(scans):
            if entry.get("scan_id") == scan_id:
                entry.update({
                    "status": "ERROR",
                    "error": error,
                })
                break
        self._trim_retention()
        self._save()

    def recent_scans(self, limit: int = 10) -> list[dict]:
        scans = self._state.get("scans", [])
        recent = list(reversed(scans))[: max(1, limit)]
        for entry in recent:
            ts = entry.get("timestamp_epoch", time.time())
            entry["time_ago"] = _format_time_ago(ts)
        return recent

    def stats(self) -> dict:
        scans = self._state.get("scans", [])
        total = len(scans)
        deepfakes = sum(1 for s in scans if s.get("verdict") == "FAKE")
        return {
            "total_scans": total,
            "deepfakes_found": deepfakes,
            "processing_queue": len(self._active),
            "model_accuracy": 0.994,
            "recent_scans": self.recent_scans(5),
        }

    def clear_scans(self) -> None:
        self._state["scans"] = []
        self._active = set()
        self._save()

    def _trim_retention(self) -> None:
        settings = self._state.get("settings", {})
        retention_days = _parse_retention_days(settings.get("data_retention_days"))
        if retention_days is None:
            return
        cutoff = time.time() - (retention_days * 86400)
        self._state["scans"] = [
            s for s in self._state.get("scans", [])
            if s.get("timestamp_epoch", time.time()) >= cutoff
        ]
