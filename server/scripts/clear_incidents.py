"""Clears saved incidents (and their agent results and candidate fixes) from the local database.

It makes a backup first and never touches the GitHub login stored in the same file.

  python scripts/clear_incidents.py                     # clear everything
  python scripts/clear_incidents.py --keep inc_9ad7bd12  # keep one or more incidents

Run it from the server folder. Stop the server first if you can; it also works while it runs.
"""
import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--keep", nargs="*", default=[], metavar="ID", help="incident ids to keep")
    parser.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    args = parser.parse_args()

    db_path = Path(settings.DATABASE_PATH)
    if not db_path.exists():
        sys.exit(f"No database at {db_path}")

    conn = sqlite3.connect(db_path)
    total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    to_delete = total - len(set(args.keep) & {r[0] for r in conn.execute("SELECT id FROM incidents")})
    print(f"Database: {db_path}")
    print(f"{total} incidents saved; {to_delete} will be deleted; keeping: {args.keep or 'none'}")
    if to_delete == 0:
        return
    if not args.yes and input("Type yes to continue: ").strip().lower() != "yes":
        sys.exit("Cancelled.")

    backup = db_path.with_name(db_path.stem + ".backup.db")
    target = sqlite3.connect(backup)
    conn.backup(target)
    target.close()
    print(f"Backup written to {backup}")

    marks = ",".join("?" * len(args.keep)) or "''"
    keep = tuple(args.keep)
    for table, column in (("agent_runs", "incident_id"), ("candidate_patches", "incident_id"), ("incidents", "id")):
        conn.execute(f"DELETE FROM {table} WHERE {column} NOT IN ({marks})", keep)
    conn.commit()
    left = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    print(f"Done. {left} incidents left. The GitHub login was not touched.")


if __name__ == "__main__":
    main()
