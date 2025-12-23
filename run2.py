import argparse
import json
import sys
import asyncio
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DOCS_DIR = ROOT / "docs"
MANIFEST_FILE = DOCS_DIR / "doc_manifest.json"
BUNDLE_FILE = ROOT / "viewer" / "docs_bundle.js"
VIEWER_HTML = ROOT / "viewer" / "index.html"


def ensure_manifest():
    try:
        from run import sync_docs
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"run.py konnte nicht geladen werden: {exc}") from exc
    sync_docs()


def build_docs_bundle():
    if not MANIFEST_FILE.exists():
        raise FileNotFoundError(f"Manifest fehlt: {MANIFEST_FILE}")
    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    files = {}
    for entry in manifest:
        file_name = entry.get("file")
        if not file_name:
            continue
        path = DOCS_DIR / file_name
        if not path.exists():
            continue
        files[file_name] = path.read_text(encoding="utf-8")
    payload = {"manifest": manifest, "files": files}
    js = "window.DOCS_BUNDLE = " + json.dumps(payload, ensure_ascii=False) + ";"
    BUNDLE_FILE.write_text(js, encoding="utf-8")


def render_pdf(output_path: Path):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Playwright fehlt. Installiere es mit: pip install playwright && playwright install"
        ) from exc

    if not VIEWER_HTML.exists():
        raise FileNotFoundError(f"Viewer fehlt: {VIEWER_HTML}")

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    url = VIEWER_HTML.as_uri()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.goto(url, wait_until="load")
        page.wait_for_selector(".doc-page", state="attached", timeout=60000)
        page.wait_for_function(
            "document.getElementById('status') && document.getElementById('status').textContent.includes('Bereit')",
            timeout=60000,
        )
        page.emulate_media(media="print")
        page.add_style_tag(
            content="""
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; background: white !important; }
.viewer-header, .status-message, .viewer-mobile-hint { display: none !important; }
.viewer-outer, .viewer-shell { padding: 0 !important; margin: 0 !important; gap: 0 !important; }
.doc-page { margin: 0 !important; border: none !important; outline: none !important; box-shadow: none !important; }
.doc-page { page-break-after: auto !important; page-break-before: auto !important; }
.doc-page.force-new-page-before { page-break-before: auto !important; }
.doc-page.page-break-after { page-break-after: auto !important; }
"""
        )
        page.wait_for_timeout(500)
        page.pdf(
            path=str(output_path),
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
            scale=1,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
        )
        browser.close()


def main():
    parser = argparse.ArgumentParser(
        description="Erzeugt eine PDF der Dokumentation wie im Viewer dargestellt."
    )
    parser.add_argument(
        "-o",
        "--output",
        default=str(ROOT / "Dokumentation.pdf"),
        help="Zielpfad fuer die PDF.",
    )
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    ensure_manifest()
    build_docs_bundle()
    render_pdf(output_path)
    print(f"PDF erzeugt: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Fehler: {exc}")
        sys.exit(1)
