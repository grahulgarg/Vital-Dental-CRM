# Vital Dental CRM: System Architecture & Deployment Report

This document outlines the current technical state of the Vital Dental CRM, including the software architecture, database management, and cloud hosting configuration.

## 1. Software Architecture

The application follows a modern **Client-Server** architecture designed for scalability and ease of deployment.

-   **Frontend**: Built with **React** using the Vite build tool. It provides a responsive, single-page interface for managing patients, appointments, and financial records.
-   **Backend**: Powered by **FastAPI** (Python). This serves as a high-performance RESTful API that handles business logic, database interactions, and third-party integrations (like WhatsApp reminders and Google Sheets).
-   **Integration**: Seamless routing is managed via `vercel.json` rewrites, allowing the frontend to communicate with the backend under the same domain (`/api/*` routes).

## 2. Database System

The project has successfully transitioned from a local-only setup to a professional cloud-hosted database.

-   **Database Type**: **PostgreSQL** (Relational Database).
-   **Provider**: **Supabase** (Cloud-hosted).
-   **Legacy Transition**: Migrated approximately 70 patient records and their associated clinical/financial history from a local `sqlite3` database (`dental.db`) to Supabase.
-   **Schema Management**: The backend automatically handles table creation and schema migrations (e.g., adding `is_completed`, `planned_cost`, and `review_status` columns) during deployment.

## 3. Connection & Networking

To ensure reliability across different network environments (especially IPv4/IPv6 compatibility), we implemented a robust connection strategy:

-   **Connection Pooling**: Utilizing Supabase's **Built-in Connection Pooler**.
-   **Connection Mode**: **Session Mode** (running on port **6543**). This was specifically chosen to solve "Host resolution" issues and ensure Vercel's serverless functions can always reach the database.
-   **Driver**: **`psycopg` (v3)** – the most modern and efficient PostgreSQL adapter for Python, used for both direct and pooled connections.

## 4. Hosting & Deployment

The entire system is deployed in a unified **Monorepo** structure.

-   **Hosting Provider**: **Vercel**.
-   **Frontend Hosting**: Static build of the React application.
-   **Backend Hosting**: **Serverless Python Functions**. Each API request triggers a lightweight serverless execution, ensuring low cost and high availability.
-   **Environment Management**: Sensitive credentials (Database URLs, Google API keys, etc.) are securely managed through Vercel's Environment Variables.

## 5. Data Redundancy (Backup)

For enhanced data safety, the system includes a **secondary backup layer**:
-   **Google Sheets API**: Every time a patient is created or a payment is recorded, a background task automatically mirrors that data to a secure Google Spreadsheet. This provides a human-readable, off-site backup of all critical clinic data.

---
*Report Generated: April 7, 2026*
