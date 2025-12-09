# Agent Guidelines

## 1. Dokumentations-Stil
- Die Doku folgt dem Viewer-Layout (Century Gothic, 12pt, A4-Boxen, `viewer/viewer.css`). Überschriften nutzen Markdown-Standard (`#`, `##`, `###`) und die Typografie aus dem Viewer.
- Halte dich an die Hinweise aus `docs/0.0_User-Guide.md`: `run.py` pflegt Frontmatter, Listen beginnen mit `-` oder `1.`, Tabellen haben kein Inline-CSS, Formeln sind `$...$` oder `$$...$$`, Hinweise gern kursiv oder als Zitat.
- Jeder Abschnitt bleibt in seiner Datei; ergänze vorhandene Kapitel dort, wo sie thematisch passen.
- Schreibregel: Verwende immer die echten Umlaute `ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`. Setze niemals `ae`, `oe`, `ue` als Ersatz ein. Testweise: ä.ü.ö Ä.Ö.Ü funktionieren hier problemlos.

## 2. Git-Workflow
- Wir arbeiten ausschließlich auf einem Branch (`main`). Keine Feature-Branches, keine Merge-Strategien.
- Commit-Messages beginnen mit `Doku: …` oder `Code: …`. Danach folgt eine prägnante Beschreibung (z. B. `Doku: Kapitel 1.1 ergänzt` oder `Code: Viewer-CSS an angepasstes Layout angepasst`).
- Doku-Commits ändern nur Dateien unter `docs/` (z. B. `docs/1.1_Ausgangssituation.md`). Das ist der Inhalt der Prüfungsdokumentation.
- Code-Commits betreffen alle anderen Dateitypen (`.css`, `.html`, `.js`, `.py` oder Markdown-Dateien außerhalb von `docs/`), also Viewer, Skripte, Assets und alles technische Drumherum.
- Tags setzen wir nur bei fertigen Versionen. Der erste Tag ist `0.1.0`, weitere folgen mit neuen Meilensteinen.
- Alle Commits erfolgen über `commit.py`: Lege eine YAML-Datei im Ordner `commit/` an (Status-Zeile, Erstellungsdatum, Typ, Beschreibung, Commit-Message und betroffene Dateien). `commit.py` nimmt nur `pending`-Einträge in definierter Reihenfolge und führt `git add`/`git commit` mit der angegebenen Nachricht aus (Details in `commit/README.md`). Den Agenten soll das Script niemals eigenständig ausführen; es darf nur auf ausdrückliche Anweisung des Users gestartet werden.

## 3. Remote & Push
- Es bleibt dabei: Der Agent führt keine Remote-Pushes ohne ausdrückliche Anweisung des Users durch. Weist der User ausdrücklich darauf hin, kann der Push gemacht werden; sonst bitte immer den User daran erinnern, selbst `git push` auszuführen.
- Authentifizierung bei Pushes läuft über GitHub (Personal Access Token oder SSH). Einen dauerhaften `git login` gibt es nicht.

## 4. Scripts und Sicherheit
- Der Ordner `scripts/` ist für Hilfsskripte gedacht, die der Agent für wiederkehrende Aufgaben oder Analysen schreibt. Nutze diese Skripte, wenn sie Arbeit erleichtern, aber achte streng darauf, dass sie keine gefährlichen Operationen ausführen (keine automatischen Löschungen oder systemweiten Änderungen).

## 5. Kommunikation
- Gib Hinweise zu `run.py`, `doc_manifest.json` und dem Viewer nur dann weiter, wenn sie zum aktuellen Task passen.
- Nutze bei Beispieltexten echte Umlaute (z. B. `ä.ü.ö` oder `ÄÖÜ`), damit ersichtlich ist, dass die Kodierung funktioniert.
