<div style="background:#020617; margin:0; padding:24px 0;">

<svg viewBox="0 0 640 160"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     role="img" aria-labelledby="title desc"
     style="display:block; margin:0 auto; width:100%; max-width:960px; height:auto;">
  <title id="title">Winter 2025 – Heizungstechnik LP3</title>
  <desc id="desc">Logo mit Haus, Fußbodenheizung, Heizkörper und Wärmepumpe für eine LP3-Heizungsplanung</desc>

  <defs>
    <linearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="40%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <linearGradient id="fbhGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="50%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>

    <linearGradient id="radiatorGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e5f2ff"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>

    <filter id="iconGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.02
                0 0 0 0 0.55
                0 0 0 0 0.90
                0 0 0 0.7 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="640" height="160" fill="#ffffff"/>

  <rect x="16" y="16" width="608" height="128" rx="20" fill="url(#cardGradient)"/>

  <g transform="translate(40,30)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="96" height="100" rx="18" fill="#020617" stroke="#1f2937" stroke-width="2"/>

    <g transform="translate(10,10)">
      <path d="M8 26 L32 6 L56 26"
            fill="none" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

      <rect x="12" y="26" width="40" height="40" rx="4" fill="none" stroke="#e5e7eb" stroke-width="2"/>

      <g transform="translate(14,48)">
        <path d="M0 0 H28 V8 H4 V16 H24"
              fill="none" stroke="url(#fbhGradient)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>

      <g transform="translate(36,30)">
        <rect x="0" y="0" width="10" height="20" rx="2" fill="url(#radiatorGradient)" stroke="#e5e7eb" stroke-width="0.8"/>
        <rect x="-2" y="18" width="14" height="3" rx="1.5" fill="#9ca3af"/>
      </g>

      <g transform="translate(52,16)">
        <circle cx="0" cy="0" r="4.2" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="0.8"/>
        <path d="M0 -2.2 L0 1.2" stroke="#9ca3af" stroke-width="0.9" stroke-linecap="round"/>
        <circle cx="0" cy="2.3" r="0.9" fill="#f97316"/>
      </g>

      <g transform="translate(60,40)">
        <rect x="0" y="6" width="18" height="18" rx="3" fill="#020617" stroke="#e5e7eb" stroke-width="1"/>
        <circle cx="9" cy="15" r="5.5" fill="#020617" stroke="#38bdf8" stroke-width="1"/>
        <path d="M9 10 L11.8 14 L9 17.5 L6.2 14 Z"
              fill="#38bdf8" opacity="0.9"/>
        <path d="M0 15 H-6"
              fill="none" stroke="#e5e7eb" stroke-width="1.2" stroke-linecap="round"/>
      </g>
    </g>
  </g>

  <g transform="translate(160,52)"
     font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">

    <text x="0" y="0" font-size="12" letter-spacing="0.16em" fill="#9ca3af">
      WINTER 2025 · ABSCHLUSSPRÜFUNG
    </text>

    <text x="0" y="32" font-size="30" font-weight="600" fill="#f9fafb">
      LP3 HEIZUNGSTECHNIK
    </text>

    <text x="0" y="66"
          font-size="20"
          fill="#e5e7eb"
          font-style="italic"
          font-weight="300"
          letter-spacing="0.5px">
      erstellt von Jameel Rossow
    </text>

  </g>
</svg>

</div>

# Winter 2025 – Heizungstechnik (Entwurfsplanung LP3)

## Dokumentation zur Abschlussprüfung – TGA-Systemplanung Heizung

Dieses Repository enthält die vollständige Projektstruktur meiner Abschlussprüfung im Schwerpunkt Heizungstechnik (LP3 – Entwurfsplanung).  
Anstatt die Unterlagen in statische Word-Formulare zu pressen, setze ich auf einen modernen, reproduzierbaren Workflow:  
Agenten generieren Rohtexte, Skripte validieren und konsolidieren Inhalte, und der Viewer stellt alles sauber als Markdown-„Seiten“ dar.  
So kann ich mich auf das Wesentliche konzentrieren: Systemkonzept, Berechnungen und technische Argumentation.

## 📁 Projektstruktur im Überblick
| Bereich | Zweck |
| --- | --- |
| `agent_workflow` | Enthält alle Agent-Prompts, Run-Konfigurationen und Tool-Wrapper. Damit lassen sich Text-, Analyse- und Dokumentationsschritte reproduzierbar ausführen. |
| `docs` / `documents4docs` | Exportierte MD-/PDF-Versionen, Assets und Zwischenstände, bevor sie in die finale Abgabe übernommen werden. |
| `Runbook` | Zentrale Regeln, Workflows, Styleguides und Guardrails für alle automatischen Schritte (Viewer, Agenten, Skripte). |
| `scripts` | Kleine Hilfsprogramme zum Generieren, Prüfen, Zusammenführen und Aufräumen – alles, was repetitive Aufgaben reduziert. |
| `viewer` | HTML/CSS/JS-Frontend zur lokalen Ansicht der einzelnen Markdown-Kapitel und zur Vorbereitung für GitHub Pages. |
| `commit` / `commit.py` | Automatisiertes Commit-System: erzeugt strukturierte Commit-Messages und dokumentiert Agent-Iterationen. |
| `.venv`, `.env`, `run.py`, `stop.py` | Technische Basis: virtuelle Umgebung, Environment-Variablen sowie Start-/Stop-Skripte für den Agent-Stack. |

## 🌐 Projekt-Viewer (GitHub Pages)
Die Dokumentation kann direkt hier betrachtet werden:  
👉 https://jameelrossow.github.io/2025_Winter-Heizungstechnik/

## ℹ️ Ziel dieses Repositories
Dieses Repo dient als:
- Arbeits-, Dokumentations- und Datenbasis für die gesamte LP3-Entwurfsplanung
- Entwicklungsumgebung für den agentenbasierten Dokumentations-Workflow
- Ablage der finalen prüfungsrelevanten Unterlagen (Pläne, Tabellen, MD-Kapitel, Anhänge)

Alle Inhalte sind so strukturiert, dass sie versionierbar, nachvollziehbar und jederzeit reproduzierbar bleiben.
