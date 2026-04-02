import sqlite3

DB_PATH = 'dental.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Delete dummy patients (IDs 1, 2, 3)
    conn.execute('DELETE FROM patients WHERE id IN (1, 2, 3)')
    print("Deleted dummy patients.")
    
    # 2. Wipe old finance data
    conn.execute('DELETE FROM invoices')
    conn.execute('DELETE FROM payments')
    print("Cleared old ledger data.")
    
    # 3. Add treatment_id to payments
    try:
        conn.execute('ALTER TABLE payments ADD COLUMN treatment_id INTEGER REFERENCES treatments(id) ON DELETE CASCADE')
        print("Added treatment_id to payments table.")
    except sqlite3.OperationalError:
        print("Column treatment_id already exists.")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
