# Winter 2025 - Heizungstechnik (Dokumentation)

Diese README fasst zusammen, wie die Dokumentation meines Prüfungsprojekts aufgebaut ist. Wer nachvollziehen möchte, wie ich den Auftrag strukturiert, automatisiert und veröffentliche, findet hier die relevanten Ordner und Artefakte.

## Struktur des Ordners
| Bereich | Inhalt |
| --- | --- |
| `agent_workflow` | YAML-Runs, Prompt-Profile und Hilfsdateien, mit denen ich Agenten auf verschiedene Dokumentationsaufgaben ansetze. |
| `docs` / `documents4docs` | Exportierte Dokumente, Entwürfe und Assets für die schriftliche Abgabe. |
| `Runbook` | Schrittlisten und Checklisten für Vorbereitung, Durchführung und Nachbereitung der Prüfung. |
| `scripts` | Utility-Skripte zur Automatisierung einzelner Aufgaben (z. B. Generieren, Validieren, Aufräumen). |
| `viewer` | Kleiner Webviewer (HTML/CSS/JS), um Inhalte lokal oder auf GitHub Pages zu präsentieren. |
| `commit` / `commit.py` | Werkzeuge für reproduzierbare Commits und konsistente Changelogs. |
| `.venv`, `.env`, `run.py`, `stop.py` | Runtime-Grundlage für das Agent-Setup, inklusive Start/Stop-Skripten. |

## Roadmap
| Phase | Ziel | Referenzen |
| --- | --- | --- |
| Ausgangslage klären | Ausgangssituation, Prüfungsauftrag und Rahmenbedingungen erfassen. | `agent_workflow/run_agents/run-1.1_Ausgangssituation.yaml`, `run-1.2_Pruefungsauftrag.yaml` |
| Auftragsanalyse vertiefen | Anforderungen abgrenzen, Vorgehensmodell festlegen. | `run-1.3_Auftragsanalyse_Abgrenzung_Vorgehensweise.yaml`, `Runbook/` |
| Umsetzung vorbereiten | Automatisierte Agent-Läufe konfigurieren, Skripte testen. | `agent_workflow/config/`, `scripts/`, `.venv` |
| Dokumente produzieren | Inhalte schreiben, Exporte erzeugen, Viewer aktualisieren. | `docs/`, `documents4docs/`, `viewer/` |
| Review & Release | Prüfen, committen und auf GitHub Pages bzw. Projektseite veröffentlichen. | `commit/`, `commit.py`, `run.py`, Projektseite |

## Projektseite
Die veröffentlichte Projektseite ist hier erreichbar:

https://jameelrossow.github.io/2025_Winter-Heizungstechnik/

Damit sollte klar sein, welche Bausteine in diesem Dokumentationsordner liegen und wie sie zusammenspielen.
