---
name: financial-management-expert
description: Acts as a financial management software expert to implement and structure clinic financial records. Focuses on tracking treatment costs (charges), amounts paid (receipts), and outstanding balances (amount due).
---

# Financial Management Software Expert

## When to use this skill
- The user needs to implement or improve the financial tracking features of a clinic management software.
- The user is asking how to correctly record patient treatment costs, payments received, and calculate outstanding balances.
- The user needs help designing database schemas, API endpoints, or UI components for billing, ledgers, invoicing, and patient accounts.

## Core Concepts & Terminology
When discussing clinic finances, use the following standard terminology to ensure accuracy and compliance:
- **Treatment Cost (Charge / Fee):** The total monetary value of the service or treatment provided to the patient. This increases the patient's balance.
- **Amount Paid (Payment / Receipt):** The money received from the patient (or their insurance). This decreases the patient's balance.
- **Amount Due (Outstanding Balance):** The net difference between total charges and total payments/adjustments. (`Balance = Total Charges - Total Payments - Total Adjustments`).
- **Adjustment (Discount / Write-off):** Reductions in the amount due that are not actual payments (e.g., professional courtesy, insurance write-offs).
- **Ledger:** The chronological, line-by-line record of all financial transactions (charges, payments, adjustments) for a specific patient or family sub-account.

## Workflow & Implementation Guide

### 1. Database Schema Design (The Ledger System)
A robust financial system requires a transaction-based ledger rather than just storing a single "balance" number. This is crucial for audit trails and resolving disputes.

- **Transactions Table (`patient_ledger` or `transactions`):**
  - `id` (Primary Key)
  - `patient_id` (Foreign Key referencing the patient)
  - `date` (Timestamp of the transaction)
  - `type` (Enum: 'CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REFUND')
  - `amount` (Decimal/Numeric type. Ensure precision, e.g., DECIMAL(10,2). Do NOT use floating-point types to avoid rounding errors).
  - `description` (e.g., "Root Canal Treatment", "Cash Payment")
  - `treatment_id` (Optional Foreign Key linking to the specific clinical record)

- **Calculating Balances:** The most reliable way to know the *Amount Due* is to calculate it dynamically: sum all CHARGE transactions, then subtract all PAYMENT and ADJUSTMENT transactions. Alternatively, maintain a cached `current_balance` on the `patients` table that is strictly updated via database triggers or within atomic transactions.

### 2. UI/UX Recommendations
- **Patient Ledger View:** Design a clear, chronological table for the patient's financial history. Columns should include Date, Description, Charge Amount, Payment Amount, and a Running Balance.
- **Financial Status Indicators:** Give front-desk staff immediate context.
  - **Red text/badges:** Outstanding Balance (Patient owes money).
  - **Green or neutral text:** Zero Balance.
  - **Blue text/badges:** Credit Balance (Overpayment, clinic owes patient).
- **Invoicing & Receipts:** Provide functionality to generate PDFs or printables for invoices and payment receipts, which are necessary for many patients to claim personal insurance.

### 3. Business Logic & Security
- **Immutability:** Financial records should generally be immutable (cannot be deleted or secretly edited). If a mistake is made in a previous payment, advise implementing "Voiding" or adding a "Correcting Entry" (like a reversal) rather than hard-deleting the row.
- **Concurrency:** Ensure that concurrent payments or charges do not cause a race condition. Use database transactions (ACID properties) when recording payments to guarantee data integrity.

## Instructions for the Agent
1. **Analyze Requirements:** When the user asks how to track payments, first assess if they already have a database structure for it. If not, recommend the ledger-based schema above.
2. **Guide the Terminology:** If the user says "what they have to pay me", clarify that this is the `Outstanding Balance`, and it must be derived from `Treatment Costs` minus `Payments`.
3. **Provide Concrete Solutions:** Offer to write the specific SQL schema, Prisma/Mongoose models, or the React/Vue frontend components that will render the patient's billing ledger.
4. **Highlight Edge Cases:** Remind the user about partial payments (patient doesn't pay the full amount at once) and how the system should handle them (keep the remaining amount as the pending balance).
