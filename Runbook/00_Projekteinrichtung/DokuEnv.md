# Dokumentations-Umgebung

Dieser Abschnitt beschreibt, wie man die Dokumentations-Viewer-Umgebung lokal betreibt.

## Aktueller Status
- Wir arbeiten bevorzugt mit dem minimalen Setup: `python -m http.server` (aus dem Repo-Root) oder optional einem Live-Reload-Tool.
- Die Repo-Struktur bleibt unverändert; neue Artefakte wie `run.py` unterstützen das Live-Reload, ohne andere Dateien anzupassen.

## Empfehlung für die Doku-Arbeit
1. Aus dem Repo-Root (`03_Dokumentation`) den Standard-HTTP-Server starten:
   ```powershell
   cd C:\Users\jrossow\Desktop\JRos-Abschlussprüfung\02_2025_Winter-Heizungstechnik\03_Dokumentation
   python -m http.server 3000
   ```
2. Für automatisches Reloaden die virtuelle Umgebung und `run.py` nutzen:
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   python -m pip install livereload
   python run.py
   ```
   Das Skript startet `livereload`, beobachtet `docs/`, `viewer/`, `doc_config.yaml`, `index.html` und `home.*` und liefert die Seite unter `http://localhost:3000`.
   Während `run.py` läuft, wird automatisch `docs/doc_manifest.json` mit allen `.md`-Dateien aus dem `docs/`-Ordner erzeugt; du brauchst es nicht manuell zu pflegen, nur neue Dateinamen hinzufügen.
3. Noch schneller: Node-basierte Tools wie `live-server` oder `browser-sync` bzw. VS Code Live Server ergänzen die Beobachtung, falls du bereits Node nutzt.

## Hinweise
- Wenn `livereload` später einen Fehler wirft (z. B. „Pipe to stdout broken“), führt der `python run.py`-Aufruf die gleiche Logik aus, solange die Venv aktiv ist.
- Für andere Teammitglieder reicht es, diese Anweisungen zu befolgen; es ist keine zusätzliche Repo-Konfiguration notwendig.
