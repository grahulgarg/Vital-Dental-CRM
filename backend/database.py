import psycopg
from psycopg.rows import dict_row
from datetime import date, datetime
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_conn():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing!")
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True, prepare_threshold=None)
    return conn

# ── Schema ─────────────────────────────────────────────────────────────────────
def create_tables():
    with get_conn() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id           SERIAL PRIMARY KEY,
            name         TEXT    NOT NULL,
            phone        TEXT    NOT NULL UNIQUE,
            email        TEXT    DEFAULT '',
            age          INTEGER DEFAULT NULL,
            blood_group  TEXT    DEFAULT '',
            address      TEXT    DEFAULT '',
            join_date    DATE    DEFAULT CURRENT_DATE,
            is_completed INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id          SERIAL PRIMARY KEY,
            patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            date        DATE    NOT NULL,
            time        TEXT    NOT NULL,
            type        TEXT    NOT NULL,
            doctor      TEXT    NOT NULL,
            status      TEXT    DEFAULT 'Scheduled',
            planned_cost REAL    DEFAULT 0,
            reminder_sent INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS treatments (
            id          SERIAL PRIMARY KEY,
            patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            date        DATE    NOT NULL,
            type        TEXT    NOT NULL,
            doctor      TEXT    NOT NULL,
            cost        REAL    DEFAULT 0,
            notes       TEXT    DEFAULT '',
            status      TEXT    DEFAULT 'Completed'
        );

        CREATE TABLE IF NOT EXISTS medications (
            id          SERIAL PRIMARY KEY,
            patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            name        TEXT    NOT NULL,
            dosage      TEXT    DEFAULT '',
            duration    TEXT    DEFAULT '',
            prescribed  DATE    DEFAULT CURRENT_DATE
        );
        
        CREATE TABLE IF NOT EXISTS invoices (
            id          SERIAL PRIMARY KEY,
            patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            date        DATE    NOT NULL,
            amount      REAL    DEFAULT 0,
            description TEXT    DEFAULT '',
            status      TEXT    DEFAULT 'Unpaid'
        );
        
        CREATE TABLE IF NOT EXISTS payments (
            id          SERIAL PRIMARY KEY,
            patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            date        DATE    NOT NULL,
            amount      REAL    DEFAULT 0,
            method      TEXT    DEFAULT 'Cash',
            treatment_id INTEGER DEFAULT NULL REFERENCES treatments(id) ON DELETE SET NULL
        );
        """)

        # Postgres migration blocks using anonymous DO blocks
        migrations = [
            "DO $$ BEGIN ALTER TABLE patients ADD COLUMN is_completed INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE patients ADD COLUMN is_recall INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE patients ADD COLUMN recall_note TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE appointments ADD COLUMN planned_cost REAL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE patients ADD COLUMN age INTEGER DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE patients ADD COLUMN address TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN END; $$;",
            "DO $$ BEGIN ALTER TABLE payments ADD COLUMN treatment_id INTEGER DEFAULT NULL REFERENCES treatments(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN END; $$;"
        ]
        
        for m in migrations:
            try:
                conn.execute(m)
            except Exception as e:
                print(f"Migration skip: {e}")

# ── Seed demo data (only if DB is empty) ──────────────────────────────────────
def seed_data():
    with get_conn() as conn:
        if conn.execute("SELECT COUNT(*) as c FROM patients").fetchone()["c"] > 0:
            return  # already seeded

        patients = [
            ("Priya Sharma",  "+91 98765 43210", "priya@email.com",  32, "B+", "2024-01-15"),
            ("Rahul Gupta",   "+91 87654 32109", "rahul@email.com",  44, "O+", "2023-11-08"),
            ("Anita Verma",   "+91 76543 21098", "anita@email.com",  28, "A+", "2024-05-22"),
        ]
        for p in patients:
            conn.execute(
                "INSERT INTO patients (name,phone,email,age,blood_group,join_date,address) VALUES (%s,%s,%s,%s,%s,%s,'')", p)

        conn.execute("INSERT INTO appointments (patient_id,date,time,type,doctor,status,planned_cost) VALUES (1,'2025-03-15','10:30 AM','Follow-up','Dr. Mehta','Confirmed', 500)")
        conn.execute("INSERT INTO appointments (patient_id,date,time,type,doctor,status,planned_cost) VALUES (2,'2025-03-18','2:00 PM','Dental Implant Consult','Dr. Mehta','Scheduled', 1000)")
        conn.execute("INSERT INTO appointments (patient_id,date,time,type,doctor,status,planned_cost) VALUES (3,'2025-03-12','11:00 AM','New Patient Checkup','Dr. Singh','Scheduled', 800)")

        conn.execute("INSERT INTO treatments (patient_id,date,type,doctor,cost,notes,status) VALUES (1,'2024-03-10','Root Canal','Dr. Mehta',8000,'Upper molar. Follow-up in 2 weeks.','Completed')")
        conn.execute("INSERT INTO treatments (patient_id,date,type,doctor,cost,notes,status) VALUES (1,'2024-06-20','Cleaning','Dr. Singh',1500,'Routine cleaning.','Completed')")
        conn.execute("INSERT INTO treatments (patient_id,date,type,doctor,cost,notes,status) VALUES (2,'2024-02-14','Tooth Extraction','Dr. Singh',3500,'Lower wisdom tooth removed.','Completed')")

        conn.execute("INSERT INTO invoices (patient_id,date,amount,description,status) VALUES (1,'2024-03-10',8000,'Root Canal','Paid')")
        conn.execute("INSERT INTO invoices (patient_id,date,amount,description,status) VALUES (1,'2024-06-20',1500,'Cleaning','Paid')")
        conn.execute("INSERT INTO invoices (patient_id,date,amount,description,status) VALUES (2,'2024-02-14',3500,'Tooth Extraction','Unpaid')")

        conn.execute("INSERT INTO payments (patient_id,date,amount,method) VALUES (1,'2024-03-10',8000,'Card')")
        conn.execute("INSERT INTO payments (patient_id,date,amount,method) VALUES (1,'2024-06-20',1500,'UPI')")

        conn.execute("INSERT INTO medications (patient_id,name,dosage,duration,prescribed) VALUES (1,'Amoxicillin 500mg','3x daily','5 days','2024-03-10')")
        conn.execute("INSERT INTO medications (patient_id,name,dosage,duration,prescribed) VALUES (1,'Ibuprofen 400mg','2x daily','3 days','2024-03-10')")
        conn.execute("INSERT INTO medications (patient_id,name,dosage,duration,prescribed) VALUES (2,'Metronidazole 400mg','2x daily','7 days','2024-02-14')")


# ── Helpers ────────────────────────────────────────────────────────────────────
def calculate_age(dob_str):
    if not dob_str:
        return None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except:
        return None

def row_to_dict(row):
    if not row:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (date, datetime)):
            d[k] = str(v)
    return d

def rows_to_list(rows):
    return [row_to_dict(r) for r in rows if r]

def populate_patient_extras(p):
    pid = p["id"]
    with get_conn() as conn:
        p["appointments"] = rows_to_list(conn.execute("SELECT * FROM appointments WHERE patient_id=%s ORDER BY date, time", (pid,)).fetchall())
        p["medications"]  = rows_to_list(conn.execute("SELECT * FROM medications  WHERE patient_id=%s ORDER BY prescribed DESC", (pid,)).fetchall())
        # Fetch payments
        payments = rows_to_list(conn.execute("SELECT * FROM payments WHERE patient_id=%s ORDER BY date DESC", (pid,)).fetchall())
        p["payments"] = payments
        
        # Fetch treatments and embed payment info
        treatments = rows_to_list(conn.execute("SELECT * FROM treatments WHERE patient_id=%s ORDER BY date DESC", (pid,)).fetchall())
        for tx in treatments:
            tx_payments = [pay for pay in payments if pay["treatment_id"] == tx["id"]]
            tx["total_paid"] = sum(pay["amount"] for pay in tx_payments)
            tx["balance"] = max(0, tx["cost"] - tx["total_paid"])
        p["treatments"] = treatments
        
        # Backwards compatibility cleanup
        p["invoices"] = []
        p["joinDate"]    = p.pop("join_date", None)
        p["bloodGroup"]  = p.pop("blood_group", None)
        # age is stored directly as an integer in the DB
        p["isCompleted"] = bool(p.pop("is_completed", 0))
    return p


def get_all_patients():
    from collections import defaultdict
    with get_conn() as conn:
        patients = rows_to_list(conn.execute("SELECT * FROM patients ORDER BY name").fetchall())
        
        # Batch fetch all related entities to eliminate the N+1 query problem on Supabase
        appointments = rows_to_list(conn.execute("SELECT * FROM appointments ORDER BY date, time").fetchall())
        medications = rows_to_list(conn.execute("SELECT * FROM medications ORDER BY prescribed DESC").fetchall())
        payments = rows_to_list(conn.execute("SELECT * FROM payments ORDER BY date DESC").fetchall())
        treatments = rows_to_list(conn.execute("SELECT * FROM treatments ORDER BY date DESC").fetchall())
        
        # Group them in Python dictionaries by patient_id
        appts_by_pat = defaultdict(list)
        for a in appointments: appts_by_pat[a["patient_id"]].append(a)
            
        meds_by_pat = defaultdict(list)
        for m in medications: meds_by_pat[m["patient_id"]].append(m)
            
        pays_by_pat = defaultdict(list)
        pays_by_tx = defaultdict(list)
        for py in payments: 
            pays_by_pat[py["patient_id"]].append(py)
            if py.get("treatment_id"):
                pays_by_tx[py["treatment_id"]].append(py)
            
        txs_by_pat = defaultdict(list)
        for t in treatments: 
            tx_pays = pays_by_tx[t["id"]]
            t["total_paid"] = sum(pay["amount"] for pay in tx_pays)
            t["balance"] = max(0, t["cost"] - t["total_paid"])
            txs_by_pat[t["patient_id"]].append(t)
            
        for p in patients:
            pid = p["id"]
            p["appointments"] = appts_by_pat[pid]
            p["medications"]  = meds_by_pat[pid]
            p["payments"]     = pays_by_pat[pid]
            p["treatments"]   = txs_by_pat[pid]
            
            p["invoices"] = []
            p["joinDate"]    = p.pop("join_date", None)
            p["bloodGroup"]  = p.pop("blood_group", None)
            p["isCompleted"] = bool(p.pop("is_completed", 0))
            p["isRecall"]    = bool(p.pop("is_recall", 0))
            p["recallNote"]  = p.pop("recall_note", "")
            
        return patients

def get_patient_by_id(patient_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM patients WHERE id=%s", (patient_id,)).fetchone()
        if not row:
            return None
        p = row_to_dict(row)
        return populate_patient_extras(p)

def check_duplicate_patient(name, dob):
    if not name or not dob:
        return None
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM patients WHERE LOWER(name)=%s AND dob=%s", (name.lower(), dob)).fetchone()
        return row_to_dict(row) if row else None

def create_patient(name, phone, email, age, blood_group, force=False):
    with get_conn() as conn:
        # Check if patient exists by phone first
        existing = conn.execute("SELECT id FROM patients WHERE phone=%s", (phone,)).fetchone()
        if existing:
            # Return the existing patient directly
            return get_patient_by_id(existing["id"])

        try:
            age_val = int(age) if age not in (None, "") else None
            cur = conn.execute(
                "INSERT INTO patients (name,phone,email,age,blood_group,address) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                (name, phone, email or "", age_val, blood_group or "", "")
            )
            new_id = cur.fetchone()["id"]
            return get_patient_by_id(new_id)
        except psycopg.IntegrityError as e:
            if "patients_phone_key" in str(e) or "unique constraint" in str(e).lower():
                # Fallback in case of race condition
                dup = conn.execute("SELECT id FROM patients WHERE phone=%s", (phone,)).fetchone()
                if dup:
                    return get_patient_by_id(dup["id"])
                raise ValueError(f"A patient with phone number {phone} already exists.")
            raise

def update_patient(patient_id: int, fields: dict):
    if not fields:
        return get_patient_by_id(patient_id)
    # map camelCase keys from React → snake_case DB columns
    col_map = {"bloodGroup": "blood_group", "joinDate": "join_date", "isCompleted": "is_completed", "reviewStatus": "review_status", "isRecall": "is_recall", "recallNote": "recall_note"}
    mapped = {col_map.get(k, k): v for k, v in fields.items()}
    # Drop any dob key (legacy) - age is stored directly
    mapped.pop("dob", None)
    
    # Cast boolean is_completed to integer for Postgres
    if "is_completed" in mapped and isinstance(mapped["is_completed"], bool):
        mapped["is_completed"] = 1 if mapped["is_completed"] else 0
        
    if "is_recall" in mapped and isinstance(mapped["is_recall"], bool):
        mapped["is_recall"] = 1 if mapped["is_recall"] else 0
        
    if not mapped:
        return get_patient_by_id(patient_id)
    set_clause = ", ".join(f"{k}=%s" for k in mapped)
    values = list(mapped.values()) + [patient_id]
    with get_conn() as conn:
        try:
            conn.execute(f"UPDATE patients SET {set_clause} WHERE id=%s", values)
        except psycopg.IntegrityError as e:
            if "patients_phone_key" in str(e) or "unique constraint" in str(e).lower():
                raise ValueError(f"Phone number already exists.")
            raise
    return get_patient_by_id(patient_id)

def delete_patient(patient_id: int):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM patients WHERE id=%s", (patient_id,))
        return cur.rowcount > 0


# ── APPOINTMENTS ───────────────────────────────────────────────────────────────
def get_appointments(patient_id: int):
    with get_conn() as conn:
        return rows_to_list(conn.execute(
            "SELECT * FROM appointments WHERE patient_id=%s ORDER BY date, time", (patient_id,)
        ).fetchall())

def get_appointments_by_date(date_str: str):
    with get_conn() as conn:
        return rows_to_list(conn.execute("""
            SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.date = %s
            ORDER BY a.time
        """, (date_str,)).fetchall())

def create_appointment(patient_id, appt_date, time, appt_type, doctor, status="Scheduled", planned_cost=0, reminder_sent=0):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO appointments (patient_id,date,time,type,doctor,status,planned_cost,reminder_sent) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (patient_id, appt_date, time, appt_type, doctor, status, planned_cost, reminder_sent)
        )
        new_id = cur.fetchone()["id"]
        return row_to_dict(conn.execute("SELECT * FROM appointments WHERE id=%s", (new_id,)).fetchone())

def update_appointment(appt_id: int, fields: dict):
    if not fields: return None
    # map camelCase to snake_case
    col_map = {"plannedCost": "planned_cost", "reminderSent": "reminder_sent"}
    mapped = {col_map.get(k, k): v for k, v in fields.items()}
    
    if "reminder_sent" in mapped and isinstance(mapped["reminder_sent"], bool):
        mapped["reminder_sent"] = 1 if mapped["reminder_sent"] else 0
        
    set_clause = ", ".join(f"{k}=%s" for k in mapped)
    values = list(mapped.values()) + [appt_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE appointments SET {set_clause} WHERE id=%s", values)
        return row_to_dict(conn.execute("SELECT * FROM appointments WHERE id=%s", (appt_id,)).fetchone())

def delete_appointment(appt_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM appointments WHERE id=%s", (appt_id,))


# ── TREATMENTS ─────────────────────────────────────────────────────────────────
def get_treatments(patient_id: int):
    with get_conn() as conn:
        return rows_to_list(conn.execute(
            "SELECT * FROM treatments WHERE patient_id=%s ORDER BY date DESC", (patient_id,)
        ).fetchall())

def create_treatment(patient_id, t_date, t_type, doctor, cost, notes, status="Completed"):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO treatments (patient_id,date,type,doctor,cost,notes,status) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (patient_id, t_date, t_type, doctor, float(cost) if cost else 0, notes or "", status)
        )
        new_id = cur.fetchone()["id"]
        return row_to_dict(conn.execute("SELECT * FROM treatments WHERE id=%s", (new_id,)).fetchone())

def update_treatment(treatment_id: int, fields: dict):
    if not fields: return None
    set_clause = ", ".join(f"{k}=%s" for k in fields)
    values = list(fields.values()) + [treatment_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE treatments SET {set_clause} WHERE id=%s", values)
        return row_to_dict(conn.execute("SELECT * FROM treatments WHERE id=%s", (treatment_id,)).fetchone())

def delete_treatment(treatment_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM treatments WHERE id=%s", (treatment_id,))


# ── MEDICATIONS ────────────────────────────────────────────────────────────────
def get_medications(patient_id: int):
    with get_conn() as conn:
        return rows_to_list(conn.execute(
            "SELECT * FROM medications WHERE patient_id=%s ORDER BY prescribed DESC", (patient_id,)
        ).fetchall())

def create_medication(patient_id, name, dosage, duration, prescribed):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO medications (patient_id,name,dosage,duration,prescribed) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (patient_id, name, dosage or "", duration or "", prescribed or str(date.today()))
        )
        new_id = cur.fetchone()["id"]
        return row_to_dict(conn.execute("SELECT * FROM medications WHERE id=%s", (new_id,)).fetchone())

def delete_medication(med_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM medications WHERE id=%s", (med_id,))


# ── FINANCE ────────────────────────────────────────────────────────────────────
def create_payment(patient_id, p_date, amount, method, treatment_id=None):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO payments (patient_id,date,amount,method,treatment_id) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (patient_id, p_date, amount, method, treatment_id)
        )
        new_id = cur.fetchone()["id"]
        return row_to_dict(conn.execute("SELECT * FROM payments WHERE id=%s", (new_id,)).fetchone())

def update_payment(payment_id: int, fields: dict):
    if not fields: return None
    set_clause = ", ".join(f"{k}=%s" for k in fields)
    values = list(fields.values()) + [payment_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE payments SET {set_clause} WHERE id=%s", values)
        return row_to_dict(conn.execute("SELECT * FROM payments WHERE id=%s", (payment_id,)).fetchone())

def delete_payment(payment_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM payments WHERE id=%s", (payment_id,))


# ── DASHBOARD STATS ────────────────────────────────────────────────────────────
def get_dashboard_stats():
    today = str(date.today())
    with get_conn() as conn:
        total_patients     = conn.execute("SELECT COUNT(*) as c FROM patients").fetchone()["c"]
        total_appointments = conn.execute("SELECT COUNT(*) as c FROM appointments").fetchone()["c"]
        upcoming           = conn.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE date >= %s AND status NOT IN ('Cancelled', 'Completed')", (today,)
        ).fetchone()["c"]
        completed_tx       = conn.execute(
            "SELECT COUNT(*) as c FROM treatments WHERE status='Completed'"
        ).fetchone()["c"]
        upcoming_list = rows_to_list(conn.execute("""
            SELECT a.*, p.name as patient_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            WHERE a.date >= %s AND a.status NOT IN ('Cancelled', 'Completed')
            ORDER BY a.date, a.time
            LIMIT 10
        """, (today,)).fetchall())
        
        daily_treatments = rows_to_list(conn.execute("SELECT * FROM treatments WHERE date=%s", (today,)).fetchall())
        daily_revenue = sum(t['cost'] for t in daily_treatments)
        
        treatments = rows_to_list(conn.execute("SELECT * FROM treatments").fetchall())
        payments = rows_to_list(conn.execute("SELECT * FROM payments").fetchall())
        ar = { "0_30": 0, "31_60": 0, "60_plus": 0 }
        
        for tx in treatments:
            tx_payments = [p for p in payments if p['treatment_id'] == tx['id']]
            paid = sum(p['amount'] for p in tx_payments)
            balance = tx['cost'] - paid
            
            if balance > 0:
                try:
                    tx_date = datetime.strptime(str(tx['date']), "%Y-%m-%d").date()
                    days = (date.today() - tx_date).days
                    if days <= 30:
                        ar["0_30"] += balance
                    elif days <= 60:
                        ar["31_60"] += balance
                    else:
                        ar["60_plus"] += balance
                except:
                    pass

    return {
        "totalPatients":       total_patients,
        "totalAppointments":   total_appointments,
        "upcomingCount":       upcoming,
        "completedTreatments": completed_tx,
        "upcomingAppointments": upcoming_list,
        "dailyRevenue": daily_revenue,
        "ar": ar,
    }

# ── FINANCE ANALYSIS ───────────────────────────────────────────────────────────
def get_finance_analysis(start_date=None, end_date=None):
    with get_conn() as conn:
        where_clause_p = ""
        where_clause_t = ""
        params_p = []
        params_t = []
        
        if start_date and end_date:
            where_clause_p = "WHERE date BETWEEN %s AND %s"
            where_clause_t = "WHERE date BETWEEN %s AND %s"
            params_p = [start_date, end_date]
            params_t = [start_date, end_date]
        elif start_date:
            where_clause_p = "WHERE date >= %s"
            where_clause_t = "WHERE date >= %s"
            params_p = [start_date]
            params_t = [start_date]
        elif end_date:
            where_clause_p = "WHERE date <= %s"
            where_clause_t = "WHERE date <= %s"
            params_p = [end_date]
            params_t = [end_date]
            
        total_revenue = conn.execute(
            f"SELECT SUM(amount) as s FROM payments {where_clause_p}", params_p
        ).fetchone()["s"] or 0
        
        monthly_trend = rows_to_list(conn.execute(
            f"SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as revenue FROM payments {where_clause_p} GROUP BY month ORDER BY month", params_p
        ).fetchall())
        
        weekly_trend = rows_to_list(conn.execute(
            f"SELECT TO_CHAR(date, 'IYYY-IW') as week, SUM(amount) as revenue FROM payments {where_clause_p} GROUP BY week ORDER BY week", params_p
        ).fetchall())
        
        treatment_revenue = rows_to_list(conn.execute(
            f"SELECT type as name, SUM(cost) as value FROM treatments {where_clause_t} GROUP BY type ORDER BY value DESC", params_t
        ).fetchall())

    return {
        "totalRevenue": total_revenue,
        "monthlyTrend": monthly_trend,
        "weeklyTrend": weekly_trend,
        "treatmentRevenue": treatment_revenue
    }


# ── FINANCE SUMMARY (Full Dashboard) ──────────────────────────────────────────
def get_finance_summary(start_date=None, end_date=None):
    today = str(date.today())
    with get_conn() as conn:
        # Build date filters
        t_where, t_params = "", []
        p_where, p_params = "", []
        if start_date and end_date:
            t_where = "WHERE t.date BETWEEN %s AND %s"; t_params = [start_date, end_date]
            p_where = "WHERE py.date BETWEEN %s AND %s"; p_params = [start_date, end_date]
        elif start_date:
            t_where = "WHERE t.date >= %s"; t_params = [start_date]
            p_where = "WHERE py.date >= %s"; p_params = [start_date]
        elif end_date:
            t_where = "WHERE t.date <= %s"; t_params = [end_date]
            p_where = "WHERE py.date <= %s"; p_params = [end_date]

        # KPIs
        total_billed = conn.execute(
            f"SELECT COALESCE(SUM(t.cost),0) as c FROM treatments t {t_where}", t_params
        ).fetchone()["c"] or 0

        total_collected = conn.execute(
            f"SELECT COALESCE(SUM(py.amount),0) as c FROM payments py {p_where}", p_params
        ).fetchone()["c"] or 0

        amount_due = max(0, total_billed - total_collected)
        collection_rate = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 0

        # Monthly trend (based on payments = actual cash in)
        monthly_trend = rows_to_list(conn.execute(
            f"SELECT TO_CHAR(py.date, 'YYYY-MM') as month, SUM(py.amount) as collected, COUNT(*) as count FROM payments py {p_where} GROUP BY month ORDER BY month",
            p_params
        ).fetchall())

        # Collections list: all payments with patient + treatment info
        py_cond = p_where.replace("WHERE py.", "WHERE p.")
        collections_raw = rows_to_list(conn.execute(f"""
            SELECT py.id, py.date, py.amount, py.method, py.treatment_id,
                   p.id as patient_id, p.name as patient_name,
                   t.type as treatment_type
            FROM payments py
            JOIN patients p ON p.id = py.patient_id
            LEFT JOIN treatments t ON t.id = py.treatment_id
            {p_where.replace('py.date', 'py.date')}
            ORDER BY py.date DESC, py.id DESC
        """, p_params).fetchall())

        # AR per patient: patients with outstanding balance
        all_treatments = rows_to_list(conn.execute("""
            SELECT t.id, t.patient_id, t.date, t.type, t.cost, t.status,
                   p.name as patient_name, p.phone as patient_phone
            FROM treatments t
            JOIN patients p ON p.id = t.patient_id
            ORDER BY t.date DESC
        """).fetchall())
        all_payments = rows_to_list(conn.execute("SELECT * FROM payments").fetchall())

        ar_by_patient = {}
        for tx in all_treatments:
            pid = tx['patient_id']
            tx_payments = [py for py in all_payments if py.get('treatment_id') == tx['id']]
            paid = sum(py['amount'] for py in tx_payments)
            balance = (tx['cost'] or 0) - paid
            if balance > 0:
                if pid not in ar_by_patient:
                    ar_by_patient[pid] = {
                        'patient_id': pid, 'patient_name': tx['patient_name'],
                        'patient_phone': tx['patient_phone'],
                        'total_balance': 0, 'treatments': []
                    }
                try:
                    tx_date = datetime.strptime(str(tx['date']), "%Y-%m-%d").date()
                    days_overdue = (date.today() - tx_date).days
                except:
                    days_overdue = 0
                ar_by_patient[pid]['total_balance'] += balance
                ar_by_patient[pid]['treatments'].append({
                    'treatment_id': tx['id'],
                    'treatment_type': tx['type'],
                    'date': str(tx['date']),
                    'cost': tx['cost'] or 0,
                    'paid': paid,
                    'balance': balance,
                    'days_overdue': days_overdue
                })
        ar_list = sorted(ar_by_patient.values(), key=lambda x: -x['total_balance'])

        # Top 5 patients by billed value
        top_patients = rows_to_list(conn.execute("""
            SELECT p.id as patient_id, p.name as patient_name,
                   COALESCE(SUM(t.cost),0) as total_billed,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id=p.id), 0) as total_paid
            FROM patients p
            LEFT JOIN treatments t ON t.patient_id = p.id
            GROUP BY p.id
            ORDER BY total_billed DESC
            LIMIT 5
        """).fetchall())

    return {
        "totalBilled": total_billed,
        "totalCollected": total_collected,
        "amountDue": amount_due,
        "collectionRate": collection_rate,
        "monthlyTrend": monthly_trend,
        "collections": collections_raw,
        "arByPatient": ar_list,
        "topPatients": top_patients,
    }
