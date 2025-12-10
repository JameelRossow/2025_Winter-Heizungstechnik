# Commit-Descriptor

Lege YAML-Dateien in diesem Ordner an, damit `commit.py` weiß, welche Commits automatisch vorbereitet wurden.
Die Datei muss mit einer Statuszeile beginnen, z. B.:

```
status: "pending"
created: "251209_143500"
type: "code"
description: "Viewer-Pfade für GitHub Pages korrigiert"
commit_message: "Code: Viewer docs paths"
files:
  - viewer/docs_viewer.js
```

Verwende `status: done`, sobald der Commit von `commit.py` ausgeführt wurde. Weitere Felder (z. B. `note:`) bleiben erhalten.

Wichtig: Trage die YAML-Datei, die du hier f�r einen Commit anlegst, ebenfalls im Feld "files" ein, damit commit.py sie automatisch mitsichert.
