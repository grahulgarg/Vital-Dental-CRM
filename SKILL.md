---
name: designing-dental-dashboards
description: Researches and analyzes dental clinic management software to recommend improvements for dashboard UI, patient handling, scheduling, finance management, and database integrity. Use when the user wants to create or improve a clinic management system.
---

# Designing Dental Clinic Management Systems

## When to use this skill
- The user requests a new design or layout for a dental clinic management software dashboard.
- The user asks for improvements to patient handling, scheduling, or finance modules.
- The user needs help structuring their clinic's database, specifically regarding patient identity safeguards.
- The user wants to research existing dental software (like Curve Dental, CareStack, Dentrix Ascend) for best practices in overall clinic management.

## Workflow
1. [ ] **Information Gathering**: Review the user's current codebase or requirements using file reading tools. Identify existing structures for the dashboard, patients, appointments, and finances.
2. [ ] **Competitive Research**: Research best practices in modern dental/medical management applications for handling complex data (patient records, multi-provider scheduling, billing ledgers).
3. [ ] **Database & Logic Analysis**: Analyze the current data models. Specifically look for safeguards against duplicate identities and inefficient queries.
4. [ ] **UI/UX & Feature Gap Identification**: Compare the current frontend and planned features against premium management software standards. 
5. [ ] **Recommendation Formulation**: Draft an artifact (e.g., `system_recommendations.md`) outlining architectural, database, and UI/UX changes.
6. [ ] **Validation Loop**: Present the recommendations to the user and iterate based on feedback.
7. [ ] **Execution**: Create an implementation plan and execute the code changes.

## Instructions

### 1. Dashboard & General UI Heuristics
- **Visual Hierarchy**: Critical actions ("New Appointment", "Search Patient", "Checkout") must be immediately accessible.
- **Data Density**: Balance a clean aesthetic with the high data density required by front desk staff. Use cards, concise tables, and sticky headers.
- **Color Psychology**: Use soft, sterile colors (blues, teals, clean whites/grays) for the main interface. Reserve high-contrast colors (reds, oranges) strictly for alerts, overdue balances, or cancelled appointments.

### 2. Patient Handling & Database Safeguards
- **Identity Resolution (Anti-Duplication)**:
    - **Phone Number Uniqueness**: The system must enforce unique primary phone numbers. If a new patient attempts to use an existing number (e.g., a family member), the UI should prompt to link the accounts under a "Family/Guarantor" structure rather than creating a duplicate standalone record.
    - **Name & DOB Hashing**: Implement a soft-check safeguard. If a new record matches the `First Name + Last Name + Date of Birth` of an existing active patient, the system must warn the user and require explicit override permission to prevent duplicate charting.
- **Quick-View Panels**: Patient profiles should have a "glanceable" sidebar containing medical alerts (allergies, premeds), upcoming appointments, and total account balance.

### 3. Appointment Scheduling (The Calendar)
- **Multi-Provider/Operatory Views**: The calendar must support viewing multiple columns (e.g., Dr. Smith, Dr. Jones, Hygiene 1) simultaneously.
- **Status Indicators**: Use clear visual cues (colors or small icons) to indicate appointment status: Unconfirmed, Confirmed, Patient Arrived, In Chair, Checked Out.
- **Production Goals**: Display daily scheduled production (revenue) versus the daily goal directly on the calendar header to motivate the team.

### 4. Finance & Billing Handling
- **Clear Ledgers**: Patient billing ledgers must distinctly separate "Charges" (procedures completed), "Payments" (patient or insurance payments), and "Adjustments" (discounts or write-offs).
- **Aged Receivables**: The finance dashboard must highlight aged accounts (30, 60, 90+ days past due) to facilitate easy follow-up by the billing team.
- **Insurance Tracking**: If applicable, ensure the system can track claims sent vs. claims paid, flagging claims that have been outstanding for over 30 days.

### 5. Formulating Recommendations
When providing advice to the user, be specific and technical:
- Provide database schema adjustments (e.g., "Add a `UNIQUE CONSTRAINT` on the `phone_number` column in the `patients` table").
- Propose layout structures (e.g., "Use a CSS Grid layout for the calendar to ensure operatory columns remain equal width while scrolling vertically through time slots").

## Resources
- Ensure all database recommendations consider the specific SQL/NoSQL technology the user is currently utilizing.
- Review existing global CSS/Tailwind configs to align UI recommendations with the established brand protocol.
