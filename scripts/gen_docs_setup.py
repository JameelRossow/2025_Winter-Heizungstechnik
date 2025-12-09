from pathlib import Path

files = [
    ("1.0_Ausgangssituation_Pruefungsauftrag_und_Vorgehensweise.md", "Ausgangssituation des Projekts, Prüfungsauftrag und Vorgehensweise."),
    ("2.0_Grundlagen_Gebaeude_Nutzung_und_Randbedingungen.md", "Grundlagen zu Gebäude, Nutzung, Raumtypen und Randbedingungen."),
    ("3.0_Systemkonzept_Heizung.md", "Systemkonzept der Heizung: Wärmeerzeuger, Verteilung und Regelung."),
    ("4.0_Entwurfsplanung_und_Auslegung.md", "Entwurfsplanung mit Heizlasten, FBH- und Heizkörperauslegung."),
    ("5.0_Komponenten_und_Herstellerfestlegung.md", "Komponenten- und Herstellerfestlegung inklusive Bauteile."),
    ("6.0_Auftragsabschluss_Bewertung_und_Fazit.md", "Auftragsabschluss, Bewertung, Lessons Learned."),
    ("7.0_Quellen.md", "Normen, Leitfäden und Literaturquellen."),
    ("8.0_Anhang.md", "Anhang mit Dokumenten, Grundrissen, Programmausgaben und Listen."),
]

front = """---
status: ""
id: ""
title: ""
layout: "A4"
force_new_page_before: true
page_break_after: true
visible_in_viewer: true
---

"""

docs_dir = Path("docs")
docs_dir.mkdir(exist_ok=True)
for filename, summary in files:
    path = docs_dir / filename
    path.write_text(f"{front}# {summary}\n\n{summary} (Inhalt noch zu ergänzen.)\n", encoding="utf-8")
