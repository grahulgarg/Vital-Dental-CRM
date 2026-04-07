// src/api.js  –  All calls to the FastAPI backend
// Set REACT_APP_API_URL in .env.production when deploying to Vercel

// Auto-detect Vercel environment: use relative /api path bridging the monorepo
const BASE = process.env.NODE_ENV === "production" 
  ? "/api" 
  : (process.env.REACT_APP_API_URL || "http://localhost:8000");

async function req(method, path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      if (res.status === 504) throw new Error("Server took too long to respond (Cold Start). Please try again.");
      if (res.status === 500) throw new Error("Internal Server Error. The database might be waking up.");
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  } catch (err) {
    throw new Error(err.message === "Failed to fetch" ? "Network error: Server might be unavailable." : err.message);
  }
}

// ── Patients ──────────────────────────────────────────────────────────────────
export const getPatients      = ()           => req("GET",    "/patients");
export const getPatient       = (id)         => req("GET",    `/patients/${id}`);
export const createPatient    = (data)       => req("POST",   "/patients", data);
export const updatePatient    = (id, data)   => req("PUT",    `/patients/${id}`, data);
export const deletePatient    = (id)         => req("DELETE", `/patients/${id}`);

// ── Appointments ──────────────────────────────────────────────────────────────
export const getAppointmentsByDate = (date)  => req("GET",    `/appointments?date=${date}`);
export const createAppointment = (pid, data) => req("POST",   `/patients/${pid}/appointments`, data);
export const updateAppointment = (pid, aid, data) => req("PUT", `/patients/${pid}/appointments/${aid}`, data);
export const deleteAppointment = (pid, aid)  => req("DELETE", `/patients/${pid}/appointments/${aid}`);

// ── Treatments & Meds ─────────────────────────────────────────────────────────
export const createTreatment  = (pid, data)  => req("POST",   `/patients/${pid}/treatments`, data);
export const updateTreatment  = (pid, tid, data) => req("PUT", `/patients/${pid}/treatments/${tid}`, data);
export const deleteTreatment  = (pid, tid)   => req("DELETE", `/patients/${pid}/treatments/${tid}`);
export const createMedication = (pid, data)  => req("POST",   `/patients/${pid}/medications`, data);
export const deleteMedication = (pid, mid)   => req("DELETE", `/patients/${pid}/medications/${mid}`);

// ── Finance ───────────────────────────────────────────────────────────────────
export const createPayment    = (pid, data)  => req("POST",   `/patients/${pid}/payments`, data);
export const updatePayment    = (pid, pyid, data) => req("PUT", `/payments/${pyid}`, data);
export const deletePayment    = (pid, pyid)  => req("DELETE", `/payments/${pyid}`);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getStats         = ()           => req("GET",    "/stats");
export const getFinanceAnalysis = (start, end) => {
    let q = new URLSearchParams();
    if(start) q.append("start_date", start);
    if(end) q.append("end_date", end);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return req("GET", `/finance/analysis${qs}`);
};

export const getFinanceSummary = (start, end) => {
    let q = new URLSearchParams();
    if(start) q.append("start_date", start);
    if(end) q.append("end_date", end);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return req("GET", `/finance/summary${qs}`);
};
