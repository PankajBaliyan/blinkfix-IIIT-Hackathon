"""Durable snapshots and ordered events, committed together before delivery."""
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from .database import get_connection

TERMINAL = {'RESOLVED', 'FAILED', 'MITIGATED', 'VALIDATED', 'PUBLISH_FAILED'}


@contextmanager
def connection():
    db = get_connection()
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    with connection() as db:
        db.executescript('''
          CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, state TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS submissions (
            request_id TEXT PRIMARY KEY, incident_id TEXT NOT NULL UNIQUE);
          CREATE TABLE IF NOT EXISTS action_claims (
            incident_id TEXT NOT NULL, action TEXT NOT NULL,
            PRIMARY KEY (incident_id, action));
          CREATE TABLE IF NOT EXISTS run_events (
            seq INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT NOT NULL,
            event TEXT NOT NULL, data TEXT NOT NULL);
          CREATE INDEX IF NOT EXISTS events_by_incident ON run_events(incident_id, seq);
        ''')


def create_run(request_id, incident_id, changes):
    """Atomically deduplicate a submission and create its first durable event."""
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        existing = db.execute('SELECT incident_id FROM submissions WHERE request_id=?',
                              (request_id,)).fetchone()
        if existing:
            return existing['incident_id'], False
        state = {'id': incident_id, **changes, 'revision': 1,
                 'updated_at': datetime.now(timezone.utc).isoformat()}
        data = json.dumps(state)
        db.execute('INSERT INTO submissions VALUES (?,?)', (request_id, incident_id))
        db.execute('INSERT INTO runs VALUES (?,?)', (incident_id, data))
        db.execute('INSERT INTO run_events(incident_id,event,data) VALUES (?,?,?)',
                   (incident_id, 'incident_started', data))
    return incident_id, True


def claim_action(incident_id, action):
    """Return true exactly once for an incident/action pair."""
    with connection() as db:
        cursor = db.execute('INSERT OR IGNORE INTO action_claims VALUES (?,?)',
                            (incident_id, action))
    return cursor.rowcount == 1


def get_state(incident_id):
    with connection() as db:
        row = db.execute('SELECT state FROM runs WHERE id=?', (incident_id,)).fetchone()
    return json.loads(row['state']) if row else None


def list_states(limit=5, mode=None, scenario_id=None):
    clauses = []
    parameters = []
    if mode:
        clauses.append("json_extract(state, '$.mode') = ?")
        parameters.append(mode)
    if scenario_id:
        clauses.append("json_extract(state, '$.scenario_id') = ?")
        parameters.append(scenario_id)
    where = (' WHERE ' + ' AND '.join(clauses)) if clauses else ''
    parameters.append(limit)
    with connection() as db:
        rows = db.execute(
            f"SELECT state FROM runs{where} ORDER BY json_extract(state, '$.started_at') DESC LIMIT ?",
            parameters,
        ).fetchall()
    return [json.loads(row['state']) for row in rows]


def record(incident_id, event, changes):
    with connection() as db:
        # Serialize snapshot updates even when analysis tasks finish together.
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT state FROM runs WHERE id=?', (incident_id,)).fetchone()
        state = json.loads(row['state']) if row else {'id': incident_id}
        state.update(changes)
        state['revision'] = state.get('revision', 0) + 1
        state['updated_at'] = datetime.now(timezone.utc).isoformat()
        data = json.dumps(state)
        db.execute('INSERT OR REPLACE INTO runs VALUES (?,?)', (incident_id, data))
        cursor = db.execute('INSERT INTO run_events(incident_id,event,data) VALUES (?,?,?)',
                            (incident_id, event, data))
        seq = cursor.lastrowid
    return {'id': str(seq), 'event': event, 'data': data}


def replay(incident_id, after=0):
    with connection() as db:
        rows = db.execute('SELECT seq,event,data FROM run_events WHERE incident_id=? AND seq>? ORDER BY seq',
                          (incident_id, after)).fetchall()
    return [{'id': str(r['seq']), 'event': r['event'], 'data': r['data']} for r in rows]


def recover_interrupted():
    with connection() as db:
        rows = db.execute('SELECT id,state FROM runs').fetchall()
    for row in rows:
        if json.loads(row['state']).get('status') not in TERMINAL:
            record(row['id'], 'incident_failed', {'status': 'FAILED',
                   'error': 'Backend restarted during execution; start a new incident.'})
