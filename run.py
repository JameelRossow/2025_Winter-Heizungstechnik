import atexit
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"

def ensure_virtualenv():
    if not VENV_DIR.exists():
        return
    candidate_paths = [
        VENV_DIR / "Scripts" / "python.exe",
        VENV_DIR / "bin" / "python",
    ]
    current = Path(sys.executable).resolve()
    for candidate in candidate_paths:
        if not candidate.exists():
            continue
        target = candidate.resolve()
        if current == target:
            return
        os.execv(str(target), [str(target)] + sys.argv)


ensure_virtualenv()

try:
    from livereload import Server
except ImportError:  # pragma: no cover
    Server = None

ROOT = Path(__file__).resolve().parent
DOCS_DIR = ROOT / "docs"
MANIFEST_FILE = DOCS_DIR / "doc_manifest.json"
RUN_ID_FILE = ROOT / "run_id.json"

FRONT_FIELDS = [
    "status",
    "id",
    "title",
    "layout",
    "force_new_page_before",
    "page_break_after",
    "visible_in_viewer",
]


def _remove_run_id_file():
    try:
        RUN_ID_FILE.unlink()
    except FileNotFoundError:
        pass


atexit.register(_remove_run_id_file)


def record_run_id():
    payload = {
        "pid": os.getpid(),
        "started": datetime.utcnow().isoformat(),
    }
    RUN_ID_FILE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"run.py-PID {payload['pid']} in {RUN_ID_FILE.name} gespeichert.")


def parse_filename_meta(filename: Path) -> dict:
    stem = filename.stem
    parts = stem.split("_", 1)
    identifier = parts[0].strip()
    title = ""
    if len(parts) > 1:
        title = parts[1].replace("_", " ").strip()
    return {"id": identifier, "title": title or identifier}


def split_frontmatter(text: str):
    match = re.match(r"^\ufeff?\s*---\s*\r?\n([\s\S]*?)---\s*(?:\r?\n)?", text)
    if not match:
        return {}, text
    fm_text = match.group(1)
    rest = text[match.end() :]
    fm = {}
    for line in fm_text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        val = value.strip()
        if val.lower() in {"true", "false"}:
            fm[key] = val.lower() == "true"
        else:
            fm[key] = val.strip('"').strip("'")
    return fm, rest


def iter_markdown_files():
    if not DOCS_DIR.exists():
        return []
    return sorted(
        DOCS_DIR.rglob("*.md"),
        key=lambda path: path.relative_to(DOCS_DIR).as_posix(),
    )


def build_frontmatter(meta: dict, existing: dict) -> str:
    data = {
        "status": existing.get("status", ""),
        "id": meta["id"],
        "title": meta["title"],
        "layout": existing.get("layout", "A4") or "A4",
        "force_new_page_before": existing.get("force_new_page_before", True),
        "page_break_after": existing.get("page_break_after", True),
        "visible_in_viewer": existing.get("visible_in_viewer", True),
    }
    lines = ["---"]
    for field in FRONT_FIELDS:
        value = data[field]
        if isinstance(value, bool):
            lines.append(f"{field}: {'true' if value else 'false'}")
        else:
            safe = str(value).replace('"', '\\"')
            lines.append(f'{field}: "{safe}"')
    for key, value in existing.items():
        if key in FRONT_FIELDS:
            continue
        if isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            safe = str(value).replace('"', '\\"')
            lines.append(f'{key}: "{safe}"')
    lines.append("---\n")
    return "\n".join(lines)


def sync_docs():
    DOCS_DIR.mkdir(exist_ok=True)
    for md_file in iter_markdown_files():
        text = md_file.read_text(encoding="utf-8")
        front, rest = split_frontmatter(text)
        if front:
            continue
        meta = parse_filename_meta(md_file)
        fm_block = build_frontmatter(meta, front)
        new_body = rest.lstrip("\n")
        new_text = fm_block + new_body
        if new_text != text:
            md_file.write_text(new_text, encoding="utf-8")
    generate_manifest()


def generate_manifest():
    entries = []
    for md_file in iter_markdown_files():
        text = md_file.read_text(encoding="utf-8")
        front, _ = split_frontmatter(text)
        meta = parse_filename_meta(md_file)
        file_id = front.get("id", "") or meta["id"]
        file_title = front.get("title", "") or meta["title"]
        entries.append(
            {
                "id": file_id,
                "title": file_title,
                "file": md_file.relative_to(DOCS_DIR).as_posix(),
                "status": front.get("status", ""),
                "layout": front.get("layout", "A4"),
                "force_new_page_before": front.get("force_new_page_before", True),
                "page_break_after": front.get("page_break_after", True),
                "visible_in_viewer": front.get("visible_in_viewer", True),
                "description": front.get("description", ""),
            }
        )
    MANIFEST_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")


def serve():
    if Server is None:
        print("livereload ist nicht installiert; Manifest wurde dennoch aktualisiert.")
        return
    server = Server()
    server.watch("docs/**/*.md", sync_docs)
    server.watch("viewer/*.js")
    server.watch("viewer/*.css")
    server.watch("viewer/index.html")
    server.watch("index.html")
    server.watch("home.js")
    server.watch("home.css")
    record_run_id()
    server.serve(
        root=str(ROOT),
        host="127.0.0.1",
        port=3000,
        live_css=True,
        open_url_delay=1,
    )


if __name__ == "__main__":
    sync_docs()
    serve()
