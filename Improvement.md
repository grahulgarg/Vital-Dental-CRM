# Vital Dental Dashboard - System Improvements Report

Based on the `SKILL.md` heuristics for premium dental clinic management systems, I have reviewed the current state of the backend (`database.py`, `main.py`) and the frontend (`App.jsx`). Below is a gap analysis and a technical proposal for improvements.

## 1. Patient Handling & Database Safeguards

**Current State:**
- The `patients` table stores `age` as an integer rather than a Date of Birth (DOB). 
- There is no uniqueness constraint on phone numbers. 
- There are no soft-checks for duplicate patients.

**Proposed Improvements:**
- **Database Schema Updates:**
  - Replace the `age` column with a `dob` (Date of Birth) `TEXT` column to calculate age dynamically and accurately over time.
  - Add a `UNIQUE` constraint to the `phone` column to prevent accidental duplicate entries.
- **Backend Logic (Anti-Duplication):**
  - Implement a family/guarantor linking system if multiple patients share the same phone number (e.g., a child sharing a parent's phone).
  - Add a pre-flight "soft-check" in the `POST /patients` endpoint: if a patient is submitted with the same `First Name + Last Name + DOB`, return a 409 Conflict warning requiring explicit user override.
- **UI Enhancements:**
  - The current "Patient Detail" view is decent, but consider moving the quick-stats (Next Appointment, Active Meds, Balance) into a collapsible sticky sidebar across the entire app so context isn't lost when navigating.

## 2. Appointment Scheduling (The Calendar)

**Current State:**
- Appointments are displayed as a simple scrollable table/list.
- Appointment statuses are limited to 'Scheduled', 'Completed', and 'Cancelled'.
- No daily revenue/production goals are tracked or displayed.

**Proposed Improvements:**
- **UI Architecture:** Implement a true CSS Grid or library-based multi-provider Calendar View. Each column should represent a provider (Dr. Mehta, Dr. Singh) or an operatory (Hygiene 1, Chair 2), mapped to time blocks.
- **Granular Status Indicators:** Update the database and API to support a broader lifecycle: `Unconfirmed`, `Confirmed`, `Patient Arrived`, `In Chair`, and `Checked Out`. Pair these with distinct UI colored badges/icons.
- **Production Goals Widget:** Add a header widget on the Dashboard and Calendar views aggregating the estimated `cost` of all `Scheduled` and `Completed` treatments for the day against a set clinic goal.

## 3. Finance & Billing Tracking

**Current State:**
- Finances are overly simplified: there is only a `cost` column attached to `treatments`. There is no ledger, no record of payments, and no way to track outstanding balances.

**Proposed Improvements:**
- **New Ledger Database Tables:** 
  - `invoices` (links to treatments/appointments)
  - `payments` (records payments made by the patient or insurance)
  - `adjustments` (discounts or write-offs).
- **Aged Receivables:** Create a dashboard module categorizing outstanding patient balances into 0-30, 31-60, and 90+ days to aid the front desk in collections.
- **Insurance:** If applicable, add a simple `ins_status` to invoices (e.g., `Billed`, `Paid`, `Denied`) to track insurance claim lifecycles.

## 4. General UX Heuristics

**Current State:**
- The system uses basic inline styles with a generally clean aesthetic but lacks quick-action accessibility.

**Proposed Improvements:**
- **Global Actions:** Introduce a persistent "Global Add" FAB (Floating Action Button) or a header "+" menu to quickly create a New Patient or Schedule an Appointment from any screen without navigating to a specific tab.
- **Data Density:** Tighten table padding and utilize sticky table headers for the "All Appointments" view so the user maintains context while scrolling through large lists.
