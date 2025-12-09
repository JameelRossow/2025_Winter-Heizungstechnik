# Styleguide – Dokumentation Prüfungsprojekt Heizungstechnik LP3

Ziel dieses Styleguides ist es, die Dokumentation konsistent, gut lesbar und prüfungstauglich zu halten, ohne uns unnötig einzuschränken.  
Die Regeln sind Leitplanken – im Zweifel gilt: Lesbarkeit und Klarheit gehen vor Dogma.

---

## 1. Sprache & Ton

- **Sprache:** Deutsch.
- **Perspektive:** Sachlich, in der Regel neutrale oder „wir“-Form (z. B. „In diesem Kapitel betrachten wir…“).
- **Zeitform:** Möglichst Präsens, außer bei rückblickenden Beschreibungen („In LP2 wurde … festgelegt“).
- **Stil:** Klar, knapp, technisch. Keine Umgangssprache, aber auch keine übertriebenen Schachtelsätze.

---

## 2. Dokumentstruktur (Kapitel)

- Kapitel werden in **Einzeldateien** in `docs/` geführt (z. B. `1.0_Heizungstechnik_Einleitung.md`).
- Die **logische Reihenfolge** und Sichtbarkeit kommen aus `doc_config.yaml` (Single Source of Truth).
- Pro Kapitel empfiehlt sich dieser grobe Aufbau (wenn sinnvoll):
  1. Kurzbeschreibung / Ziel des Kapitels
  2. Randbedingungen / Eingangsdaten
  3. Varianten / Überlegungen
  4. Entscheidung und Begründung
  5. Ergebnisse / Kennwerte (ggf. als Tabelle)
  6. Quellen / Normen / Verweise

Nicht jedes Kapitel braucht alle Punkte – aber das Schema dient als Orientierung.

---

## 3. Typographie & Layout

Die konkrete Umsetzung erfolgt im Viewer-CSS, aber inhaltlich gilt:

- **Schriftfamilie:**  
  - Primär: `Century Gothic`  
  - Fallbacks: system-ui / „moderne“ Sans-Serif (z. B. Segoe UI).
- **Grundschrift (Fließtext):**
  - Größe: ca. 11–12 pt
  - Zeilenabstand: ~1,3–1,4
  - Absätze durch Abstand, **nicht** durch Leerzeile-Lawinen.

### 3.1 Überschriften-Hierarchie

- `#`   → Kapitelhaupttitel (h1)
- `##`  → Abschnittsebene (h2)
- `###` → Unterabschnitt (h3)

Dabei:

- Pro Datei genau **einen** `#`-Titel (der Kapiteltitel).
- Überschriften möglichst **sprechend** und kurz.
- Keine „optischen“ Überschriften nur zum Abstand – wenn nötig, lieber einen Absatz mit **Fettschrift** nutzen.

### 3.2 Meta-Text

Meta- oder Kommentartext (z. B. Hinweise an Prüfer oder interne Notizen, sofern überhaupt im Export sichtbar) wird:

- als **kursiver Text** oder
- als Zitatblock (`> Hinweis: …`) dargestellt.

---

## 4. Seitenränder & Abstände

Die A4-Seitenränder werden im Viewer festgelegt, orientiert an einem Word-Dokument:

- Innenränder in `.doc-page`:
  - oben/unten: ca. 20 mm
  - links: ca. 25 mm (Bindung)
  - rechts: ca. 20 mm
- Zwischen Überschriften und nachfolgenden Absätzen:
  - nach `h1`: etwas mehr Abstand
  - nach `h2`/`h3`: moderater Abstand
- Bilder und Tabellen erhalten einen kleinen vertikalen Puffer vor/nach dem Element.

Genaues Tuning erfolgt im CSS; wichtig ist, den Text nicht „bis ganz an den Rand“ zu quetschen.

---

## 5. Listen, Tabellen & Einheiten

### 5.1 Listen

- Verwendung von Markdown-Listen (`-`, `1.`).
- Möglichst kurze Listenpunkte, keine halben Romane pro Bullet.
- Verschachtelung nur, wenn es wirklich nötig ist.

### 5.2 Tabellen

- Tabellen für Kennwerte, Parameter, Vergleich von Varianten.
- Einheiten gehören **in die Kopfzeile**, z. B.:

  | Größe               | Symbol | Wert  | Einheit |
  |---------------------|--------|-------|---------|
  | Norm-Außentemperatur | T\_e,N | -12  | °C      |

- Keine überkomplexen Tabellen – im Zweifel mehrere kleinere Tabellen statt einer Monster-Matrix.

---

## 6. Formeln

Formeln werden in Markdown mithilfe von **LaTeX-Syntax** geschrieben und vom Viewer gerendert.

- **Inline-Formeln:**  
  `Die Heizleistung ergibt sich aus $Q = \\dot{m} \\cdot c_p \\cdot \\Delta T$.`
- **Block-Formeln:**  

  ```markdown
  $$
  Q = \dot{m} \cdot c_p \cdot \Delta T
  $$
  ```

**Konventionen:**  

Häufige Größen:  

$\dot{Q}$ für Wärmestrom  

$c_p$ für spezifische Wärmekapazität  

$\Delta T$ für Temperaturdifferenz

Wenn sinnvoll, kurze Beschreibung unter die Formel, z. B.:

mit $\dot{m}$ … Massenstrom, $c_p$ … spezifische Wärmekapazität, $\Delta T$ … Temperaturhub

---

## 7. Quellen & Normen

Quellen werden möglichst vollständig angegeben, z. B.:

**Normen:**  
DIN EN 12831-1:2017-09, Heizlastberechnung – Teil 1, Abschnitt 4.2

**Leitfäden/Unterlagen:**  
VDI 6026:2022-08, Technische Dokumentation – Kapitel 6

Bei Internetquellen:  
Titel, Autor/Institution, URL, Abrufdatum.

Im Fließtext genügen Kurzverweise, am Ende des Kapitels kann eine kurze Quellenliste stehen.

---

## 8. Technische Markdown-Konventionen

- Möglichst kein eingebettetes HTML im Markdown, außer wenn wirklich notwendig (z. B. für Sonderfälle).
- Keine inline-CSS-Stile im Markdown – Layout-Entscheidungen gehören ins CSS.
- Für Hinweise/Warnings:

  > Hinweis: …

  > Achtung: … (nur wenn wirklich sicherheits- oder prüfungsrelevant).

---

## 9. Flexibilität

Dieser Styleguide ist bewusst nicht komplett starr.  
Wenn ein Kapitel aus fachlichen Gründen eine leicht andere Form braucht, ist das in Ordnung – solange:

- der Text gut lesbar ist,
- die Einheiten klar sind,
- Formeln konsistent geschrieben sind,
- Quellen nachvollziehbar angegeben werden.
