from pathlib import Path

docs = {
    "1.1_Ausgangssituation.md": "Ausgangssituation, Prüfungsauftrag, Projektziel.",
    "1.2_Pruefungsauftrag.md": "Prüfungsaufgabe, Aufgabenstellung, Stakeholder.",
    "1.3_Auftragsanalyse_Abgrenzung_Vorgehensweise.md": "Auftragsanalyse mit Abgrenzung und Vorgehensweise.",
    "2.1_Gebaeude_und_Nutzungsbeschreibung.md": "Gebäudeart, Nutzung, Anzahl Ebenen.",
    "2.2_Raumtypen_Solltemperaturen_Betriebszeiten.md": "Raumtypen, Sollwerte und Betriebszeiten.",
    "2.3_Randbedingungen_und_Schnittstellen.md": "Randbedingungen und Schnittstellen zu anderen Gewerken.",
    "3.1_Waermeerzeuger_und_Temperaturniveau.md": "Wärmeerzeugerwahl, Temperaturniveaus und Effizienz.",
    "3.2_Waermeverteilung_Rohrnetz_Verteilerstruktur.md": "Verteilungssystem, Rohrnetz, Verteileranordnung.",
    "3.3_Heizflaechenkonzept_FBH_und_Heizkoerper.md": "Heizflächenplanung für FBH und Heizkörper.",
    "3.4_Regelungs_und_Hydraulikkonzept.md": "Regelungssysteme und hydraulischer Aufbau.",
    "4.1_Ausgangsdaten_Heizlast_Leistungen.md": "Ausgangsdaten, Heizlastberechnung und Leistungen.",
    "4.2_Auslegung_Fussbodenheizung.md": "Dimensionierung der FBH einschließlich Rohrabstände.",
    "4.3_Auslegung_Heizkoerper.md": "Heizkörperauslegung und Volumenströme.",
    "4.4_Heizkreisverteiler_Rohrnetz_hydraulischer_Abgleich.md": "Verteilerstruktur und hydraulischer Abgleich.",
    "4.5_Erstellte_Unterlagen_und_Planuebersicht.md": "Übersicht der erstellten Planunterlagen.",
    "5.1_Waermeerzeuger_Komponenten.md": "Komponentenübersicht Wärmeerzeuger.",
    "5.2_Rohrsysteme_und_Daemmung.md": "Rohrsysteme, Dämmung und Leitungsschema.",
    "5.3_Flaechenheizungssystem_FBH.md": "FBH-Systemaufbau und Regelventile.",
    "5.4_Heizkoerper_und_Sonderheizflaechen.md": "Heizkörper und Sonderflächen.",
    "5.5_Regelungs_und_Sicherheitstechnik.md": "Regelungs- und Sicherheitstechnikübersicht.",
    "6.1_Erfuellung_der_Anforderungen.md": "Erfüllung technischer Anforderungen.",
    "6.2_Technische_und_energetische_Bewertung.md": "Technische und energetische Bewertung.",
    "6.3_Persoenliches_Fazit.md": "Persönliches Fazit mit Lessons Learned.",
    "7.0_Quellen.md": "Normen, Leitfäden und Literaturangaben.",
    "8.1_Pruefungsauftrag_Originalunterlagen.md": "Originalunterlagen zum Prüfungsauftrag.",
    "8.2_Grundrisse_und_Schemata.md": "Grundrisspläne und Schemata.",
    "8.3_Programmausgaben_Auslegung.md": "Programmausgaben und Auslegungsrechnungen.",
    "8.4_Herstellerdatenblaetter.md": "Herstellerdatenblätter.",
    "8.5_Material_und_Bauteillisten.md": "Material- und Bauteillisten.",
    "8.6_Nomenklatur_und_Formelzeichen.md": "Nomenklatur und Formelzeichen.",
    "0.0_User-Guide.md": "User Guide mit Projektüberblick.",
}

docs_dir = Path("docs")
docs_dir.mkdir(exist_ok=True)

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

for name, summary in docs.items():
    path = docs_dir / name
    lines = [
        front,
        f"# {summary}",
        "",
        "Dieser Text ist eine Platzhalterbeschreibung; ergänze die fachlichen Inhalte.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
