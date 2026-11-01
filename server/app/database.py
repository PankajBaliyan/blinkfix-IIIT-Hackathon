"""SQLite connection factory for durable run snapshots and ordered events."""
import sqlite3
from .config import settings


def get_connection() -> sqlite3.Connection:
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.DATABASE_PATH, timeout=10.0)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA journal_mode=WAL')
    connection.execute('PRAGMA synchronous=NORMAL')
    return connection
