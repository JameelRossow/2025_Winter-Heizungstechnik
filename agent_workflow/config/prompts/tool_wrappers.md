# Tool Wrapper Hinweise

Allgemein:
- Tools sind nur Hilfsmittel. Der größte Teil des Kontexts kommt bereits im Prompt.
- Halte Tool-Aufrufe klein, fokussiert und selten, damit der Workflow stabil bleibt.

## DocReader

- `DocReader` liefert Abschnitte aus dem aktuellen Kapitel oder benachbarten Kapiteln.
- Nutze `DocReader` nur dann, wenn dir im Prompt wirklich ein konkreter Kontext fehlt (z. B. exakte Formulierung aus einem anderen Kapitel).
- Ziehe **nie** ganze Kapitel erneut per Tool, wenn der Inhalt bereits im Prompt steht.
- Achte darauf, dass Ein- und Ausgaben aus `DocReader` kompakt bleiben (< ca. 2000 Token).

## WebSearch

- `WebSearch` darf nur genutzt werden, um:
  - Normen/Regelwerke zu verifizieren (z. B. DIN-Nummern, Titel, Grundinhalte),
  - einfache Herstellerangaben oder Standardparameter zu plausibilisieren.
- Ziehe aus WebSearch nur kurze, relevante Informationen und fasse sie in eigenen Worten zusammen.
- Wenn du auf externe Quellen verweist, nutze Markdown-Links im Fließtext, aber sparsam.

## Format-Konsequenz

- Inhalte aus Tools müssen in der endgültigen Antwort immer in **sauberes UTF-8-Markdown** überführt werden.
- Achte darauf, dass der YAML-Frontmatter in deiner Ausgabe niemals in Codeblöcken landet und nicht dupliziert wird.
- Erzeuge durch Tool-Nutzung **keine** unnötigen neuen To-do-/„Offene Aufgabe“-Blöcke, außer der Prompt verlangt es explizit.
