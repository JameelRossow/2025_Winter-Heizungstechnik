#!/usr/bin/env python3
"""Stoppt den Viewer-Server anhand der gespeicherten `run_id.json`."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUN_ID_FILE = ROOT / "run_id.json"


def remove_run_id_file():
    try:
        RUN_ID_FILE.unlink()
    except FileNotFoundError:
        pass


def load_saved_pid() -> int | None:
    if not RUN_ID_FILE.exists():
        return None
    try:
        payload = json.loads(RUN_ID_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    pid = payload.get("pid")
    if isinstance(pid, int):
        return pid
    if isinstance(pid, str) and pid.isdigit():
        return int(pid)
    return None


def is_pid_running(pid: int) -> bool:
    if os.name == "nt":
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}", "/NH"],
                capture_output=True,
                text=True,
            )
            output = result.stdout.strip()
            if not output or "No tasks" in output:
                return False
            return str(pid) in output
        except FileNotFoundError:
            pass
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def terminate_pid(pid: int) -> bool:
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        pass
    else:
        return True
    if os.name == "nt":
        try:
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                check=True,
                capture_output=True,
                text=True,
            )
            return True
        except subprocess.CalledProcessError:
            pass
    return False


def main() -> int:
    pid = load_saved_pid()
    if pid is None:
        print("Keine gespeicherte run.py-PID gefunden.")
        return 0
    print(f"Gefundene run.py-PID: {pid}")
    if not is_pid_running(pid):
        print("Der Prozess läuft nicht mehr; die Laufzeitdatei wird gelöscht.")
        remove_run_id_file()
        return 0
    print("Prozess wird beendet …")
    if terminate_pid(pid):
        print("run.py wurde beendet.")
    else:
        print("Konnte den Prozess nicht stoppen; bitte Task-Manager nutzen.")
    remove_run_id_file()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
