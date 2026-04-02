import os
import gspread
from dotenv import load_dotenv
from requests.exceptions import RequestException

load_dotenv()

# The ID of your Google Sheet. You can find this in the URL of your spreadsheet:
# https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
SHEET_ID = os.environ.get("GOOGLE_SHEET_ID")
CREDENTIALS_FILE = "google_credentials.json"

def get_client():
    if not os.path.exists(CREDENTIALS_FILE):
        print("WARNING: google_credentials.json not found. Skipping Google Sheets backup.")
        return None
    try:
        # Authenticate using the service account file
        return gspread.service_account(filename=CREDENTIALS_FILE)
    except Exception as e:
        print(f"ERROR: Failed to authenticate with Google Sheets: {e}")
        return None

def get_sheet(sheet_name):
    if not SHEET_ID:
        print("WARNING: GOOGLE_SHEET_ID not set in .env. Skipping backup.")
        return None
    client = get_client()
    if not client:
        return None
        
    try:
        spreadsheet = client.open_by_key(SHEET_ID)
        try:
            return spreadsheet.worksheet(sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            # If the worksheet doesn't exist, create it with headers based on the sheet name
            print(f"Creating missing worksheet: {sheet_name}")
            return create_worksheet_with_headers(spreadsheet, sheet_name)
    except Exception as e:
        print(f"ERROR: Could not open spreadsheet {SHEET_ID}: {e}")
        return None

def create_worksheet_with_headers(spreadsheet, sheet_name):
    sheet = spreadsheet.add_worksheet(title=sheet_name, rows="1000", cols="20")
    if sheet_name == "Patients":
        sheet.append_row(["ID", "Name", "Phone", "Email", "Age", "Blood Group", "Join Date", "Is Completed"])
    elif sheet_name == "Appointments":
        sheet.append_row(["ID", "Patient ID", "Date", "Time", "Type", "Doctor", "Status", "Planned Cost"])
    elif sheet_name == "Treatments":
        sheet.append_row(["ID", "Patient ID", "Date", "Type", "Doctor", "Cost", "Notes", "Status"])
    elif sheet_name == "Payments":
        sheet.append_row(["ID", "Patient ID", "Date", "Amount", "Method", "Treatment ID"])
    return sheet

# ── BACKGROUND TASK FUNCTIONS ───────────────────────────────────────────────

def backup_patient(patient_data):
    """Expects a dictionary representing a patient record"""
    sheet = get_sheet("Patients")
    if not sheet: return
    
    row = [
        patient_data.get("id", ""),
        patient_data.get("name", ""),
        patient_data.get("phone", ""),
        patient_data.get("email", ""),
        patient_data.get("age", ""),
        patient_data.get("blood_group", ""),
        patient_data.get("join_date", ""),
        patient_data.get("is_completed", 0)
    ]
    try:
        sheet.append_row(row)
    except Exception as e:
        print(f"Failed to backup patient to Google Sheets: {e}")

def backup_appointment(appt_data):
    sheet = get_sheet("Appointments")
    if not sheet: return
    
    row = [
        appt_data.get("id", ""),
        appt_data.get("patient_id", ""),
        appt_data.get("date", ""),
        appt_data.get("time", ""),
        appt_data.get("type", ""),
        appt_data.get("doctor", ""),
        appt_data.get("status", ""),
        appt_data.get("planned_cost", 0)
    ]
    try:
        sheet.append_row(row)
    except Exception as e:
        print(f"Failed to backup appointment to Google Sheets: {e}")

def backup_payment(payment_data):
    sheet = get_sheet("Payments")
    if not sheet: return
    
    row = [
        payment_data.get("id", ""),
        payment_data.get("patient_id", ""),
        payment_data.get("date", ""),
        payment_data.get("amount", 0),
        payment_data.get("method", ""),
        payment_data.get("treatment_id", "")
    ]
    try:
        sheet.append_row(row)
    except Exception as e:
        print(f"Failed to backup payment to Google Sheets: {e}")

def backup_treatment(treatment_data):
    sheet = get_sheet("Treatments")
    if not sheet: return
    
    row = [
        treatment_data.get("id", ""),
        treatment_data.get("patient_id", ""),
        treatment_data.get("date", ""),
        treatment_data.get("type", ""),
        treatment_data.get("doctor", ""),
        treatment_data.get("cost", 0),
        treatment_data.get("notes", ""),
        treatment_data.get("status", "")
    ]
    try:
        sheet.append_row(row)
    except Exception as e:
        print(f"Failed to backup treatment to Google Sheets: {e}")
