from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database as db
import sheets_backup as sheets

app = FastAPI(title="Vital Dental API", version="1.0.0")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In Vercel, origins are handled seamlessly, but keeping wildcard for local and mobile dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel deployment path translation hack
@app.middleware("http")
async def rewrite_api_path(request: Request, call_next):
    if request.scope["path"].startswith("/api"):
        request.scope["path"] = request.scope["path"][4:]
    return await call_next(request)

# ── Startup: create tables ─────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    db.create_tables()
    #db.seed_data()

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Vital Dental API is running"}

# ══════════════════════════════════════════════════════════════════════════════
#  PATIENTS
# ══════════════════════════════════════════════════════════════════════════════
class PatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    dob: Optional[str] = ""
    blood_group: Optional[str] = ""
    force: Optional[bool] = False

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    bloodGroup: Optional[str] = None
    blood_group: Optional[str] = None
    isCompleted: Optional[bool] = None
    isRecall: Optional[bool] = None
    recallNote: Optional[str] = None
    reviewStatus: Optional[str] = None

@app.get("/patients")
def get_patients():
    return db.get_all_patients()

@app.get("/patients/{patient_id}")
def get_patient(patient_id: int):
    patient = db.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.post("/patients", status_code=201)
def create_patient(p: PatientCreate):
    try:
        new_patient = db.create_patient(p.name, p.phone, p.email, p.dob, p.blood_group, p.force)
        try:
            sheets.backup_patient(new_patient)
        except Exception as sheet_err:
            print(f"Sheets backup failed for patient: {sheet_err}")
        return new_patient
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, p: PatientUpdate):
    try:
        updated = db.update_patient(patient_id, p.dict(exclude_none=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Patient not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int):
    success = db.delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

# ══════════════════════════════════════════════════════════════════════════════
#  APPOINTMENTS
# ══════════════════════════════════════════════════════════════════════════════
class AppointmentCreate(BaseModel):
    date: str
    time: str
    type: str
    doctor: str
    status: Optional[str] = "Scheduled"
    plannedCost: Optional[float] = 0
    reminderSent: Optional[bool] = False

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None
    doctor: Optional[str] = None
    status: Optional[str] = None
    plannedCost: Optional[float] = None
    reminderSent: Optional[bool] = None

@app.get("/patients/{patient_id}/appointments")
def get_appointments(patient_id: int):
    return db.get_appointments(patient_id)

@app.get("/appointments")
def get_all_appointments(date: Optional[str] = None):
    if date:
        return db.get_appointments_by_date(date)
    return []

@app.post("/patients/{patient_id}/appointments", status_code=201)
def create_appointment(patient_id: int, a: AppointmentCreate):
    new_appt = db.create_appointment(patient_id, a.date, a.time, a.type, a.doctor, a.status, a.plannedCost, a.reminderSent)
    try:
        sheets.backup_appointment(new_appt)
    except Exception as sheet_err:
        print(f"Sheets backup failed for appointment: {sheet_err}")
    return new_appt

@app.put("/patients/{patient_id}/appointments/{appt_id}")
def update_appointment(patient_id: int, appt_id: int, a: AppointmentUpdate):
    updated = db.update_appointment(appt_id, a.dict(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated

@app.delete("/patients/{patient_id}/appointments/{appt_id}")
def delete_appointment(patient_id: int, appt_id: int):
    db.delete_appointment(appt_id)
    return {"message": "Appointment deleted"}

# ══════════════════════════════════════════════════════════════════════════════
#  TREATMENTS
# ══════════════════════════════════════════════════════════════════════════════
class TreatmentCreate(BaseModel):
    date: str
    type: str
    doctor: str
    cost: Optional[float] = 0
    notes: Optional[str] = ""
    status: Optional[str] = "Completed"

class TreatmentUpdate(BaseModel):
    date: Optional[str] = None
    type: Optional[str] = None
    doctor: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None

@app.get("/patients/{patient_id}/treatments")
def get_treatments(patient_id: int):
    return db.get_treatments(patient_id)

@app.post("/patients/{patient_id}/treatments", status_code=201)
def create_treatment(patient_id: int, t: TreatmentCreate):
    new_treatment = db.create_treatment(patient_id, t.date, t.type, t.doctor, t.cost, t.notes, t.status)
    try:
        sheets.backup_treatment(new_treatment)
    except Exception as sheet_err:
        print(f"Sheets backup failed for treatment: {sheet_err}")
    return new_treatment

@app.put("/patients/{patient_id}/treatments/{treatment_id}")
def update_treatment(patient_id: int, treatment_id: int, t: TreatmentUpdate):
    return db.update_treatment(treatment_id, t.dict(exclude_unset=True))

@app.delete("/patients/{patient_id}/treatments/{treatment_id}")
def delete_treatment(patient_id: int, treatment_id: int):
    db.delete_treatment(treatment_id)
    return {"message": "Treatment deleted"}

# ══════════════════════════════════════════════════════════════════════════════
#  MEDICATIONS
# ══════════════════════════════════════════════════════════════════════════════
class MedicationCreate(BaseModel):
    name: str
    dosage: Optional[str] = ""
    duration: Optional[str] = ""
    prescribed: Optional[str] = str(date.today())

@app.get("/patients/{patient_id}/medications")
def get_medications(patient_id: int):
    return db.get_medications(patient_id)

@app.post("/patients/{patient_id}/medications", status_code=201)
def create_medication(patient_id: int, m: MedicationCreate):
    return db.create_medication(patient_id, m.name, m.dosage, m.duration, m.prescribed)

@app.delete("/patients/{patient_id}/medications/{med_id}")
def delete_medication(patient_id: int, med_id: int):
    db.delete_medication(med_id)
    return {"message": "Medication deleted"}

# ══════════════════════════════════════════════════════════════════════════════
#  FINANCE
# ══════════════════════════════════════════════════════════════════════════════
class PaymentCreate(BaseModel):
    treatment_id: int
    date: str
    amount: float
    method: Optional[str] = "Cash"

class PaymentUpdate(BaseModel):
    date: Optional[str] = None
    amount: Optional[float] = None
    method: Optional[str] = None

@app.post("/patients/{patient_id}/payments", status_code=201)
def create_payment(patient_id: int, p: PaymentCreate):
    new_payment = db.create_payment(patient_id, p.date, p.amount, p.method, p.treatment_id)
    try:
        sheets.backup_payment(new_payment)
    except Exception as sheet_err:
        print(f"Sheets backup failed for payment: {sheet_err}")
    return new_payment

@app.put("/payments/{payment_id}")
def update_payment(payment_id: int, p: PaymentUpdate):
    return db.update_payment(payment_id, p.dict(exclude_unset=True))

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: int):
    db.delete_payment(payment_id)
    return {"message": "Payment deleted"}


# ══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD STATS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/stats")
def get_stats():
    return db.get_dashboard_stats()

# ══════════════════════════════════════════════════════════════════════════════
#  FINANCE ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/finance/analysis")
def get_finance_analysis(start_date: Optional[str] = None, end_date: Optional[str] = None):
    return db.get_finance_analysis(start_date, end_date)

@app.get("/finance/summary")
def get_finance_summary(start_date: Optional[str] = None, end_date: Optional[str] = None):
    return db.get_finance_summary(start_date, end_date)
