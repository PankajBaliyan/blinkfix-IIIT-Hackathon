import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..models.schemas import CrashPayload
from .log_store import format_log_line

# Anything that could close or fake one of our own tags is stripped from untrusted text.
_TAG = re.compile(r"</?\s*(evidence|incident|stack_trace|source|logs|recent_commits|imports|repository|blame|traffic)\b[^>]*>", re.I)


def _clean(text: Optional[str]) -> str:
    return _TAG.sub("[tag removed]", text or "")


def _commit_line(c: Dict[str, Any]) -> str:
    pr = f"PR #{c['prNumber']}" if c.get("prNumber") else "no PR"
    return f"{c.get('hash')} | {c.get('author')} | {(c.get('timestamp') or '')[:10]} | {pr} | {_clean(c.get('message'))}"


@dataclass
class SharedTriage:
    """One model call that answered for all five agents. `sections` is None if the call failed."""
    sections: Optional[Dict[str, Any]]
    latency_ms: int
    model: str
    error: Optional[str] = None


@dataclass
class Evidence:
    """Everything the agents are allowed to know about one crash."""
    payload: CrashPayload
    context: Dict[str, Any]
    logs: List[Dict[str, Any]] = field(default_factory=list)
    source: Optional[Dict[str, Any]] = None
    imports: List[str] = field(default_factory=list)
    # Set when the agents share one model call instead of making their own.
    shared: Optional[SharedTriage] = None
    # Where the source came from: "github" or "local".
    code_origin: Optional[str] = None

    def render(self) -> str:
        p = self.payload
        parts = [
            "<evidence>",
            "<incident>",
            f"service: {p.service} ({p.environment})",
            f"request: {p.method or '-'} {p.route or '-'} (request id {p.requestId or '-'})",
            f"error: {_clean(p.message)}",
            f"location: {p.file}:{p.line} in {p.functionName or 'unknown'}()",
            "</incident>",
        ]
        traffic = self.context.get("traffic")
        if traffic and traffic.get("total"):
            parts.append(
                f"<traffic>{traffic['failed']} of {traffic['total']} requests to {p.method} {p.route} "
                f"ended in an unhandled error in the last {traffic['window_minutes']} minutes</traffic>"
            )
        if p.stackTrace:
            parts += ["<stack_trace>", _clean(p.stackTrace).rstrip(), "</stack_trace>"]

        if self.source:
            width = len(str(self.source["startLine"] + len(self.source["lines"])))
            lines = []
            for i, text in enumerate(self.source["lines"]):
                number = self.source["startLine"] + i
                marker = ">>" if number == self.source["failingLine"] else "  "
                lines.append(f"{marker} {number:>{width}} | {_clean(text)}")
            parts += [f'<source file="{self.source["file"]}" failing_line="{self.source["failingLine"]}">'] + lines + ["</source>"]
        if self.imports:
            parts += ["<imports>", *[_clean(i) for i in self.imports], "</imports>"]

        if self.logs:
            parts.append("<logs>")
            for row in self.logs[-20:]:
                mine = p.requestId and row["request_id"] == p.requestId
                parts.append(f"{'>' if mine else ' '} {_clean(format_log_line(row))}")
            parts.append("</logs>")

        repo = self.context.get("repository")
        if repo:
            head = (self.context.get("deployment") or {}).get("headSha")
            parts.append(f"<repository>{repo} on {self.context.get('branch')}" + (f" (head {head})" if head else "") + "</repository>")
        github = self.context.get("github") or {}
        if github.get("notes"):
            parts.append("<repository>GitHub data missing: " + "; ".join(_clean(n) for n in github["notes"]) + "</repository>")

        blame = self.context.get("blame")
        if blame:
            parts += ["<blame>", f"Line {p.line} was last changed by: {_commit_line(blame)}", "</blame>"]

        commits = self.context.get("recentCommits", [])[:5]
        if commits:
            parts.append("<recent_commits>")
            parts += [_commit_line(c) for c in commits]
            parts.append("</recent_commits>")

        parts.append("</evidence>")
        return "\n".join(parts)
