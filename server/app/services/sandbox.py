import ast
import asyncio
import json
import logging
import os
import shutil
import sys
import tempfile
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import BASE_DIR
from ..models.schemas import CrashPayload

logger = logging.getLogger("blinkfix.sandbox")

RUNNER = Path(__file__).with_name("sandbox_runner.py")
TIMEOUT_S = 30

# A fix is a few lines that replace a failing line. It has no business doing any of this.
_FORBIDDEN_NAMES = {
    "eval", "exec", "compile", "open", "__import__", "input", "breakpoint", "globals", "locals", "vars",
    "os", "sys", "subprocess", "socket", "shutil", "pathlib", "importlib", "ctypes", "builtins",
    "pickle", "marshal", "threading", "multiprocessing", "signal", "requests", "httpx", "urllib",
}


def unsafe_reason(code: str) -> Optional[str]:
    """Why a patch must not be run, or None if it looks safe.

    Patches come from a language model reading untrusted crash data, so before one is executed it
    is checked for imports, process and file access, and reflection tricks.
    """
    try:
        tree = ast.parse(textwrap.dedent(code))
    except SyntaxError:
        return None  # not valid code: it is rejected by the syntax check instead
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return "it adds an import"
        if isinstance(node, ast.Name) and node.id in _FORBIDDEN_NAMES:
            return f"it uses `{node.id}`"
        if isinstance(node, ast.Attribute) and node.attr.startswith("__") and node.attr.endswith("__"):
            return f"it reaches into `{node.attr}`"
    return None


@dataclass
class SandboxRun:
    imported: bool = False
    import_error: Optional[str] = None
    replay: Optional[Dict[str, Any]] = None
    tests: Optional[Dict[str, Any]] = None
    error: Optional[str] = None   # the sandbox itself failed
    timed_out: bool = False


def module_name(file: str) -> str:
    return file[:-3].replace("/", ".") if file.endswith(".py") else file


def has_tests() -> bool:
    return (BASE_DIR / "tests").is_dir()


async def run_in_sandbox(payload: CrashPayload, file_text: str, run_tests: bool = True) -> SandboxRun:
    """Runs `file_text` as the failing file inside a throwaway copy of the service."""
    root = Path(tempfile.mkdtemp(prefix="blinkfix-sandbox-"))
    try:
        ignore = shutil.ignore_patterns("__pycache__", "*.pyc")
        shutil.copytree(BASE_DIR / "app", root / "app", ignore=ignore)
        if run_tests and has_tests():
            shutil.copytree(BASE_DIR / "tests", root / "tests", ignore=ignore)
        (root / payload.file).write_text(file_text, encoding="utf-8")

        job = {
            "root": str(root),
            "module": module_name(payload.file),
            "run_tests": run_tests and has_tests(),
            "request": {
                "method": payload.method or "GET",
                "path": payload.route,
                "query": payload.queryString,
                "body": payload.requestBody,
            } if payload.route else None,
        }
        # A clean environment: no API keys, no tokens, nothing from the server's own settings.
        env = {"PATH": os.environ.get("PATH", ""), "PYTHONDONTWRITEBYTECODE": "1"}
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-I", str(RUNNER),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            cwd=str(root), env=env,
        )
        try:
            out, err = await asyncio.wait_for(proc.communicate(json.dumps(job).encode()), timeout=TIMEOUT_S)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return SandboxRun(timed_out=True, error=f"timed out after {TIMEOUT_S}s")

        line = next((l for l in reversed(out.decode(errors="replace").splitlines()) if l.startswith("RESULT:")), None)
        if line is None:
            tail = (err.decode(errors="replace").strip().splitlines() or ["no output"])[-1][:200]
            return SandboxRun(error=f"the sandbox produced no result ({tail})")
        data = json.loads(line[len("RESULT:"):])
        return SandboxRun(
            imported=data["imported"], import_error=data["import_error"], replay=data["replay"], tests=data["tests"]
        )
    except Exception as e:  # noqa: BLE001 - the sandbox must never take the incident down with it
        logger.exception("Sandbox failed")
        return SandboxRun(error=f"{type(e).__name__}: {e}"[:200])
    finally:
        shutil.rmtree(root, ignore_errors=True)
