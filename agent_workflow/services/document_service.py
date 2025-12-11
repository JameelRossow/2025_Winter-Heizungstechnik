from __future__ import annotations

import time
from dataclasses import dataclass
from difflib import unified_diff
from pathlib import Path
from typing import Iterable


@dataclass
class DocumentService:
    """Utility to read, lock, back up, and write chapter files in UTF-8."""

    chapter_path: Path
    lock_timeout: float = 10.0
    poll_interval: float = 0.5

    def __post_init__(self) -> None:
        self.chapter_path = self.chapter_path.resolve()
        self.lock_path = self.chapter_path.with_suffix(self.chapter_path.suffix + ".lock")
        self.backup_path = self.chapter_path.with_suffix(self.chapter_path.suffix + ".bak")
        self._lock_acquired = False

    def acquire_lock(self) -> None:
        """Create a simple lock file to avoid concurrent sessions."""
        start = time.time()
        while self.lock_path.exists():
            if time.time() - start > self.lock_timeout:
                raise TimeoutError(f"Could not acquire lock for {self.chapter_path}")
            time.sleep(self.poll_interval)
        self.lock_path.write_text("locked", encoding="utf-8", newline="\n")
        self._lock_acquired = True

    def release_lock(self) -> None:
        if self._lock_acquired and self.lock_path.exists():
            self.lock_path.unlink()
        self._lock_acquired = False

    def load(self) -> str:
        return self.chapter_path.read_text(encoding="utf-8")

    def backup(self, content: str | None = None) -> None:
        if content is None:
            content = self.load()
        self.backup_path.write_text(content, encoding="utf-8", newline="\n")

    def write(self, new_content: str) -> None:
        self.chapter_path.write_text(new_content, encoding="utf-8", newline="\n")

    @staticmethod
    def make_diff(old: str, new: str, fromfile: str, tofile: str) -> str:
        diff_iter: Iterable[str] = unified_diff(
            old.splitlines(keepends=True),
            new.splitlines(keepends=True),
            fromfile=fromfile,
            tofile=tofile,
        )
        return "".join(diff_iter)

    def __enter__(self) -> "DocumentService":
        self.acquire_lock()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        self.release_lock()
