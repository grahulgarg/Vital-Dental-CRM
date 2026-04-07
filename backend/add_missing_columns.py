"""Add any missing columns to Supabase that exist in the local SQLite schema."""
import psycopg
from psycopg.rows import dict_row
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
PG_URL = os.environ.get("DATABASE_URL")

# Connect to both
sl_conn = sqlite3.connect("dental.db")
pg_conn = psycopg.connect(PG_URL, row_factory=dict_row, autocommit=True)

tables = ["patients", "appointments", "treatments", "medications", "invoices", "payments"]

for table in tables:
    # Get SQLite columns
    sl_cols = {row[1]: row[2] for row in sl_conn.execute(f"PRAGMA table_info({table})")}
    # Get Postgres columns
    pg_cols_rows = pg_conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,)
    ).fetchall()
    pg_cols = {r["column_name"] for r in pg_cols_rows}
    
    for col, col_type in sl_cols.items():
        if col not in pg_cols:
            # Map SQLite types to PG types
            pg_type = "TEXT"
            if col_type.upper() in ("INTEGER", "INT"):
                pg_type = "INTEGER DEFAULT 0"
            elif col_type.upper() == "REAL":
                pg_type = "REAL DEFAULT 0"
            elif col_type.upper() == "DATE":
                pg_type = "DATE"
            print(f"Adding missing column: {table}.{col} ({pg_type})")
            pg_conn.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {pg_type}")

print("Done! All missing columns added.")
sl_conn.close()
pg_conn.close()
