# Answers_agent

## Feedback zum Plan
- Grob halte ich den vorgeschlagenen Ansatz für sehr gut strukturiert; Modulierung der Inhalte in nummerierte Markdown-Dateien plus Metaebenen (doc_config + Frontmatter) gibt Ordnung und erlaubt späteres Um- bzw. Nachsortieren.
- Ich würde aber etwas mehr Gewicht auf die Konfigurierbarkeit der Reihenfolge und Sichtbarkeit legen (doc_config als primäre Steuerung, Frontmatter ergänzt nur Seitenoptionen). Damit bleibt die „Dateiname als Ordnung“ optional und wir können Projekt-übergreifend dieselbe Pipeline nutzen.
- Auch würde ich frühzeitig ein einfaches Preview-Layout implementieren, sonst fehlt die greifbare Rückmeldung, ob das Layout wirklich wie A4 wirkt; ein statischer HTML-Viewer mit CSS reicht dafür völlig aus.

## Änderungen, Erweiterungen, Weglassen
- **Übernehmen:** Die Aufteilung in Kapiteldateien, die A4-Viewer-Idee mit CSS-Layout, und die Verwendung einer bewährten Markdown-Bibliothek (z. B. `markdown-it`).
- **Ändern:** Statt Frontmatter als einzige Quelle für Reihenfolge/Verfügbarkeit würde ich doc_config als zentrale Steuerung nutzen und Frontmatter auf Seiteneigenschaften (force page break etc.) beschränken. Das macht den Ordnungsmechanismus projektneutral.
- **Weglassen/verschieben:** PDF-Export via Puppeteer/Playwright können wir erstmal auf „später“ stellen. Für eine erste Iteration genügt der Browser-Export aus dem Viewer; dadurch bekommen wir schneller ein funktionierendes MVP.

## Minimal-Version (erste Iteration)
1. `Dokumentation/docs/` mit Beispielkapiteln inklusive Frontmatter für Layout-Anweisungen.
2. `doc_config.yaml` als Liste strukturierter Kapitel mit Verweisen auf die Markdown-Dateien.
3. Ein minimalistischer Viewer (`index.html` + `docs_viewer.js`), der per Fetch die Reihenfolge aus der Config lädt, `markdown-it` nutzt, HTML in `.page`-Blöcke mit CSS-A4-Layout packt und optional `force_new_page_before` berücksichtigt.
4. Browser-Sanitizing via `DOMPurify`, falls wir HTML erlauben (z. B. im erweiterten Content). PDF-Export bleibt vorerst Browser-abhängig.

Das ergibt einen sichtbaren MVP, auf dem wir später PDF-Export, Profile, Filter usw. aufsetzen können.

## Technische Stolpersteine
- Die Seiteneinteilung ausschließlich im Frontend zu machen, funktioniert für relativ kurze Kapitel, aber bei sehr langen Abschnitten muss man mit CSS-Breaks arbeiten; eine hybride Lösung (doc_config gibt Breakpoints vor, CSS sorgt für A4-Boxen) dürfte ausreichend sein.
- Wenn Inhalte viele Tabellen/Bilder enthalten, kann das Layout auf A4 knifflig werden; wir sollten später prüfen, ob wir etwa eine Klassen-Regel für Bildbreiten brauchen oder Seitenumbrüche vor Tabellen erzwingen (via Frontmatter).
- Sanitizing ist notwendig, sobald wir beschränkte HTML-Snippets erlauben (z. B. wenn Markdown Inline-HTML enthält). Entweder wir rendern strikt CommonMark oder wir säubern per `DOMPurify` im Viewer.

## Library- und Rendering-Fragen
- Ich würde `markdown-it` wählen, weil es modular erweiterbar ist (Plugins, Custom Renderer) und gute CommonMark-Abdeckung hat.
- Rendering findet komplett im Frontend statt; wir laden die Markdown-Dateien per Fetch und lassen `markdown-it` im Browser rendern. Das hält die Architektur leichtgewichtig und vermeidet ein Backend.
- Sanitizing mache ich direkt nach dem Rendern mit `DOMPurify`, bevor der HTML-String in den DOM eingesetzt wird.

## Offene Fragen
1. Gibt es bereits Wunschkapitel oder Inhalte, die wir als Beispiel aufsetzen sollen, oder möchtest du erst die Struktur legen?
2. Soll das Projekt später auch offline funktionieren (z. B. als statische Site mit `file://`), oder rechnen wir mit einem lokalen Server?
3. Möchtest du später Optionen für Kapitelprofile (Prüfer/Kunde) direkt im Viewer steuern, oder reicht am Anfang eine einfache Config-Aktivierung in `doc_config`?
4. Sollen Ressourcen wie Bilder ebenfalls in die Config, oder reicht es, sie direkt in den Markdown-Dateien zu referenzieren?

Ich bin gespannt auf deine Antworten und bereit, direkt mit der Viewer-Struktur & der Doc-Config loszulegen.

## Erste Umsetzung
- Struktur & Dateien: `Dokumentation/docs/` mit vier Kapitel-MD, die Frontmatter für Layout-Flaggen enthalten; `doc_config.yaml` listet Projekt- und Kapitelmeta plus `force_new_page_before`.
- Viewer: `Dokumentation/viewer/index.html` lädt via CDN `js-yaml`, `markdown-it` und `DOMPurify`, zeigt Projektname/status, und `docs_viewer.js` lädt die Config, rendert jedes Kapitel via Markdown-It, reinigt mit DOMPurify und packt den Content in `.doc-page`-Container mit CSS für A4 (siehe `viewer.css`).
- Abweichung: habe den Layout-Header innerhalb der Markdown-Dateien gelassen und arbeite mit `splitFrontmatter` in `docs_viewer.js`, damit wir generisch Flags aus Frontmatter (wenn vorhanden) oder Config ziehen und das Markdown selbst sauber rendert.
- Unsicherheiten: Bei sehr langen Kapiteln könnte der reine CSS-Ansatz für A4-Breaks noch feine Nacharbeit brauchen, und wir sollten später prüfen, ob Deklarationen wie `page_break_after` auch explizit im Viewer durchsetzbar sind.

## Iteration 1.1
- Print-Styles: In `viewer/viewer.css` (siehe `viewer/viewer.css:1`) gibt es jetzt klar definierte `@media print`-Regeln, die Header/status verschwinden lassen, Schatten/Ränder entfernen und `page-break`-sichere A4-Boxen liefern; auch `page-break-inside: avoid` für Überschriften, Tabellen und Bilder sowie spezifische Styles für Error-Seiten helfen beim PDF-Druck.
- Flag-Priorität & Logging: `viewer/docs_viewer.js` nutzt `doc_config.yaml` als Primärquelle, loggt verworfene/sichtbare Kapitel (`console.info`) und zeigt pro Kapitel auch Fehler in der UI an (`doc-page--error`), während die Statuszeile den Ladezustand signalisiert (`...status`).
- Print-Test: Beim lokalen Browserdruck wirkt die Seite nun schattenfrei und bekommt saubere Ränder; die CSS-Puffer reichen für aktuelle Inhalte, aber bei sehr langen Textblöcken sollten wir künftig ggf. manuelle `page-break-after`-Marker setzen.

## Iteration 1.2
- Styleguide: Die neue `Runbook/00_Projekteinrichtung/Styleguide_Doku.md` beschreibt Sprache, Struktur, Typographie, Tabellen/Listen, Formeln und Markdown-Konventionen als Referenz für Jameel.
- Viewer-Typographie & Fehlerhandling: `viewer/viewer.css` nutzt jetzt `Century Gothic` mit 12pt Typo, größere h1/h2/h3-Werte und einen `active-chapter`-Zustand, während `viewer/docs_viewer.js` auf `doc_config` als primäre Flag-Quelle setzt, KaTeX/markdown-it-katex für Formeln einbindet, Hash-basierte Kapitel-Links (z. B. `viewer/index.html#chapter=1.1`) honoriert und Fehler sowohl über die Statuszeile als auch per `.doc-page--error` anzeigt.
- Home & Navigation: `index.html`/`home.js`/`home.css` liefern eine Kapitelübersicht, die `doc_config` lädt, sichtbare Kapitel auflistet und Links zum Viewer bereitstellt (`viewer/index.html#chapter=...`). Hash-Parameter werden im Viewer in `appendChapter` ausgewertet, um das gewünschte Kapitel zu scrollen/hervorzuheben.
- Formeln getestet: `docs/1.2_Waermeverteilung.md` enthält jetzt Inline- und Blockformeln für `$Q = \dot{m} \cdot c_p \cdot \Delta T$`, sodass KaTeX-rendering geprüft ist.
- Viewer-Navigation: Der Viewer-Kopf zeigt jetzt eine Home-Schaltfläche und einen Menü-Button, der das neue Kapitelpanel von links aufschiebt; dort lassen sich Kapitel anklicken, die dann gleich scrollen & hervorheben, was die Bedienung deutlich beschleunigt.
- Kapitelpanel: Die Seitenliste gruppiert sich nun automatisch nach Hauptkapiteln (1.x unter 1.0, 2.x unter 2.0 usw.) und zeigt verschachtelte, moderne Einträge im Slide-out. Hover scrollt temporär, Klick setzt die aktive Seite. Die Liste wurde außerdem umgestylt, damit die Einträge wie ein moderner Explorer aussehen.
- User-Guide: `docs/0.0_User-Guide.md` liefert eine kurze Übersicht über Struktur, Dateizwecke, Markdown-Tipps und den Live-Reload-Workflow.
- Grundstruktur: Die `docs/`-Ordner enthält jetzt nur noch die acht Hauptkapitel (`1.0_…` bis `8.0_…`) plus den User-Guide; alle anderen früheren Testdateien wurden entfernt. Jedes Kapitel hat ein einheitliches Frontmatter und der neue `run.py`‑Sync aktualisiert `id/title`/Manifest automatisch beim Start.

## Entscheidungen & Hinweise
- Schriftgrößen: Basis-Fließtext bleibt bei 12pt, h1/h2/h3/Tabellenpuffer wurden im CSS programmiert (20/16/13pt) und der Abstand durch Margins geregelt; die Viewer-Typographie basiert auf `Century Gothic` mit modernen Fallbacks.
- KaTeX/Plugin: Wir nutzen `markdown-it-katex@3.0.0` (requiring `katex@0.16.8` via CDN) direkt im Viewer-Script, damit `$...$`/`$$...$$` ohne Backend gerendert werden.
- Home-Navigation: Das Home-Script baut Links zu `viewer/index.html#chapter=ID` und der Viewer liest `window.location.search`/`window.location.hash`, um das Zielkapitel zu scrollen und per `active-chapter` zu markieren; zusätzlich scrollt ein `setTimeout` nach dem Rendern zum Fokuskapitel.
