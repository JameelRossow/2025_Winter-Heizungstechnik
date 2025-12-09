#!/usr/bin/env python3
"""Werkzeug zum Ausführen vorbereiteter Commits aus dem Ordner `commit/`."""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent
COMMIT_DIR = ROOT / "commit"
COMMIT_DIR.mkdir(exist_ok=True)
FIELD_ORDER = ["status", "created", "type", "description", "commit_message", "files", "executed_at"]


def load_entries() -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    for path in sorted(COMMIT_DIR.glob("*.yaml")):
        data = parse_yaml_file(path)
        if not data:
            continue
        data["_path"] = path
        data["files"] = normalize_files(data.get("files"))
        entries.append(data)
    return entries


def parse_yaml_file(path: Path) -> Optional[Dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    parsed: Dict[str, Any] = {}
    current_list: Optional[str] = None
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- ") and current_list:
            parsed[current_list].append(stripped[2:].strip())
            continue
        if ":" not in stripped:
            current_list = None
            continue
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not value:
            parsed[key] = []
            current_list = key
            continue
        current_list = None
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        parsed[key] = value
    if not parsed:
        return None
    return parsed


def normalize_files(value: Any) -> List[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, Iterable):
        return [str(item) for item in value if item]
    return []


def pending_entries(entries: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pending = []
    for entry in entries:
        status = str(entry.get("status", "pending")).strip().lower()
        if status != "done":
            pending.append(entry)
    return pending


def display_entries(entries: List[Dict[str, Any]]) -> None:
    if not entries:
        print("Keine ausstehenden Commit-Beschreibungen gefunden.")
        return
    print("Ausstehende Commits:")
    for idx, entry in enumerate(entries, start=1):
        created = entry.get("created", "unbekannt")
        type_tag = entry.get("type", "code")
        description = entry.get("description", "<keine Beschreibung>")
        files = entry.get("files") or []
        files_text = ", ".join(files) if files else "keine Dateien angegeben"
        print(f"{idx}. [{type_tag}] {created} – {description}")
        print(f"   Dateien: {files_text}")


def select_entries(count: int) -> List[int]:
    prompt = "Nummer(n) zum Commit ausführen (z. B. 1 oder 1,2,3; ENTER zum Abbruch): "
    selection = input(prompt).strip()
    if not selection:
        return []
    chosen: List[int] = []
    for token in selection.split(","):
        token = token.strip()
        if not token:
            continue
        if not token.isdigit():
            print(f"Ungültige Nummer: {token}")
            continue
        idx = int(token)
        if 1 <= idx <= count and idx not in chosen:
            chosen.append(idx)
    return chosen


def parse_created(value: Any) -> datetime:
    if not value:
        return datetime.max
    if isinstance(value, datetime):
        return value
    text = str(value)
    for fmt in ("%y%m%d_%H%M%S", "%Y%m%d_%H%M%S", "%Y%m%d%H%M%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        pass
    return datetime.max


def write_entry(path: Path, data: Dict[str, Any]) -> None:
    payload: Dict[str, Any] = {}
    for key in FIELD_ORDER:
        if key not in data:
            continue
        payload[key] = data[key]
    extras = [key for key in data.keys() if key not in FIELD_ORDER and not key.startswith("_")]
    extras.sort()
    for key in extras:
        payload[key] = data[key]
    lines: List[str] = []
    for key, value in payload.items():
        if key == "files":
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
            continue
        if isinstance(value, str):
            escaped = value.replace('"', '\\"')
            lines.append(f'{key}: "{escaped}"')
        else:
            lines.append(f"{key}: {value}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def commit_entries(entries: List[Dict[str, Any]]) -> None:
    if not entries:
        return
    root = ROOT
    for entry in sorted(entries, key=lambda e: parse_created(e.get("created"))):
        path = entry.get("_path")
        files = entry.get("files") or []
        if not files:
            print(f"Übersprungen: '{entry.get('description', '<unbenannt>')}' (keine Dateien).")
            continue
        message = entry.get("commit_message") or entry.get("description")
        if not message:
            print(f"Übersprungen: '{entry.get('description', '<unbenannt>')}' (fehlende Commit-Nachricht).")
            continue

        executed_at = datetime.now(timezone.utc).isoformat()
        entry["status"] = "done"
        entry["executed_at"] = executed_at
        if isinstance(path, Path):
            data = dict(entry)
            data.pop("_path", None)
            write_entry(path, data)

        print(f"Commit: {message}")
        try:
            subprocess.run(["git", "add", *files], check=True, cwd=str(root))
            subprocess.run(["git", "commit", "-m", message], check=True, cwd=str(root))
        except subprocess.CalledProcessError as exc:
            print(f"Fehler beim Commit von {path}: {exc}")
            continue


def main() -> None:
    entries = pending_entries(load_entries())
    entries.sort(key=lambda entry: parse_created(entry.get("created")))
    if not entries:
        print("Keine ausstehenden Commits.")
        return
    display_entries(entries)
    chosen = select_entries(len(entries))
    if not chosen:
        print("Keine Commit-Auswahl getroffen.")
        return
    to_commit = [entries[idx - 1] for idx in sorted(chosen)]
    commit_entries(to_commit)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAbgebrochen.")
        sys.exit(1)
