#!/usr/bin/env python3
"""Load the bundled synthetic CSV into SQLite and print basic KPI summaries.

Python standard library only. Run from the repository root:
    python scripts/analyze.py

Creates analysis.db locally (ignored by Git). Then run:
    sqlite3 analysis.db < sql/analysis.sql
(or open the DB in DB Browser for SQLite).
"""
from pathlib import Path
import csv
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'analysis.db'
CSV = ROOT / 'data' / 'sample_data.csv'
SCHEMA = ROOT / 'sql' / 'schema.sql'
TABLE = 'tickets'


def main():
    with CSV.open('r', encoding='utf-8', newline='') as handle:
        rows = list(csv.DictReader(handle))
        fields = list(rows[0]) if rows else []
    if not rows:
        raise SystemExit('No rows found in data/sample_data.csv')
    # Recreate the local SQLite table so rerunning does not duplicate rows.
    with sqlite3.connect(DB) as connection:
        connection.execute(f'DROP TABLE IF EXISTS "{TABLE}"')
        connection.executescript(SCHEMA.read_text(encoding='utf-8'))
        placeholders = ', '.join('?' for _ in fields)
        column_names = ', '.join(f'"{field}"' for field in fields)
        connection.executemany(
            f'INSERT INTO "{TABLE}" ({column_names}) VALUES ({placeholders})',
            [[None if item.get(f) == '' else item.get(f) for f in fields] for item in rows],
        )
        connection.commit()
        n = connection.execute(f'SELECT COUNT(*) FROM "{TABLE}"').fetchone()[0]
    print(f'Loaded {n:,} rows into {DB.name} in table {TABLE}.')
    print('Try: sqlite3 analysis.db < sql/analysis.sql')


if __name__ == '__main__':
    main()
