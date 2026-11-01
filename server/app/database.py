import sqlite3
import json
import logging
from typing import Optional, Dict, Any, List
from .config import settings

logger = logging.getLogger("blinkfix.database")

def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection to the local database file."""
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db() -> None:
    """Initializes SQLite schema if not already created."""
    conn = get_connection()
    try:
        with conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    service TEXT NOT NULL,
                    error_name TEXT NOT NULL,
                    error_message TEXT NOT NULL,
                    file TEXT NOT NULL,
                    line INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    duration_ms INTEGER DEFAULT 0,
                    culprit_commit TEXT,
                    winning_patch_id TEXT,
                    pr_url TEXT,
                    rollback_approved BOOLEAN DEFAULT 0,
                    context_snapshot TEXT
                );

                CREATE TABLE IF NOT EXISTS agent_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    summary TEXT,
                    logs_json TEXT,
                    findings_json TEXT,
                    FOREIGN KEY(incident_id) REFERENCES incidents(id)
                );

                CREATE TABLE IF NOT EXISTS candidate_patches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    patch_id TEXT NOT NULL,
                    strategy TEXT NOT NULL,
                    code TEXT NOT NULL,
                    is_winner BOOLEAN DEFAULT 0,
                    validation_score INTEGER DEFAULT 0,
                    FOREIGN KEY(incident_id) REFERENCES incidents(id)
                );
            """)
        logger.info(f"SQLite database initialized at {settings.DATABASE_PATH}")
    finally:
        conn.close()

def save_incident(incident: Dict[str, Any]) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO incidents (
                    id, service, error_name, error_message, file, line, status,
                    duration_ms, culprit_commit, winning_patch_id, pr_url, rollback_approved, context_snapshot
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    incident["id"],
                    incident["service"],
                    incident["error_name"],
                    incident["error_message"],
                    incident["file"],
                    incident["line"],
                    incident["status"],
                    incident.get("duration_ms", 0),
                    incident.get("culprit_commit"),
                    incident.get("winning_patch_id"),
                    incident.get("pr_url"),
                    1 if incident.get("rollback_approved") else 0,
                    json.dumps(incident.get("context_snapshot", {})),
                ),
            )
    finally:
        conn.close()

def update_incident(incident_id: str, updates: Dict[str, Any]) -> None:
    conn = get_connection()
    try:
        fields = []
        values = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(incident_id)

        with conn:
            conn.execute(
                f"UPDATE incidents SET {', '.join(fields)} WHERE id = ?",
                tuple(values),
            )
    finally:
        conn.close()

def get_incident(incident_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        row = cur.fetchone()
        if not row:
            return None
        data = dict(row)
        if data.get("context_snapshot"):
            try:
                data["context_snapshot"] = json.loads(data["context_snapshot"])
            except Exception:
                pass
        return data
    finally:
        conn.close()

def save_agent_run(incident_id: str, agent_result: Dict[str, Any]) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO agent_runs (
                    incident_id, agent_name, status, duration_ms, summary, logs_json, findings_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    incident_id,
                    agent_result["agent_name"],
                    agent_result.get("status", "COMPLETED"),
                    agent_result.get("duration_ms", 0),
                    agent_result.get("summary", ""),
                    json.dumps(agent_result.get("logs", [])),
                    json.dumps(agent_result.get("findings", {})),
                ),
            )
    finally:
        conn.close()

def list_recent_incidents(limit: int = 10) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, service, error_name, error_message, status, created_at, duration_ms, pr_url FROM incidents ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()

