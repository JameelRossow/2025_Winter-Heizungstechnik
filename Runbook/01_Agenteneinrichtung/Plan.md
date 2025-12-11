# Plan4: Finale Prüfungsimplementierung mit robuster UTF-8-Pipeline

## Kontext
Plan3 bildet die Architektur, die wir umsetzen wollen; Plan4 ist die finale Entscheidung, in der wir alle operativen Details festhalten, bevor wir mit der eigentlichen Codierung beginnen. Der Fokus bleibt auf zwei Agenten plus Python-Supervisor-Logik, aber wir ergänzen Klarheit bei Encoding, Kritikersignalen, CLI-Optionen und Git-Handling, damit die Umsetzung ohne Nachfragen läuft.

## Design-Prinzipien
- **Simpel, aber deterministisch**: Zwei Agenten (Experte + Kritiker), `run_agents.py` als Loop-Controller, Full-File-Replace plus Backup/Diff.  
- **Maschinenlesbare Zustände**: Kritiker-Output endet immer mit `STATUS: ...` (letzte nicht-leere Zeile), `run_agents.py` parst diese Zeile von unten.  
- **UTF-8-first**: Alle Dateioperationen mit `encoding="utf-8"` und `newline="\n"`; Agenten-Prompts schreiben ausdrücklich „Unicode (äöüß) im Markdown bitte, keine Entities“.  
- **CLI-Erweiterbarkeit**: `--chapter`, optional `--docs-catalog docs.yaml`, Parameter `--max-rounds` (Standard 3) und `--log` (optional eigener Log-Path).  
- **Logs & Diff**: Jeder Schreibvorgang produziert eine `agent_workflow/logs/<timestamp>.md` (Gitignored) mit Konversation, Kritiker-Status, Entscheidung und `difflib`-Diff. Backup-Datei (`<chapter>.bak`) bleibt lokal bis nächste Runde.

## Komponenten & Details
### 1. Entry Script `agent_workflow/run_agents.py`
1. **Argumentparser**
   - `--chapter PATH` (alternativ `-c`): Pfad zur Markdown-Datei (oder Key aus docs.yaml).  
   - `--goal TEXT` (optional): Zielbeschreibung, wird an beide Agents weitergereicht.  
   - `--max-rounds INT` (default 3), `--docs-catalog PATH` (optional), `--log PATH` (optional für manuellen Log-Output).  
2. **Docs-Katalog (optional)**
   - `docs.yaml` Struktur:  
     ```yaml
     - name: heizung
       path: docs/heizung.md
       description: Heizlast und Komponenten
     ```
   - Wenn `--chapter` mit `name` übereinstimmt, wird der Pfad genutzt. Ansonsten wird `--chapter` als Dateipfad interpretiert.
3. **Prompts & Agents**
   - Lädt `agent_workflow/config/agents.yaml` und die enthaltenen System-/Instruction-Prompts aus `prompts/`.  
   - Kritiker-Systemprompt endet mit: `Beende jede Antwort mit einer eigenen Zeile "STATUS: OK" oder "STATUS: REVISION_NEEDED".`  
   - Prompts weisen ausdrücklich auf „de-DE UTF-8 Markdown, keine HTML-Entities“ hin.
4. **Loop**
   - `SessionState`-ähnlich: `round = 1`, `status = "weiter"`.
   - Runde:  
     a. Expert-Agent erhält Kontext (`chapter_content`, `goal`, `previous_revision_notes`).  
     b. Kritiker-Agent erhält Expertenantwort + Ziel, formuliert Feedback + `STATUS`.  
     c. `run_agents.py` liest den status from final non-empty line in crític response.  
   - `status == "OK"` → DocumentService Backup + Rewrite + Diff, Log `STATUS: OK`, exit success.  
   - `status == "REVISION_NEEDED"`:  
     * `round < max_rounds` → `round += 1`, setze `previous_revision_notes` auf Kritikertext minus STATUS-Zeile.  
     * `round == max_rounds` → Log `STATUS: RUECKFRAGE_FUER_NUTZER`, informiere CLI + exit with code 2 (or flagged).
5. **Supervisor-Logik**
   - Keine dritten Agenten: Python entscheidet, ob Runde fortgesetzt wird oder ob geschrieben bzw. Rückfrage-Status erreicht wurde.  
   - Fragen optional per CLI (z.B. `--force-rounds`) enforces more loops.
6. **Logging**
   - Standard-Log Pfad `<timestamp>.md` (z.B. `2025-12-11T134252Z.md`), optional `--log` overrides.  
   - Pro Log-Eintrag: Kapitel, Runde, Expert-Text, Kritiker-Response, entdeckte STATUS, Entscheidung, `difflib`-Diff (Full-File) inkl. Backup-Link.  
   - `agent_workflow/logs/` ist gitignored (`.gitignore` updated).

### 2. DocumentService `agent_workflow/services/document_service.py`
1. **Locking**
   - Lockfile `<chapter>.lock` im selben Verzeichnis.  
   - `acquire_lock()` wartet einige Sekunden (configurable) und wirft Fehlermeldung, wenn kein Zugriff.  
2. **Load/Backup/Save**
   - `load()` liest mit `open(..., encoding="utf-8", newline="\n")`.  
   - `backup()` schreibt aktuelle Datei nach `<chapter>.bak` (UTF-8, newline `\n`).  
   - `write(new_content)` überschreibt Kapitel (auch UTF-8 & newline `\n`).  
3. **Diff**
   - `make_diff(old, new)` nutzt `difflib.unified_diff` mit `fromfile/ tofile`.  
   - Diff wird zurückgegeben und in Log eingebettet.
4. **Release**
   - Lock entfernen, `DocumentService.release()` nach Erfolg/failure.

### 3. Config & Prompts
1. `agent_workflow/config/agents.yaml` (YAML, inspiriert von OpenAI-Examples) enthält:  
   ```yaml
   expert:
     model: gpt-4o
     temperature: 0.2
     system_prompt: config/prompts/expert_system.md
     tool: doc_reader
   critic:
     model: gpt-4o
     temperature: 0.3
     system_prompt: config/prompts/critic_system.md
   ```
2. Prompts (z.B. `expert_system.md`, `critic_system.md`) enthalten Anforderungen (Deutsch, Markdown, klarer Stil) sowie `STATUS`-Zeile für Kritiker.  
3. Tools (z.B. `doc_reader`, `websearch`) re-used from `examples/tools`, minimal wrappers to read file contents.

### 4. Logging & Git
- `agent_workflow/logs/` enthält Schreibprotokolle; wird in `.gitignore`.  
- CLI gibt Feedback: `Kapitel geschrieben`, `Rückfrage: siehe logs/...`, `Lock lässt sich nicht setzen`.

## Workflowschritte (Detail)
1. `python agent_workflow/run_agents.py --chapter docs/03_kapitel.md --goal "Kapitel Heizkörper" --max-rounds 3`.  
2. `DocumentService.acquire_lock()`; `content = load()`.  
3. Expert agent prompt includes excerpt + goal; resulting Markdown stored as `expert_content`.  
4. Kritiker prompt: includes `expert_content`, goal, previous round notes; ensures final line `STATUS: ...`.  
5. `run_agents.py` parses last non-empty line:  
   - `OK` → DocumentService backup & write, produce `diff`, log `STATUS: OK`.  
   - `REVISION_NEEDED`: store Kritiker objects, `round += 1`. If reached limit → log `STATUS: RUECKFRAGE_FUER_NUTZER`.  
6. Release lock, print CLI summary (status + log path).  
7. Gitstatus bleibt sauber (logs gitignored, backup optional).

## Zusätzliche Details
- **docs.yaml template**:  
  ```yaml
  chapters:
    - name: heizung
      path: docs/heizung.md
      description: ...
  ```  
- **Fallback**: wenn `docs.yaml` Datei fehlt oder unvollständig, `--chapter` wird als Pfad interpretiert und `description` optional für CLI-Help.  
- **Encoding-Hinweis**: In `prompts/` und Python-Code steht explizit „UTF-8 Markdown, alle Umlaute, keine HTML-Entities“, damit Agenten konsistent bleiben.

## Detaillierter Treepath
```
03_Dokumentation/
├── agent_workflow/
│   ├── run_agents.py
│   │   └── CLI + Loop (chapter/goal/docs-catalog/-max-rounds/-log) → Expert/Kritiker → STATUS-Parser → DocumentService + Logging.
│   ├── config/
│   │   ├── agents.yaml
│   │   │   └── beschreibt `expert`/`critic` (Modelle, Temperaturs, System-Prompts, Tools wie DocReader).
│   │   └── prompts/
│   │       ├── expert_system.md    # Kontext, Ziel, de-DE UTF-8 Markdown, keine HTML-Entities.
│   │       ├── critic_system.md    # Gleiche Vorgabe + klare Anweisung: letzte Zeile immer STATUS: OK/REVISION_NEEDED.
│   │       └── tool_wrappers.md    # Optionaler Prompt-Flavor für DocReader/WebSearch.
│   ├── services/
│   │   └── document_service.py
│   │       ├── Locking (.lock), Timeout & Release (auch im Exception-Fall).
│   │       ├── Load/Backup/Write (alle mit `encoding="utf-8"`, `newline="\n"`).
│   │       └── Diff via `difflib.unified_diff` mit `fromfile/tofile`.
│   └── logs/
│       └── <timestamp>.md          # Konversation, Expert-/Critic-Responses, STATUS, Entscheidung, Diff, Backup-Referenz.
├── docs/                           # Tatsächliche Kapitel (Beispiel: `docs/kapitel-test.md`).
├── docs.yaml (optional)            # Kapitel-Metadaten (name/path/description) für `--docs-catalog`.
├── logs/                           # Weitere CLI- oder Prüfungslogs (nicht repositorykritisch).
└── .gitignore                      # Enthält `agent_workflow/logs/` + Backup-Muster (`*.bak`).
```

Die Darstellung ordnet jeden Ordner und jede Datei hinsichtlich Aufgabe und Inhalt, sodass du zielgerichtet mit dem Coding beginnen kannst.

## Nächste Schritte
1. `agent_workflow/services/document_service.py` implementieren (UTF-8, Locking, Backup, Diff).  
2. `agent_workflow/config/` mit `agents.yaml` + Prompts (inkl. STATUS-Hinweis) anlegen, `docs.yaml`-Template bereitstellen.  
3. `agent_workflow/run_agents.py` bauen: CLI, Loop, Statusparser, `DocumentService`-Calls, Log + Backup.  
4. `.gitignore` anpassen (`agent_workflow/logs/`).  
5. Testlauf mit einem echten Kapitel (z.B. `docs/kapitel-test.md`), um die Status-Pfade `OK`, `REVISION_NEEDED`, `RUECKFRAGE_FUER_NUTZER` durchzuarbeiten.
