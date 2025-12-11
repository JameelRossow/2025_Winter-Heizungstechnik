# Overview: Agenten-Workflow ausführen & testen

## 1. Vorbereitung
- **`.env` in `03_Dokumentation/`** mit mindestens `OPENAI_API_KEY=<dein_key>` (optional `OPENAI_ORG_ID`, `OPENAI_API_BASE`).
- Kapitelübersicht anlegen/ergänzen in `03_Dokumentation/docs.yaml`, damit `--chapter <name>` bequem auf Pfade zeigt.
- Sicherstellen, dass das Python-ENV aus `03_Dokumentation/.venv` aktiv ist (`.\.venv\Scripts\activate`), sonst laufen die `agents`-Pakete nicht.

## 2. Skript starten
```
cd 03_Dokumentation
python agent_workflow/run_agents.py --chapter docs/kapitel.md --goal "Beschreibe Ziel" --max-rounds 3
```
Optionen:
- `--chapter` akzeptiert entweder einen Pfad (`docs/kapitel.md`) oder einen Namen aus `docs.yaml`.
- `--goal` definiert das aktuelle Ziel (optional, default = Dateiname).
- `--docs-catalog docs.yaml` nutzt den Katalog explizit, falls du nicht `docs.yaml` im Root liegen hast.
- `--max-rounds` (Default 3) bestimmt, wie viele Expert/Kritiker-Runden erlaubt sind.
- `--log pfad/zur/log.md` legt den Speicherort für das Markdown-Log fest (sonst `agent_workflow/logs/<timestamp>.md`).

Nach dem Lauf:
- Erfolgreiches `STATUS: OK` → Kapiteldatei in `docs/` wurde durch die Kritikerfassung ersetzt, Backup liegt als `.bak`.
- `STATUS: RUECKFRAGE_FUER_NUTZER` → keine Änderung, kritische Punkte stehen im Log und im letzten Kritikertext.
- Log prüfen (`agent_workflow/logs/<timestamp>.md`) für gesamten Prompt-/Antwort-Verlauf und Diff.

## 3. Tests / Dry Runs
- Syntax-Check schon per `python -m compileall agent_workflow` erledigt; zusätzlich kannst du eine kurze Testdatei (`docs/kapitel-test.md`) anlegen und die CLI darauf ausführen.
- Für schnelle Runden: `--max-rounds 1` erzwingt eine einzelne Iteration (hilfreich, wenn du nur den Output eines Experten testen willst).
- Dry-Run ohne echte Docs: erzeuge eine leere Markdown-Datei, das Skript startet trotzdem (DocumentService schreibt Backup der leeren Datei).

## 4. Sicherheit & Umfang
- **Dateizugriff**: Die beiden Agenten selbst haben keine Dateischreibrechte. Nur `run_agents.py` (Python-Code) führt Dateisystem-Operationen aus (`DocumentService`). Dadurch ist der Schreibpfad fest auf die ausgewählte Kapiteldatei (+ `.bak` + Log) begrenzt.
- **Tools**: Aktuell ruft der Code keine Tools bzw. MCP-Server auf; die Agenten erhalten lediglich vorbereitete Prompts (Kapitelinhalt, Ziel, Revisionen). Es gibt keine Funktion, die beliebige Shell-Befehle ausführt.
- **Kontext**: Pro Lauf ist exakt **ein Kapitel** gesperrt (`.lock`), sodass nicht parallel daran gearbeitet wird. Die Agenten lesen nur den Kapiteltext + Ziel + ggf. vorherige Revisionen. Dadurch ist die Bearbeitung auf dieses Kapitel beschränkt.
- **Netzwerk**: Solange du keine WebSearch- oder externen Tools ergänzt, sprechen die Agenten ausschließlich mit dem OpenAI-Endpoint gemäß `OPENAI_API_KEY`. Ein „versehentliches“ Ausführen lokaler Befehle durch den Agenten ist nicht möglich, weil das Skript keine solchen Tools registriert.
- **Rollback**: Jede Version wird vor dem Überschreiben als `<kapitel>.bak` gesichert. Über `git diff` oder die `.bak`-Datei kannst du jederzeit zurückspringen.

## 5. Empfehlung für weitere Runs
1. Kapitel kurz prüfen und Ziel definieren.
2. `run_agents.py` mit passenden Parametern starten.
3. Nach Abschluss das Log anschauen, ggf. Anpassungen vornehmen.
4. Bei Fragen oder weiteren Features (z.B. WebSearch, zusätzliche Agenten) zuerst im Plan ergänzen, dann Code erweitern.
