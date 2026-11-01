from typing import Any, Dict, Optional
from ..config import BASE_DIR

APP_DIR = (BASE_DIR / "app").resolve()


def read_source_snippet(file: str, line: int, context: int = 4) -> Optional[Dict[str, Any]]:
    """Reads the lines around a failing line from the service's own source. None if it cannot be read."""
    try:
        path = (BASE_DIR / file).resolve()
        # Only the application's own code is ever read.
        if not path.is_relative_to(APP_DIR) or not path.is_file():
            return None
        all_lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, ValueError):
        return None

    if not 1 <= line <= len(all_lines):
        return None
    start = max(1, line - context)
    end = min(len(all_lines), line + context)
    return {
        "file": file,
        "startLine": start,
        "failingLine": line,
        "lines": all_lines[start - 1:end],
    }


def read_failing_line(file: str, line: int) -> Optional[str]:
    snippet = read_source_snippet(file, line, context=0)
    return snippet["lines"][0] if snippet else None
