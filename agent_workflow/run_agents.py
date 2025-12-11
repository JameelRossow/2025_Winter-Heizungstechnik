from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from agents import Agent, Runner, trace
from agents.model_settings import ModelSettings
from openai.types.shared import Reasoning

try:  # pragma: no cover - optional convenience
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional convenience
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()

from services.document_service import DocumentService

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
CONFIG_PATH = BASE_DIR / "config" / "agents.yaml"
LOG_DIR = BASE_DIR / "logs"


@dataclass
class AgentSpec:
    key: str
    name: str
    model: str | None
    instructions: str
    reasoning_effort: str | None = None
    verbosity: str | None = None

    def build(self) -> Agent:
        reasoning_obj = None
        if self.reasoning_effort:
            reasoning_obj = Reasoning(effort=self.reasoning_effort)

        settings = ModelSettings(reasoning=reasoning_obj, verbosity=self.verbosity)
        return Agent(
            name=self.name,
            instructions=self.instructions,
            model=self.model,
            model_settings=settings,
        )


def load_agent_specs(config_path: Path) -> dict[str, AgentSpec]:
    config_data = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    agents_section = config_data.get("agents", {})
    specs: dict[str, AgentSpec] = {}
    for key, data in agents_section.items():
        prompt_path = (config_path.parent / data["instructions_path"]).resolve()
        instructions = prompt_path.read_text(encoding="utf-8")
        reasoning_cfg = data.get("reasoning")
        reasoning_effort = None
        if isinstance(reasoning_cfg, dict):
            reasoning_effort = reasoning_cfg.get("effort")
        verbosity = data.get("verbosity")
        specs[key] = AgentSpec(
            key=key,
            name=data.get("name", key),
            model=data.get("model"),
            instructions=instructions,
            reasoning_effort=reasoning_effort,
            verbosity=verbosity,
        )
    return specs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mehragentenlauf für Runbook-Kapitel")
    parser.add_argument("--chapter", "-c", help="Pfad oder Name des Kapitels")
    parser.add_argument("--goal", help="Kurzbeschreibung des Ziels")
    parser.add_argument("--docs-catalog", help="Optionales docs.yaml zur Namensauflösung")
    parser.add_argument("--max-rounds", type=int, help="Maximale Runden pro Lauf")
    parser.add_argument("--log", help="Eigener Log-Pfad (Standard: agent_workflow/logs/<timestamp>.md)")
    parser.add_argument(
        "--config",
        help="YAML mit Standardwerten (default: agent_workflow/run_agents.yaml)",
        default=str((BASE_DIR / "run_agents.yaml").resolve()),
    )
    return parser.parse_args()


def load_catalog(path: Path) -> list[dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "chapters" in data:
        entries = data["chapters"]
    elif isinstance(data, list):
        entries = data
    else:
        entries = []
    return [entry for entry in entries if isinstance(entry, dict)]


def resolve_chapter_path(chapter_value: str, catalog_path: Path | None) -> Path:
    direct = Path(chapter_value)
    if direct.exists():
        return direct.resolve()
    if catalog_path and catalog_path.exists():
        for entry in load_catalog(catalog_path):
            if entry.get("name") == chapter_value:
                return (PROJECT_ROOT / entry["path"]).resolve()
    return (PROJECT_ROOT / chapter_value).resolve()


def build_expert_prompt(goal: str, chapter_content: str, revision_notes: str) -> str:
    revision_section = revision_notes.strip() or "Keine bisherigen Rückmeldungen."
    chapter_section = chapter_content.strip() or "Noch kein vorhandener Text."
    return (
        f"## Ziel\n{goal}\n\n"
        f"## Aktueller Dokumentenstand\n{chapter_section}\n\n"
        f"## Rückmeldungen aus vorigen Runden\n{revision_section}\n\n"
        "Erstelle eine vollständige, strukturierte Markdown-Fassung in fachlich sauberem Deutsch."
    )


def build_critic_prompt(
    goal: str,
    chapter_content: str,
    expert_output: str,
    previous_revision: str,
) -> str:
    previous_section = previous_revision.strip() or "Keine offenen Punkte."
    chapter_section = chapter_content.strip() or "Noch kein vorhandener Text."
    return (
        f"## Ziel\n{goal}\n\n"
        f"## Aktueller Dokumentenstand\n{chapter_section}\n\n"
        f"## Vorschlag des Experten\n{expert_output}\n\n"
        f"## Bisherige Hinweise\n{previous_section}\n\n"
        "Prüfe den Text kritisch, formuliere eine finale Version und entscheide mit STATUS-Zeile."
    )


def extract_status(response: str) -> tuple[str, str]:
    lines = response.rstrip().splitlines()
    while lines and not lines[-1].strip():
        lines.pop()
    status = "REVISION_NEEDED"
    if lines:
        tail = lines[-1].strip()
        if tail.upper().startswith("STATUS:"):
            status = tail.split(":", 1)[1].strip().upper() or "REVISION_NEEDED"
            lines = lines[:-1]
    body = "\n".join(lines).strip()
    return status, body


def build_log(conversation: list[dict[str, Any]], diff: str, log_meta: dict[str, str]) -> str:
    lines: list[str] = [f"# Agentenlauf {log_meta['timestamp']}"]
    for key, value in log_meta.items():
        if key == "timestamp":
            continue
        lines.append(f"- {key}: {value}")
    for entry in conversation:
        lines.append("")
        lines.append(f"## Runde {entry['round']} – {entry['role']}")
        lines.append("### Prompt")
        lines.append("`````text")
        lines.append(entry["prompt"])
        lines.append("`````")
        lines.append("### Antwort")
        lines.append("`````markdown")
        lines.append(entry["response"])
        lines.append("`````")
        if entry.get("status"):
            lines.append(f"STATUS erkannt: {entry['status']}")
    if diff:
        lines.append("")
        lines.append("## Diff")
        lines.append("`````diff")
        lines.append(diff)
        lines.append("`````")
    return "\n".join(lines)


def determine_log_path(cli_value: str | None, timestamp: str) -> Path:
    if cli_value:
        path = Path(cli_value)
        return (path if path.is_absolute() else PROJECT_ROOT / path).resolve()
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    return LOG_DIR / f"{timestamp}.md"


def ensure_max_rounds(value: int) -> int:
    if value < 1:
        raise ValueError("--max-rounds muss mindestens 1 sein")
    return value


def summarize_env_hint() -> str:
    required = ["OPENAI_API_KEY"]
    missing = [var for var in required if not os.getenv(var)]
    if missing:
        return f"Fehlende Umgebungsvariablen: {', '.join(missing)}"
    return "OPENAI_API_KEY gefunden."


def load_run_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data or {}


def resolve_runtime_value(cli_value: Any, config: dict[str, Any], key: str, fallback: Any = None) -> Any:
    if cli_value is not None:
        return cli_value
    return config.get(key, fallback)


async def run_workflow() -> None:
    args = parse_args()
    config_path = Path(args.config).resolve() if args.config else None
    config_data = load_run_config(config_path) if config_path else {}

    chapter_value = resolve_runtime_value(args.chapter, config_data, "chapter")
    if not chapter_value:
        raise SystemExit("Kein Kapitel angegeben (CLI --chapter oder run_agents.yaml).")
    goal_value = resolve_runtime_value(args.goal, config_data, "goal")
    docs_catalog_value = resolve_runtime_value(args.docs_catalog, config_data, "docs_catalog")
    max_rounds_value = resolve_runtime_value(args.max_rounds, config_data, "max_rounds", 3)
    log_value = resolve_runtime_value(args.log, config_data, "log")

    max_rounds = ensure_max_rounds(int(max_rounds_value))
    catalog_path = Path(docs_catalog_value).resolve() if docs_catalog_value else None
    chapter_path = resolve_chapter_path(chapter_value, catalog_path)
    goal = goal_value or chapter_path.stem.replace("_", " ")

    specs = load_agent_specs(CONFIG_PATH)
    try:
        expert_agent = specs["expert"].build()
        critic_agent = specs["critic"].build()
    except KeyError as exc:
        raise SystemExit(f"Fehlende Agentendefinition: {exc}") from exc

    timestamp = dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    log_path = determine_log_path(log_value, timestamp)

    conversation: list[dict[str, Any]] = []
    final_status = "STATUS: RUECKFRAGE_FUER_NUTZER"
    diff_text = ""
    final_content: str | None = None
    revision_notes = ""

    doc_service = DocumentService(chapter_path)
    with trace("Dokumentations-Loop"):
        with doc_service:
            original_content = doc_service.load()
            doc_service.backup(original_content)

            for round_index in range(1, max_rounds + 1):
                expert_prompt = build_expert_prompt(goal, original_content, revision_notes)
                expert_result = await Runner.run(expert_agent, expert_prompt)
                expert_output = str(expert_result.final_output).strip()
                conversation.append(
                    {
                        "round": round_index,
                        "role": "Experte",
                        "prompt": expert_prompt,
                        "response": expert_output,
                    }
                )

                critic_prompt = build_critic_prompt(goal, original_content, expert_output, revision_notes)
                critic_result = await Runner.run(critic_agent, critic_prompt)
                critic_output = str(critic_result.final_output).strip()
                status, critic_body = extract_status(critic_output)
                conversation.append(
                    {
                        "round": round_index,
                        "role": "Kritiker",
                        "prompt": critic_prompt,
                        "response": critic_output,
                        "status": status,
                    }
                )

                if status == "OK":
                    final_content = critic_body
                    doc_service.write(final_content)
                    diff_text = DocumentService.make_diff(
                        original_content,
                        final_content,
                        fromfile=str(chapter_path),
                        tofile=str(chapter_path),
                    )
                    final_status = "STATUS: OK"
                    break

                revision_notes = critic_body or "Bitte alle Punkte präzisieren."
                if round_index == max_rounds:
                    final_status = "STATUS: RUECKFRAGE_FUER_NUTZER"
                    break

    log_meta = {
        "timestamp": timestamp,
        "kapitel": str(chapter_path),
        "ziel": goal,
        "status": final_status,
        "backup": str(doc_service.backup_path),
    }
    log_content = build_log(conversation, diff_text, log_meta)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(log_content, encoding="utf-8", newline="\n")

    print(f"Log gespeichert unter: {log_path}")
    print(f"Finaler Status: {final_status}")
    print(summarize_env_hint())


if __name__ == "__main__":
    asyncio.run(run_workflow())
