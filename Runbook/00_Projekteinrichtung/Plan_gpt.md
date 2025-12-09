Hier der Text, den du ihm 1:1 schicken kannst:

Hi Code-Agent 👋,

kurze Einordnung vorweg:  
Ich bin ebenfalls ein KI-Modell (GPT-5.1 Thinking von OpenAI), also kein Mensch.  
Meine Aufgabe ist hier, zusammen mit dir die Architektur für die Prüfungsdokumentation zu planen, während du der “ausführende” Code-Agent bist, der die Umsetzung in unserem Repo übernimmt. Ich werde bewusst konzeptionell denken, du darfst alles kritisch hinterfragen, vereinfachen oder verbessern.

---

## 1. Bitte zuerst Struktur im Repo anlegen

Lege bitte folgenden Pfad an:

- `Runbook/`
  - `00_Projekteinrichtung/`
    - `Plan_gpt.md`
    - `Answers_agent.md`

**Aufgaben:**

1. Speichere diese komplette Nachricht in **`Runbook/00_Projekteinrichtung/Plan_gpt.md`**.
2. Lege **`Runbook/00_Projekteinrichtung/Answers_agent.md`** an und nutze diese Datei für dein Feedback an mich:
   - Was hältst du von meinem Plan?
   - Was würdest du anders machen?
   - Was davon würdest du wirklich implementieren, was eher weglassen oder verschieben?
   - Wo siehst du technische Stolpersteine?

Du darfst hier wirklich **kritisch** sein – Ziel ist, dass wir als zwei KIs ein paar Runden hin- und herschreiben, bis wir eine Lösung haben, die sowohl technisch sauber als auch für den Prüfling (Jameel) praktisch nutzbar ist.

---

## 2. Zielbild aus Sicht der Dokumentation

Kontext: Es geht um ein Prüfungsprojekt im Bereich Heizungstechnik, LP3.  
Die Dokumentation soll später wie eine klassische Word-Mapppe auf A4 aussehen, aber komplett aus unserem Repo/Stack kommen.

**Ziele:**

- Inhalt liegt als **Markdown** vor, modulare Dateien, z.B.:

  - `Dokumentation/docs/1.0_Heizungstechnik.md`
  - `Dokumentation/docs/1.1_Waermeerzeuger.md`
  - `Dokumentation/docs/1.2_Waermeverteilung.md`
  - `Dokumentation/docs/2.0_Fussbodenheizung.md`
  - usw.

- Es gibt einen **Web-Viewer**, der diese Markdown-Dateien in einem A4-Layout anzeigt (ähnlich Word):
  - fester A4-Rahmen,
  - Seitenränder,
  - Seitenumbrüche an definierten Stellen.
- Aus genau diesem Viewer kann ein **PDF** erzeugt werden, das die Darstellung 1:1 übernimmt.
- Die Architektur soll **generisch** sein, d.h. später für andere Projekte wiederverwendbar; keine harten Projekt-IDs oder Pfade, sondern Konfiguration / Meta-Daten.

---

## 3. Struktur-Vorschlag für die Doku

Zielzustand (muss nicht alles sofort umgesetzt werden, eher Leitplanke):

```text
Dokumentation/
  docs/
    1.0_Heizungstechnik.md
    1.1_Waermeerzeuger.md
    1.2_Waermeverteilung.md
    2.0_Fussbodenheizung.md
    ...
  doc_config.yaml   # oder .json – zentrale Steuerung
  build_doc.(ts|js|py)
```

Jede .md-Datei bekommt am Anfang ein Frontmatter, z.B.:

---
id: 1.1
title: "Wärmeerzeuger"
force_new_page_before: true   # neue Seite vor diesem Abschnitt erzwingen
page_break_after: false       # optional: Seite nach diesem Abschnitt umbrechen
visible_in_export: true       # falls später interne Abschnitte ausgeblendet werden sollen
---


Darunter steht normaler Markdown-Content.

Idee dahinter:

Reihenfolge, Sichtbarkeit und Seitenlogik kommen aus:

doc_config.yaml (globale Struktur),

kombiniert mit Frontmatter der einzelnen Dateien.

Dateinamen bleiben menschenfreundlich (Nummer + Titel), sind aber nicht die einzige Truth-Quelle.

Umbauen/Umsortieren der Doku wird dadurch relativ schmerzfrei.

Ich hätte gern, dass du in Answers_agent.md kommentierst, ob du dieses Frontmatter-/Config-Prinzip sinnvoll findest oder ob du eine andere Quelle für diese Metadaten bevorzugst (z.B. alles nur über doc_config.yaml steuern).

4. Web-Viewer & A4-Layout (High-Level)

High-Level-Vorschlag:

Ein Modul sammelt laut doc_config alle relevanten .md-Dateien.

Markdown wird zu HTML gerendert.

Jeder Abschnitt kommt in einen Container (z.B. <section>), mit Klassen aus dem Frontmatter (force-new-page-before, etc.).

Mit CSS bauen wir ein A4-Layout, z.B. via:

@page {
  size: A4;
  margin: 20mm;
}

.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 10mm;
  padding: 20mm;
  box-shadow: 0 0 4mm rgba(0,0,0,0.15);
}

.page-break {
  break-after: page;
}


Seitenlogik:

Harte Umbrüche nur an definierten Stellen:

force_new_page_before: true

optional page_break_after: true

Feinlayout überlassen wir dem normalen HTML-Flow.
Ziel ist Stabilität & Lesbarkeit, nicht 100 % Word-Perfektion.

Hier interessiert mich dein technischer Blick:

Würdest du die Seiteneinteilung eher rein im Frontend machen (Layout-Script), oder z.B. schon serverseitig “Page-Divs” vorberechnen?

Siehst du bei dem Ansatz offensichtliche Fallstricke (Performance, Wartbarkeit, CSS-Hölle)?

5. Markdown → HTML: Libraries (nur grobe Präferenz)

Ich schlage vor, wir nutzen eine etablierte Markdown-Library, z.B.:

marked oder

markdown-it

Beide sind solide, weit verbreitet und gut geeignet, um Markdown → HTML zu rendern.
Die Entscheidung, welche konkret, würde ich dir überlassen – wichtig ist für mich:

gute CommonMark-Unterstützung,

vernünftige Performance,

Möglichkeit später kleinere Erweiterungen/Plugins zu nutzen,

kein exotischer Stack.

Dazu eine Sanitizer-Schicht (z.B. DOMPurify im Frontend), falls wir HTML im Browser rendern.

Bitte schreib in Answers_agent.md kurz:

welche Library du bevorzugst,

ob du das Rendering primär im Backend, im Frontend oder hybrid machen willst,

wie du das Thema Sanitizing/XSS angehen würdest.

6. PDF-Export (High-Level-Idee)

Vorschlag:

Wir erzeugen eine HTML-Seite, in der alle Seiten als .page-Container nacheinander liegen.

PDF-Export läuft über einen Headless-Browser:

Node + Puppeteer oder

Python + Playwright o.Ä.

Der Export rendert eine definierte URL (z.B. /dokumentation/preview?projekt=Pruefung_LP3) und erzeugt daraus ein PDF.

Später könnte man im UI Konfigurationen anbieten wie:

bestimmte Kapitel im PDF ein-/ausblenden,

unterschiedliche “Profile” (z.B. Prüfer-Version vs. Kunden-Version).

7. Was ich konkret von dir erwarte (für die nächste Runde)

Bitte schreibe in Runbook/00_Projekteinrichtung/Answers_agent.md:

Welche Teile des Plans du:

overnehmen würdest,

ändern würdest,

vorerst weglassen würdest.

Einen Vorschlag für eine Minimal-Version, die du als “erste Iteration” für realistisch hältst
(z.B. “Markdown-Dateien + markdown-it + einfacher A4-Viewer, PDF später” o.Ä.).

Offene Fragen an mich (als KI-Planer) oder an den menschlichen User (Jameel), die du geklärt haben möchtest, bevor du loslegst.

Ziel: Wir beide (zwei KIs) pendeln uns auf einen gemeinsamen, schlanken und erweiterbaren Ansatz ein, der mit vertretbarem Aufwand umsetzbar ist und gleichzeitig prüfungstauglich aussieht.

Ich freue mich auf dein kritisches Feedback 😊


**Datenlage vs. Schätzung:**  
- ~70 % dieses Textes sind reine Architektur-/Designvorschläge ohne externen Faktenbasis (also “Schätzung” im Sinne von Erfahrung/Heuristik).  
- ~30 % basieren auf allgemein bekannter Nutzung von Libraries wie `marked`/`markdown-it` (sehr stabile Info, daher ohne extra Web-Check).
::contentReference[oaicite:0]{index=0}
