"""
Final clean migration: wipe Supabase completely and re-import all SQLite data with correct IDs.
Since we are using transaction pooler, we'll use DELETE with FK disabled, then re-import cleanly.
"""
import sqlite3
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()
PG_URL = os.environ.get("DATABASE_URL")

def migrate():
    print("Connecting to SQLite...")
    sl_conn = sqlite3.connect("dental.db")
    sl_conn.row_factory = sqlite3.Row
    
    print("Connecting to PostgreSQL...")
    if not PG_URL:
        print("DATABASE_URL not found in .env")
        return
    
    # Use session mode URL (port 5432) for TRUNCATE with CASCADE support
    # Replace port 6543 with 5432 to use direct session connection which supports DDL
    session_url = PG_URL.replace(":6543/", ":5432/")
    print(f"Using session URL for migration...")
    
    pg_conn = psycopg.connect(session_url, row_factory=dict_row, prepare_threshold=None)
    
    insert_order = ["patients", "appointments", "treatments", "medications", "invoices", "payments"]

    try:
        with pg_conn.transaction():
            print("Wiping all existing data (TRUNCATE CASCADE)...")
            pg_conn.execute("""
                TRUNCATE TABLE payments, medications, invoices, treatments, appointments, patients
                RESTART IDENTITY CASCADE
            """)
            
            for table in insert_order:
                rows = sl_conn.execute(f"SELECT * FROM {table}").fetchall()
                print(f"Migrating {len(rows)} records from {table}...")
                
                if not rows:
                    continue
                
                cols = list(rows[0].keys())
                placeholders = ", ".join(["%s"] * len(cols))
                col_names = ", ".join(cols)
                insert_query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"
                
                for row in rows:
                    pg_conn.execute(insert_query, tuple(row[col] for col in cols))
            
            # Update sequences
            print("Updating sequences...")
            for table in insert_order:
                pg_conn.execute(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
                )
        
        print("\n✅ Migration successful!")
        for table in insert_order:
            count = pg_conn.execute(f"SELECT COUNT(*) as c FROM {table}").fetchone()["c"]
            print(f"  {table}: {count} records in Supabase")
            
    except Exception as e:
        print("❌ Error during migration:", e)
        import traceback; traceback.print_exc()
    finally:
        sl_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
