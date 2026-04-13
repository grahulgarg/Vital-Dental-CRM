import { useState, useEffect, useCallback } from "react";
import * as api from "./api";
import { DashboardCalendar } from "./Calendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';

const TODAY = new Date().toISOString().split("T")[0];
const DOCTORS = ["Dr. Pragati Singh"];
const TREATMENT_TYPES = ["Root Canal", "Cleaning", "Extraction", "Filling", "Crown",
  "Implant", "Braces Consult", "Whitening", "X-Ray", "Checkup"];

const STATUSES = ["Unconfirmed", "Confirmed", "Arrived", "In Chair", "Checked Out", "Scheduled", "Completed", "Cancelled", "Rescheduled"];

// ── Tiny UI primitives ────────────────────────────────────────────────────────
const Avatar = ({ name = "?", size = 40 }) => {
  const colors = ["#1a6b5a","#2d4a8a","#7a3a6a","#5a2d8a","#8a4a2d","#2d6a7a"];
  const idx = name.charCodeAt(0) % colors.length;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:colors[idx],
      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.35, fontWeight:700, flexShrink:0 }}>{initials}</div>
  );
};

const Badge = ({ status }) => {
  const s = { 
    Completed:   {bg:"#d1fae5", c:"#065f46"}, 
    Scheduled:   {bg:"#dbeafe", c:"#1e40af"},
    Unconfirmed: {bg:"#fef9c3", c:"#854d0e"},
    Confirmed:   {bg:"#dbeafe", c:"#1e40af"},
    Arrived:     {bg:"#ffedd5", c:"#9a3412"},
    "In Chair":  {bg:"#e0e7ff", c:"#3730a3"},
    "Checked Out":{bg:"#d1fae5", c:"#065f46"},
    Cancelled:   {bg:"#fee2e2", c:"#991b1b"} 
  }[status] || {bg:"#f3f4f6",c:"#374151"};
  return <span style={{ background:s.bg, color:s.c, padding:"2px 10px",
    borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{status}</span>;
};

const Modal = ({ title, onClose, children, isMobile }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
    display:"flex", alignItems: isMobile ? "flex-end" : "center",
    justifyContent:"center", zIndex:1000,
    padding: isMobile ? 0 : 20 }}
    onClick={onClose}>
    <div style={{ background:"#fff",
      borderRadius: isMobile ? "20px 20px 0 0" : 16,
      padding: isMobile ? "24px 20px 32px" : 32,
      width:"100%",
      maxWidth: isMobile ? "100%" : 520,
      maxHeight: isMobile ? "92vh" : "90vh",
      overflowY:"auto",
      boxShadow:"0 -4px 40px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{title}</h2>
        <button onClick={onClose} style={{ border:"none", background:"#f3f4f6",
          borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center", color:"#6b7280" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom:16 }}>
    {label && <label style={{ display:"block", fontSize:13, fontWeight:600,
      color:"#374151", marginBottom:6 }}>{label}</label>}
    <input style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb",
      borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box",
      background:"#fafafa", fontFamily:"inherit" }} {...p} />
  </div>
);

const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom:16 }}>
    {label && <label style={{ display:"block", fontSize:13, fontWeight:600,
      color:"#374151", marginBottom:6 }}>{label}</label>}
    <select style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb",
      borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box",
      background:"#fafafa", fontFamily:"inherit" }} {...p}>{children}</select>
  </div>
);

const Btn = ({ children, variant="primary", small, loading, ...p }) => {
  const v = { primary:{background:"#111827",color:"#fff"},
    danger:{background:"#ef4444",color:"#fff"},
    ghost:{background:"#f3f4f6",color:"#374151"},
    success:{background:"#059669",color:"#fff"} }[variant];
  return (
    <button style={{ ...v, border:"none", borderRadius:8,
      padding:small?"6px 14px":"10px 20px", fontSize:small?12:14,
      fontWeight:600, cursor:loading?"wait":"pointer", fontFamily:"inherit",
      opacity:loading?0.7:1 }} {...p}>
      {loading ? "..." : children}
    </button>
  );
};

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
    height:"100%", padding:60, color:"#9ca3af", fontSize:15 }}>
    Loading…
  </div>
);

const ErrorBanner = ({ msg, onRetry }) => (
  <div style={{ background:"#fee2e2", color:"#991b1b", padding:"12px 20px",
    borderRadius:10, margin:20, display:"flex", justifyContent:"space-between" }}>
    <span>⚠️ {msg}</span>
    {onRetry && <button onClick={onRetry} style={{ background:"none", border:"none",
      color:"#991b1b", fontWeight:700, cursor:"pointer" }}>Retry</button>}
  </div>
);

// ── Mobile detection hook ─────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function DentalDashboard() {
  const isMobile = useIsMobile();
  const [patients,         setPatients]         = useState([]);
  const [stats,            setStats]            = useState(null);
  const [view, setView] = useState("appointments"); // default: appointments (best on mobile)
  const [calendarDate, setCalendarDate] = useState(TODAY);
  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [patientTab,       setPatientTab]       = useState("overview");
  const [search,           setSearch]           = useState("");
  const [modal,            setModal]            = useState(null);
  const [form,             setForm]             = useState({});
  const [toast,            setToast]            = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState(null);
  const [apptsView,        setApptsView]        = useState("list");
  const [archiveExpanded,  setArchiveExpanded]  = useState(false);
  const [mobileApptDate,   setMobileApptDate]   = useState(TODAY);

  // Finance states
  const [revenueTab,       setRevenueTab]       = useState("summary");
  const [financeDates,     setFinanceDates]     = useState({ start: "", end: "" });
  const [financeData,      setFinanceData]      = useState(null);  // legacy analytics
  const [financeSummary,   setFinanceSummary]   = useState(null);
  const [financeLoading,   setFinanceLoading]   = useState(false);
  const [arFilter,         setArFilter]         = useState("all");  // all | recent | overdue
  const [collectionsSearch, setCollectionsSearch] = useState("");

  // Reminders states
  const [remindersTab,     setRemindersTab]     = useState("today");
  const [remindersData,    setRemindersData]    = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pts, st] = await Promise.all([api.getPatients(), api.getStats()]);
      setPatients(pts);
      setStats(st);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFinanceAnalysis(financeDates.start, financeDates.end);
      setFinanceData(data);
    } catch(err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [financeDates]);

  const loadFinanceSummary = useCallback(async () => {
    try {
      setFinanceLoading(true);
      const data = await api.getFinanceSummary(financeDates.start, financeDates.end);
      setFinanceSummary(data);
    } catch(err) {
      showToast(err.message, "error");
    } finally {
      setFinanceLoading(false);
    }
  }, [financeDates]);

  const loadRemindersData = useCallback(async () => {
    try {
      setLoading(true);
      const targetDate = new Date();
      if (remindersTab === "tomorrow") {
          targetDate.setDate(targetDate.getDate() + 1);
      }
      const dateStr = targetDate.toISOString().split("T")[0];
      const data = await api.getAppointmentsByDate(dateStr);
      setRemindersData(data);
    } catch(err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [remindersTab]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (view === "revenue") {
      loadFinanceSummary();
    }
  }, [view, financeDates, loadFinanceSummary]);

  useEffect(() => {
    if (view === "reminders") {
      loadRemindersData();
    }
  }, [view, remindersTab, loadRemindersData]);

  useEffect(() => {
    if (selectedPatient) {
      const fresh = patients.find(p => p.id === selectedPatient.id);
      if (fresh) setSelectedPatient(fresh);
    }
  }, [patients]);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closeModal = () => { setModal(null); setForm({}); };

  const addPatient = async (force=false) => {
    if (!form.name || !form.phone) return;
    
    // Check locally for existing patient by phone number (strip spaces/characters)
    const cleanPhone = form.phone.replace(/[\s\-()+]/g, "");
    const matchingPatient = patients.find(p => p.phone && p.phone.replace(/[\s\-()+]/g, "") === cleanPhone);

    if (matchingPatient) {
      showToast(`Profile already exists for ${matchingPatient.name}`, "info");
      openPatient(matchingPatient);
      closeModal();
      return;
    }

    setSaving(true);
    try {
      const created = await api.createPatient({
        name: form.name, phone: form.phone, email: form.email,
        age: form.age ? Number(form.age) : null, address: form.address || "",
        blood_group: form.bloodGroup, force
      });
      
      const isExisting = patients.some(p => p.id === created.id);
      if (!isExisting) {
        setPatients(prev => [...prev, created]);
        showToast(`${created.name} added`);
      } else {
        showToast(`Matching record found for ${created.name}`, "info");
      }
      
      openPatient(created);
      closeModal();
      api.getStats().then(setStats);
    } catch(e) { 
      showToast(e.message, "error"); 
    }
    finally { setSaving(false); }
  };

  const saveEditPatient = async () => {
    setSaving(true);
    try {
      const updated = await api.updatePatient(selectedPatient.id, {
        name: form.name, phone: form.phone, email: form.email,
        age: form.age ? Number(form.age) : null, address: form.address || "", 
        bloodGroup: form.bloodGroup
      });
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPatient(updated);
      showToast("Patient updated");
      closeModal();
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const removePatient = async () => {
    setSaving(true);
    try {
      await api.deletePatient(selectedPatient.id);
      setPatients(prev => prev.filter(p => p.id !== selectedPatient.id));
      setSelectedPatient(null); setView("patients");
      showToast("Patient deleted", "error");
      closeModal();
      api.getStats().then(setStats);
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const addAppointment = async () => {
    if (!form.date || !form.time || !form.type) return;
    setSaving(true);
    try {
      const created = await api.createAppointment(selectedPatient.id, {
        date: form.date, time: form.time, type: form.type,
        doctor: form.doctor || DOCTORS[0], status: form.status || "Scheduled",
        plannedCost: Number(form.plannedCost) || 0
      });
      const updated = { ...selectedPatient, appointments: [...selectedPatient.appointments, created] };
      setSelectedPatient(updated);
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      showToast("Appointment scheduled");
      closeModal();
      api.getStats().then(setStats);
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const changeApptStatus = async (apptId, status) => {
    try {
      const updated = await api.updateAppointment(selectedPatient.id, apptId, { status });
      const newAppts = selectedPatient.appointments.map(a => a.id === apptId ? updated : a);
      const updatedPt = { ...selectedPatient, appointments: newAppts };
      setSelectedPatient(updatedPt);
      setPatients(prev => prev.map(p => p.id === updatedPt.id ? updatedPt : p));
      showToast(`Marked as ${status}`);
      api.getStats().then(setStats);
      loadAll();
    } catch(e) { showToast(e.message, "error"); }
  };

  const completeAppointment = async () => {
      if (!form.apptId || !form.patientId) return;
      setSaving(true);
      try {
          // 1. Update Appointment
          await api.updateAppointment(form.patientId, form.apptId, { status: "Completed" });
          
          // 2. Create Treatment
          const treatment = await api.createTreatment(form.patientId, {
             date: TODAY, type: form.type || "Treatment", 
             doctor: form.doctor || DOCTORS[0], cost: Number(form.finalAmount) || 0,
             status: "Completed", notes: form.notes || ""
          });

          // 3. Create Payment based on final amount
          if (Number(form.finalAmount) > 0) {
              await api.createPayment(form.patientId, {
                  treatment_id: treatment.id, date: TODAY, amount: Number(form.finalAmount), method: form.method || "Cash"
              });
          }

          showToast("Appointment Completed and Account Updated");
          closeModal();
          loadAll();
      } catch (e) { showToast(e.message, "error"); }
      finally { setSaving(false); }
  };

  const rescheduleAppointment = async () => {
      if (!form.apptId || !form.patientId || !form.date || !form.time) return;
      setSaving(true);
      try {
          await api.updateAppointment(form.patientId, form.apptId, { 
              date: form.date, time: form.time, status: "Rescheduled", doctor: form.doctor
          });
          showToast("Appointment Rescheduled");
          closeModal();
          loadAll();
      } catch (e) { showToast(e.message, "error"); }
      finally { setSaving(false); }
  };

  const cancelAppointmentStatus = async (patientId, apptId) => {
      if (!window.confirm("Are you sure you want to mark this appointment as Cancelled?")) return;
      try {
          await api.updateAppointment(patientId, apptId, { status: "Cancelled" });
          showToast("Appointment Cancelled");
          loadAll();
      } catch(e) { showToast(e.message, "error"); }
  };

  const removeAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await api.deleteAppointment(selectedPatient.id, apptId);
      const updatedPt = { ...selectedPatient, appointments: selectedPatient.appointments.filter(a => a.id !== apptId) };
      setSelectedPatient(updatedPt);
      setPatients(prev => prev.map(p => p.id === updatedPt.id ? updatedPt : p));
      showToast("Appointment removed", "error");
      api.getStats().then(setStats);
    } catch(e) { showToast(e.message, "error"); }
  };

  const addTreatment = async () => {
    if (!form.type || !form.date) return;
    setSaving(true);
    try {
      const created = await api.createTreatment(selectedPatient.id, {
        date: form.date, type: form.type,
        doctor: form.doctor || DOCTORS[0],
        cost: Number(form.cost) || 0,
        notes: form.notes || "", status: "Completed"
      });
      const updatedPt = { ...selectedPatient, treatments: [created, ...selectedPatient.treatments] };
      setSelectedPatient(updatedPt);
      setPatients(prev => prev.map(p => p.id === updatedPt.id ? updatedPt : p));
      showToast("Treatment saved");
      closeModal();
      api.getStats().then(setStats);
      loadAll(); // Re-fetch all to get the created invoice
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const saveEditTreatment = async () => {
     if (!form.id || !form.type || !form.date) return;
     setSaving(true);
     try {
       const updated = await api.updateTreatment(selectedPatient.id, form.id, {
           date: form.date, type: form.type, doctor: form.doctor,
           cost: Number(form.cost) || 0, notes: form.notes || ""
       });
       showToast("Treatment updated");
       closeModal();
       loadAll();
     } catch(e) { showToast(e.message, "error"); }
     finally { setSaving(false); }
  };

  const removeTreatment = async (id) => {
      if (!window.confirm("Are you sure you want to delete this treatment record? It will permanently alter the ledger.")) return;
      try {
          await api.deleteTreatment(selectedPatient.id, id);
          showToast("Treatment deleted", "error");
          loadAll();
      } catch(e) { showToast(e.message, "error"); }
  };

  const addMedication = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const created = await api.createMedication(selectedPatient.id, {
        name: form.name, dosage: form.dosage || "",
        duration: form.duration || "", prescribed: TODAY
      });
      const updatedPt = { ...selectedPatient, medications: [created, ...selectedPatient.medications] };
      setSelectedPatient(updatedPt);
      setPatients(prev => prev.map(p => p.id === updatedPt.id ? updatedPt : p));
      showToast("Medication added");
      closeModal();
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const removeMedication = async (medId) => {
    try {
      await api.deleteMedication(selectedPatient.id, medId);
      const updatedPt = { ...selectedPatient, medications: selectedPatient.medications.filter(m => m.id !== medId) };
      setSelectedPatient(updatedPt);
      setPatients(prev => prev.map(p => p.id === updatedPt.id ? updatedPt : p));
      showToast("Medication removed", "error");
    } catch(e) { showToast(e.message, "error"); }
  };
  
  const addPayment = async () => {
    const col = Number(form.amount) || 0;
    if (!col) return;

    setSaving(true);
    try {
      const date = form.date || TODAY;
      await api.createPayment(selectedPatient.id, {
          treatment_id: form.treatmentId || null,
          date: date, amount: col, method: form.method || "Cash"
      });
      
      showToast("Payment recorded successfully");
      closeModal();
      loadAll();
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  }

  const removePayment = async (pyid) => {
      if (!window.confirm("Are you sure you want to delete this payment record?")) return;
      try {
          await api.deletePayment(selectedPatient.id, pyid);
          showToast("Payment deleted", "error");
          loadAll();
      } catch(e) { showToast(e.message, "error"); }
  };

  const saveEditPayment = async () => {
    const col = Number(form.amount) || 0;
    if (!col || !form.id) return;
    setSaving(true);
    try {
        await api.updatePayment(selectedPatient.id, form.id, {
            amount: col, method: form.method || "Cash", date: form.date || TODAY
        });
        showToast("Payment updated");
        closeModal();
        loadAll();
    } catch(e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const markPatientComplete = async (isCompleted) => {
    try {
      const updated = await api.updatePatient(selectedPatient.id, { isCompleted });
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPatient(updated);
      showToast(isCompleted ? `${updated.name} moved to Archive` : `${updated.name} restored to Active`);
    } catch(e) { showToast(e.message, "error"); }
  };

  // ── WhatsApp Review Request ──────────────────────────────────────────────────
  const GMB_LINK = "https://share.google/X1XreHKupu3KZXa2B";

  const sendReviewRequest = (patientName, patientPhone) => {
    if (!patientPhone) {
      showToast("No phone number on record for this patient", "error");
      return;
    }
    // Sanitise phone: strip spaces, dashes, parentheses; keep leading +
    const cleanPhone = patientPhone.replace(/[\s\-()]/g, "");
    const message = `Hi ${patientName}! It was great seeing you at Vital Dental today. We hope your experience was comfortable and painless! If you have a moment, we would love it if you could share your experience here: ${GMB_LINK}. Keep smiling! - Dr. Pragati Singh & Team.`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Update a patient's review status ("pending" | "reviewed") via the API
  const updateReviewStatus = async (patientId, reviewStatus) => {
    try {
      const updated = await api.updatePatient(patientId, { reviewStatus });
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPatient?.id === patientId) setSelectedPatient(updated);
      showToast(reviewStatus === "reviewed" ? "Marked as Reviewed ✅" : "Reset to Pending");
    } catch(e) { showToast(e.message, "error"); }
  };

  // ── WhatsApp Appointment Reminders ──────────────────────────────────────────
  const sendWhatsAppReminder = async (appointment, isTomorrow) => {
    if (!appointment.patient_phone) {
      showToast("No phone number on record for this patient", "error");
      return;
    }
    const cleanPhone = appointment.patient_phone.replace(/[\s\-()]/g, "");
    const GMB_LINK = "https://share.google/X1XreHKupu3KZXa2B";
    
    let message = "";
    if (isTomorrow) {
      message = `Hi ${appointment.patient_name}, this is a friendly reminder of your appointment at Vital Dental tomorrow at ${appointment.time}.\n\nPlease reply with:\n✅ 'Yes' to confirm\n🗓️ 'Reschedule' if you need a different time\n\n📍 Clinic Directions: ${GMB_LINK}\n\n- Dr. Pragati Singh & Team`;
    } else {
      message = `Hi ${appointment.patient_name}, we are looking forward to seeing you today at ${appointment.time} at Vital Dental.\n\n📍 Clinic Directions: ${GMB_LINK}\n\nPlease let us know if you are running late or need to reschedule. See you soon!\n\n- Dr. Pragati Singh & Team`;
    }
    
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");

    try {
      // Mark as sent in DB
      await api.updateAppointment(appointment.patient_id, appointment.id, { reminderSent: true });
      // Update local state so UI reflects it immediately
      setRemindersData(prev => prev.map(a => a.id === appointment.id ? { ...a, reminder_sent: 1 } : a));
      showToast("Reminder marked as sent!");
    } catch (e) {
      showToast("Opened WhatsApp, but failed to save status.", "error");
    }
  };

  const openPatient = (p) => { setSelectedPatient(p); setPatientTab("overview"); setView("patient-detail"); };

  const filteredPatients = patients
    .filter(p => p && (
      (p.name||"").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone||"").includes(search) ||
      (p.email||"").toLowerCase().includes(search.toLowerCase())
    ))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activePatients = filteredPatients.filter(p => !p.isCompleted);
  const completedPatients = filteredPatients.filter(p => p.isCompleted).sort((a, b) => {
    const aDate = a.treatments?.[0]?.date || a.timestamp || "1970-01-01";
    const bDate = b.treatments?.[0]?.date || b.timestamp || "1970-01-01";
    return bDate.localeCompare(aDate);
  });

  const allAppointments = activePatients.flatMap(p =>
    (p.appointments||[]).map(a => ({ ...a, patientName: p.name, patientId: p.id }))
  ).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const navItems = [
    { id:"dashboard",   label:"Dashboard",    icon:"⊞" },
    { id:"patients",    label:"Patients",     icon:"👥" },
    { id:"appointments",label:"Appointments", icon:"📅" },
    { id:"treatments",  label:"Treatments",   icon:"🦷" },
    { id:"revenue",     label:"Revenue",      icon:"💰" },
    { id:"reminders",   label:"Reminders",    icon:"🔔" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter','Segoe UI',sans-serif",
      background:"#f8fafc", color:"#111827" }}>

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      {!isMobile && (
        <div style={{ width:220, background:"#0f172a", display:"flex",
          flexDirection:"column", padding:"24px 0", flexShrink:0 }}>
          <div style={{ padding:"0 20px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, background:"#3b82f6", borderRadius:10,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🦷</div>
              <div>
                <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Vital Dental</div>
                <div style={{ color:"#64748b", fontSize:11 }}>Clinic Manager</div>
              </div>
            </div>
          </div>

          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 20px", background:view===item.id?"#1e293b":"transparent",
              border:"none", cursor:"pointer",
              color:view===item.id?"#fff":"#94a3b8",
              fontSize:14, fontWeight:view===item.id?600:400,
              borderLeft:view===item.id?"3px solid #3b82f6":"3px solid transparent",
              textAlign:"left", fontFamily:"inherit" }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}

          <div style={{ marginTop:"auto", padding:"20px", borderTop:"1px solid #1e293b" }}>
            <div style={{ color:"#475569", fontSize:12 }}>Total Patients</div>
            <div style={{ color:"#3b82f6", fontWeight:700, fontSize:24 }}>{patients.length}</div>
            <div style={{ color:"#475569", fontSize:11, marginTop:4 }}>
              {stats?.upcomingCount || 0} upcoming appts
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Top Bar ── */}
      {isMobile && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
          background:"#0f172a", padding:"12px 16px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 12px rgba(0,0,0,0.3)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, background:"#3b82f6", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🦷</div>
            <div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>Vital Dental</div>
              <div style={{ color:"#64748b", fontSize:10 }}>{navItems.find(n=>n.id===view)?.label || "Dashboard"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#3b82f6", fontWeight:700, fontSize:16 }}>{patients.length}</div>
              <div style={{ color:"#475569", fontSize:10 }}>patients</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{ flex:1, overflowY:"auto",
        paddingBottom: isMobile ? 80 : 40,
        paddingTop: isMobile ? 58 : 0 }}>
        {error && <ErrorBanner msg={error} onRetry={loadAll} />}
        {loading && <Spinner />}

        {/* ── DASHBOARD ── */}
        {!loading && view==="dashboard" && (
          <div style={{ padding: isMobile ? 16 : 32 }}>
            <div style={{ marginBottom: isMobile ? 16 : 28 }}>
              <h1 style={{ margin:0, fontSize: isMobile ? 20 : 26, fontWeight:700 }}>Good morning 👋</h1>
              <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:13 }}>Clinic overview · {TODAY}</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 28 }}>
              {[
                { id:"revenue", label:"Daily Revenue Goal", value:`₹${(stats?.dailyRevenue||0).toLocaleString()} / ₹20,000`, color:"#10b981", icon:"🎯" },
                { id:"appointments", label:"Upcoming Appointments", value:stats?.upcomingCount||0, color:"#8b5cf6", icon:"📅" },
                { id:"treatments", label:"Treatments Done", value:stats?.completedTreatments||0, color:"#059669", icon:"✅" },
                { id:"patients", label:"Active Patients", value:stats?.totalPatients||0, color:"#3b82f6", icon:"👥" },
              ].map((s,i) => (
                <div key={i} 
                  onClick={() => setView(s.id)}
                  style={{ background:"#fff", borderRadius:14,
                  padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  border:"1px solid #f1f5f9", cursor:"pointer", transition:"transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform="none"}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontSize:s.value.length>10?20:28, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: isMobile ? 12 : 24 }}>

                <div style={{ background:"#fff", borderRadius:14, padding:24,
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>Today's & Upcoming Appointments</h2>
                    <Btn small variant="ghost" onClick={() => setView("appointments")}>View Calendar →</Btn>
                </div>
                {(stats?.upcomingAppointments||[]).map(a => (
                    <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14,
                    padding:"12px 0", borderBottom:"1px solid #f1f5f9" }}>
                    <Avatar name={a.patient_name||"?"} size={38} />
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>{a.patient_name}</div>
                        <div style={{ color:"#6b7280", fontSize:13 }}>{a.type} · {a.doctor}</div>
                    </div>
                    <div style={{ textAlign:"right", width:110 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"#1e40af" }}>{a.date}</div>
                        <div style={{ color:"#6b7280", fontSize:12 }}>{a.time}</div>
                    </div>
                    <div style={{ width:100, textAlign:"right" }}>
                        <Badge status={a.status} />
                    </div>
                    </div>
                ))}
                {!(stats?.upcomingAppointments?.length) && (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No upcoming appointments</div>
                )}
                </div>

                <div style={{ background:"#fff", borderRadius:14, padding:24,
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9" }}>
                  <DashboardCalendar 
                    appointments={allAppointments} 
                    onPatientClick={(pid) => openPatient(patients.find(x => x.id===pid))}
                    onDateClick={(dateStr) => {
                        setCalendarDate(dateStr);
                        setView("appointments");
                        setApptsView("calendar"); // Ensure it drops into detailed calendar view
                    }}
                  />
                </div>
            </div>
          </div>
        )}

        {/* ── PATIENTS LIST ── */}
        {!loading && view==="patients" && (() => {
          const PatientRow = ({ p }) => {
            const nextAppt = (p.appointments||[]).find(a => !["Completed","Cancelled"].includes(a.status));
            const lastTreatment = (p.treatments||[])[0];
            const totalPaid = (p.payments||[]).reduce((s, py) => s + py.amount, 0);
            return (
              <tr onClick={() => openPatient(p)} style={{ cursor:"pointer", transition:"background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                  <Avatar name={p.name} size={38} />
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{p.name}</div>
                    <div style={{ fontSize:12, color:"#9ca3af" }}>PT-{p.id.toString().padStart(4,"0")}</div>
                  </div>
                </td>
                <td style={{ padding:"14px 16px", fontSize:13, color:"#374151" }}>{p.phone}</td>
                <td style={{ padding:"14px 16px", fontSize:13, color:"#6b7280" }}>
                  {lastTreatment ? lastTreatment.type : "—"}
                </td>
                <td style={{ padding:"14px 16px", fontSize:13, color:"#6b7280", fontWeight:nextAppt ? 600 : 400 }}>
                  {nextAppt ? `${nextAppt.date} ${nextAppt.time}` : "—"}
                </td>
                <td style={{ padding:"14px 16px", textAlign:"center" }}>
                  <span style={{ background:"#eff6ff", color:"#1d4ed8", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                    {(p.appointments||[]).length}
                  </span>
                </td>
                <td style={{ padding:"14px 16px", textAlign:"center" }}>
                  <span style={{ color:"#16a34a", fontWeight:700, fontSize:13 }}>
                    ₹{totalPaid.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          };

          return (
          <div style={{ padding: isMobile ? 14 : 32 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Patients</h1>
                <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>
                  {activePatients.length} active · {completedPatients.length} archived
                </p>
              </div>
              <Btn onClick={() => { setForm({}); setModal("add-patient"); }}>+ Add Patient</Btn>
            </div>

            <input placeholder="🔍  Search name, phone or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:"100%", maxWidth:480, padding:"10px 16px",
                border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14,
                outline:"none", boxSizing:"border-box", fontFamily:"inherit",
                background:"#fff", marginBottom:24 }} />

            {/* ── Active Patients Table ── */}
            {isMobile ? (
              activePatients.length === 0 ? (
                <div style={{ color:"#9ca3af", textAlign:"center", padding:"30px 0", marginBottom:16 }}>No active patients found</div>
              ) : (
                <div style={{ marginBottom:16 }}>
                  {activePatients.map(p => {
                    const nextAppt = (p.appointments||[]).find(a => !["Completed","Cancelled"].includes(a.status));
                    const totalPaid = (p.payments||[]).reduce((s,py)=>s+py.amount, 0);
                    const totalBilled = (p.treatments||[]).reduce((s,t)=>s+(t.cost||0), 0);
                    const balance = totalBilled - totalPaid;
                    return (
                      <div key={p.id} onClick={() => openPatient(p)}
                        style={{ background:"#fff", borderRadius:14, padding:"14px 16px",
                          boxShadow:"0 1px 4px rgba(0,0,0,0.07)", border:"1px solid #f1f5f9",
                          display:"flex", alignItems:"center", gap:12, cursor:"pointer", marginBottom:10 }}>
                        <Avatar name={p.name} size={44} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>📞 {p.phone}</div>
                          {nextAppt && (
                            <div style={{ fontSize:12, color:"#1d4ed8", marginTop:2, fontWeight:600 }}>
                              📅 {nextAppt.date} at {nextAppt.time}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          {balance > 0 ? (
                            <div style={{ fontSize:13, fontWeight:700, color:"#dc2626" }}>₹{balance.toLocaleString()} due</div>
                          ) : (
                            <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>✔ Paid</div>
                          )}
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{(p.appointments||[]).length} visits</div>
                        </div>
                        <span style={{ color:"#d1d5db", fontSize:18 }}>›</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #f1f5f9",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:24 }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981" }}></div>
                  <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>Active Patients</span>
                  <span style={{ background:"#d1fae5", color:"#065f46", padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:700, marginLeft:4 }}>{activePatients.length}</span>
                </div>
                {activePatients.length === 0 ? (
                  <div style={{ color:"#9ca3af", textAlign:"center", padding:"40px 24px" }}>No active patients found</div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                        {["Patient","Phone","Last Treatment","Next Appt","Total Appts","Total Paid"].map(h => (
                          <th key={h} style={{ padding:"12px 16px", textAlign: h==="Total Appts"||h==="Total Paid" ? "center":"left",
                            fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5,
                            whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activePatients.map(p => <PatientRow key={p.id} p={p} />)}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Completed Archive ── */}
            {completedPatients.length > 0 && (
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #f1f5f9",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
                <button onClick={() => setArchiveExpanded(!archiveExpanded)}
                  style={{ width:"100%", padding:"16px 20px", border:"none", background:"transparent",
                    display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontFamily:"inherit",
                    textAlign:"left" }}>
                  <span style={{ fontSize:14, color:"#9ca3af", transition:"transform 0.2s",
                    display:"inline-block", transform: archiveExpanded ? "rotate(90deg)":"rotate(0deg)" }}>▶</span>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#94a3b8" }}></div>
                  <span style={{ fontWeight:700, fontSize:15, color:"#6b7280" }}>Archive — Completed Patients</span>
                  <span style={{ background:"#f1f5f9", color:"#64748b", padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:700, marginLeft:4 }}>{completedPatients.length}</span>
                </button>
                {archiveExpanded && (
                  <table style={{ width:"100%", borderCollapse:"collapse", borderTop:"1px solid #f1f5f9" }}>
                    <thead>
                      <tr style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                        {["Patient","Phone","Last Treatment","Review Status","Total Appts","Total Paid"].map(h => (
                          <th key={h} style={{ padding:"12px 16px", textAlign: h==="Total Appts"||h==="Total Paid"||h==="Review Status" ? "center":"left",
                            fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5,
                            whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {completedPatients.map(p => {
                        const lastTreatment = (p.treatments||[])[0];
                        const totalPaid = (p.payments||[]).reduce((s, py) => s + py.amount, 0);
                        const isReviewed = (p.reviewStatus === "reviewed");
                        return (
                        <tr key={p.id} style={{ transition:"opacity 0.15s, background 0.15s", opacity:0.85 }}
                          onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.background="#f8fafc"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity="0.85"; e.currentTarget.style.background="transparent"; }}>
                          <td style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={() => openPatient(p)}>
                            <Avatar name={p.name} size={38} />
                            <div>
                              <div style={{ fontWeight:700, fontSize:14, color:"#6b7280" }}>{p.name}</div>
                              <div style={{ fontSize:12, color:"#9ca3af" }}>PT-{p.id.toString().padStart(4,"0")}</div>
                            </div>
                          </td>
                          <td style={{ padding:"14px 16px", fontSize:13, color:"#9ca3af", cursor:"pointer" }} onClick={() => openPatient(p)}>{p.phone}</td>
                          <td style={{ padding:"14px 16px", fontSize:13, color:"#9ca3af", cursor:"pointer" }} onClick={() => openPatient(p)}>
                            {lastTreatment ? lastTreatment.type : "—"}
                          </td>
                          <td style={{ padding:"10px 16px", textAlign:"center" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                              <button
                                disabled={isReviewed}
                                onClick={() => { setForm({ reviewPatientName: p.name, reviewPatientPhone: p.phone, reviewPatientId: p.id }); setModal("send-review"); }}
                                style={{ background: isReviewed ? "#e5e7eb" : "#25D366", border:"none", borderRadius:8, padding:"6px 12px",
                                  cursor: isReviewed ? "not-allowed" : "pointer", display:"inline-flex", alignItems:"center", gap:6,
                                  color: isReviewed ? "#9ca3af" : "#fff", fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                                  boxShadow: isReviewed ? "none" : "0 2px 8px rgba(37,211,102,0.3)" }}>
                                {isReviewed ? "✅ Reviewed" : "💬 Send Review"}
                              </button>
                              <button
                                onClick={() => updateReviewStatus(p.id, isReviewed ? "pending" : "reviewed")}
                                style={{ background:"none", border:"none", fontSize:10, color:"#94a3b8",
                                  cursor:"pointer", textDecoration:"underline", padding:0 }}>
                                {isReviewed ? "Reset to Pending" : "Mark as Reviewed"}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding:"14px 16px", textAlign:"center", cursor:"pointer" }} onClick={() => openPatient(p)}>
                            <span style={{ background:"#f1f5f9", color:"#64748b", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                              {(p.appointments||[]).length}
                            </span>
                          </td>
                          <td style={{ padding:"14px 16px", textAlign:"center", cursor:"pointer" }} onClick={() => openPatient(p)}>
                            <span style={{ color:"#9ca3af", fontSize:13, fontWeight:600 }}>
                              ₹{totalPaid.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          );
        })()}


        {/* ── PATIENT DETAIL ── */}
        {!loading && view==="patient-detail" && selectedPatient && (() => {
          // Compute balance quickly for sidebar
          const balance = (selectedPatient.treatments||[]).reduce((s,t)=>s+(t.balance||0), 0);
          return (
          <div style={{ padding: isMobile ? 14 : 32, display:"flex", gap: isMobile ? 0 : 32, alignItems:"flex-start", flexDirection: isMobile ? "column" : "row" }}>
            
            {/* Quick-stats Sticky Sidebar */}
            <div style={{ width: isMobile ? "100%" : 280, position: isMobile ? "static" : "sticky", top:32, display:"flex", flexDirection:"column", gap:16, flexShrink:0, marginBottom: isMobile ? 16 : 0 }}>
                <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",
                borderRadius:16, padding:24, color:"#fff", boxShadow:"0 10px 30px rgba(0,0,0,0.15)" }}>
                    <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20 }}>
                        <Avatar name={selectedPatient.name} size={64} />
                        <div>
                        <h2 style={{ margin:0, fontSize:20, fontWeight:700, lineHeight:1.2 }}>{selectedPatient.name}</h2>
                        <div style={{ color:"#94a3b8", fontSize:13, marginTop:4 }}>Id: PT-{selectedPatient.id.toString().padStart(4,'0')}</div>
                        {selectedPatient.isCompleted && (
                          <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5,
                            background:"rgba(148,163,184,0.2)", border:"1px solid rgba(148,163,184,0.4)",
                            borderRadius:20, padding:"2px 10px" }}>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>●</span>
                            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:0.5 }}>ARCHIVED</span>
                          </div>
                        )}
                        </div>
                    </div>
                    
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {[
                        { label:"Phone",      value:selectedPatient.phone },
                        { label:"Age",        value:selectedPatient.age||"—" },
                        { label:"Blood Grp",  value:selectedPatient.bloodGroup||selectedPatient.blood_group||"—" },
                        { label:"Address",    value:selectedPatient.address||"—" },
                        ].map(info => (
                        <div key={info.label} style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.1)", paddingBottom:8 }}>
                            <div style={{ color:"#94a3b8", fontSize:12, fontWeight:600 }}>{info.label}</div>
                            <div style={{ color:"#fff", fontWeight:600, fontSize:13 }}>{info.value}</div>
                        </div>
                        ))}
                    </div>

                    <div style={{ marginTop:24, display:"flex", flexDirection:"column", gap:8 }}>
                        <div style={{ display:"flex", gap:8 }}>
                            <Btn small variant="ghost" style={{ flex:1, padding:"8px 0" }} onClick={() => { setForm({ name:selectedPatient.name, phone:selectedPatient.phone, email:selectedPatient.email, age:selectedPatient.age, address:selectedPatient.address, bloodGroup:selectedPatient.bloodGroup||selectedPatient.blood_group }); setModal("edit-patient"); }}>✏️ Edit</Btn>
                            <Btn small variant="danger" onClick={() => setModal("delete-patient")}>🗑</Btn>
                        </div>
                        {selectedPatient.isCompleted ? (
                            <Btn small variant="ghost" style={{ width:"100%", color:"#059669", border:"1.5px solid #059669", background:"#f0fdf4" }}
                              onClick={() => markPatientComplete(false)}>↩ Restore to Active</Btn>
                        ) : (
                            <Btn small variant="ghost" style={{ width:"100%", color:"#64748b", border:"1.5px solid #e5e7eb" }}
                              onClick={() => markPatientComplete(true)}>☑ Mark as Completed</Btn>
                        )}
                    </div>
                </div>

                {/* Account Balance Mini-card */}
                <div style={{ background:"#fff", borderRadius:16, padding:20, border:`2px solid ${balance>0?"#fca5a5":"#86efac"}` }}>
                    <div style={{ fontSize:13, color:"#64748b", fontWeight:700, textTransform:"uppercase" }}>Total Outstanding</div>
                    <div style={{ fontSize:28, fontWeight:800, color:balance>0?"#dc2626":"#16a34a", marginTop:4 }}>₹{balance.toLocaleString()}</div>
                    {balance > 0 && <Btn small style={{ width:"100%", marginTop:12 }} onClick={() => setPatientTab("ledger")}>Resolve in Ledger</Btn>}
                </div>
            </div>

            <div style={{ flex:1, minWidth:0 }}>
                <button onClick={() => setView("patients")} style={{ background:"#f3f4f6", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", marginBottom:24 }}>← Back to Patients</button>
                
                {/* Tabs */}
                <div style={{ display:"flex", gap:4, marginBottom:20, background:"#f1f5f9", borderRadius:10, padding:4, overflowX:"auto" }}>
                {["overview","appointments","treatments","medications", "ledger"].map(tab => (
                    <button key={tab} onClick={() => setPatientTab(tab)} style={{
                    padding:"8px 18px", borderRadius:8, border:"none",
                    background:patientTab===tab?"#fff":"transparent",
                    color:patientTab===tab?"#111827":"#6b7280",
                    fontWeight:patientTab===tab?700:500,
                    fontSize:13, cursor:"pointer", fontFamily:"inherit",
                    boxShadow:patientTab===tab?"0 1px 3px rgba(0,0,0,0.1)":"none",
                    textTransform:"capitalize", whiteSpace:"nowrap" }}>{tab}</button>
                ))}
                </div>

                {/* Overview */}
                {patientTab==="overview" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #f1f5f9" }}>
                        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#374151" }}>📅 Next Appointment</h3>
                        {(() => {
                            const a = (selectedPatient.appointments||[]).filter(x => !["Completed","Cancelled"].includes(x.status))[0];
                            return a ? (
                                <div>
                                    <div style={{ fontWeight:700, fontSize:18, color:"#1e40af" }}>{a.date} · {a.time}</div>
                                    <div style={{ color:"#374151", marginTop:4, fontWeight:600 }}>{a.type}</div>
                                    <div style={{ color:"#6b7280", fontSize:13 }}>with {a.doctor}</div>
                                    <div style={{ marginTop:8 }}><Badge status={a.status}/></div>
                                </div>
                            ) : <div style={{ color:"#9ca3af" }}>No upcoming appointments</div>;
                        })()}
                    </div>
                    
                    <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #f1f5f9" }}>
                        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#374151" }}>💊 Active Medications</h3>
                        {(() => {
                            const meds = selectedPatient.medications||[];
                            return meds.length ? meds.slice(0,3).map(m => (
                                <div key={m.id} style={{ marginBottom:12, borderLeft:"3px solid #fbcfe8", paddingLeft:10 }}>
                                    <div style={{ fontWeight:600, fontSize:14 }}>{m.name}</div>
                                    <div style={{ color:"#6b7280", fontSize:12 }}>{m.dosage} · {m.duration}</div>
                                </div>
                            )) : <div style={{ color:"#9ca3af" }}>No active medications</div>;
                        })()}
                    </div>

                    <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #f1f5f9" }}>
                        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#374151" }}>🦷 Latest Treatment</h3>
                        {(() => {
                            const t = (selectedPatient.treatments||[])[0];
                            return t ? (
                                <div>
                                    <div style={{ fontWeight:700, fontSize:16, color:"#111827" }}>{t.type}</div>
                                    <div style={{ color:"#6b7280", fontSize:13, marginTop:2 }}>{t.date} · {t.doctor}</div>
                                    <div style={{ color:"#059669", fontSize:14, fontWeight:700, marginTop:8 }}>Total Billed: ₹{(t.cost||0).toLocaleString()}</div>
                                </div>
                            ) : <div style={{ color:"#9ca3af" }}>No treatments recorded</div>;
                        })()}
                    </div>

                    <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #f1f5f9" }}>
                        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#374151" }}>💰 Financial Snapshot</h3>
                        {(() => {
                            const txs = selectedPatient.treatments||[];
                            const totalBilled = txs.reduce((s, t) => s + (t.cost||0), 0);
                            const totalPaid = txs.reduce((s, t) => s + (t.total_paid||0), 0);
                            const bal = totalBilled - totalPaid;
                            return (
                                <div>
                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                                        <span style={{ color:"#6b7280", fontSize:14 }}>Total Billed</span>
                                        <span style={{ fontWeight:600 }}>₹{totalBilled.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                                        <span style={{ color:"#6b7280", fontSize:14 }}>Total Paid</span>
                                        <span style={{ fontWeight:600, color:"#059669" }}>₹{totalPaid.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height:1, background:"#f1f5f9", margin:"12px 0" }}></div>
                                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                                        <span style={{ fontWeight:700, color:"#374151" }}>Remaining Balance</span>
                                        <span style={{ fontWeight:700, color:bal>0?"#dc2626":"#16a34a" }}>₹{bal.toLocaleString()}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                )}
                {/* Appointments tab */}
                {patientTab==="appointments" && (
                <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Appointments</h3>
                    <Btn small onClick={() => { setForm({ date:TODAY }); setModal("add-appointment"); }}>+ Schedule</Btn>
                    </div>
                    {!(selectedPatient.appointments||[]).length && (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No appointments yet</div>
                    )}
                    {(selectedPatient.appointments||[]).map(a => (
                    <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14,
                        padding:"14px 0", borderBottom:"1px solid #f1f5f9" }}>
                        <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{a.type}</div>
                        <div style={{ color:"#6b7280", fontSize:13 }}>{a.doctor} · {a.date} at {a.time}</div>
                        </div>
                        <Sel value={a.status} onChange={(e) => {
                            const newStatus = e.target.value;
                            changeApptStatus(a.id, newStatus);
                            if (newStatus === "Completed") {
                                setForm({ reviewPatientName: selectedPatient.name, reviewPatientPhone: selectedPatient.phone });
                                setModal("send-review");
                            }
                        }} style={{ padding:"6px", fontSize:12, width:130 }}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Sel>
                        <Badge status={a.status} />
                        <Btn small variant="danger" onClick={() => removeAppointment(a.id)}>✕</Btn>
                    </div>
                    ))}
                </div>
                )}

                {/* Treatments tab */}
                {patientTab==="treatments" && (
                <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Treatment History</h3>
                    <Btn small onClick={() => { setForm({ date:TODAY }); setModal("add-treatment"); }}>+ Add Treatment</Btn>
                    </div>
                    {!(selectedPatient.treatments||[]).length && (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No treatments recorded</div>
                    )}
                    {(selectedPatient.treatments||[]).map(t => (
                    <div key={t.id} style={{ padding:"16px 0", borderBottom:"1px solid #f1f5f9", display:"flex", gap:14 }}>
                        <div style={{ width:40, height:40, background:"#eff6ff", borderRadius:10,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🦷</div>
                        <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <div style={{ fontWeight:700, fontSize:15 }}>{t.type}</div>
                            <div style={{ fontWeight:700, color:"#059669" }}>₹{Number(t.cost).toLocaleString()}</div>
                        </div>
                        <div style={{ color:"#6b7280", fontSize:13, marginTop:2 }}>{t.doctor} · {t.date}</div>
                        {t.notes && <div style={{ fontSize:13, color:"#374151", marginTop:6,
                            background:"#f8fafc", padding:"6px 10px", borderRadius:6 }}>{t.notes}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", justifyContent:"center" }}>
                            <Btn small variant="ghost" onClick={() => { setForm({ id:t.id, date:t.date, type:t.type, doctor:t.doctor, cost:t.cost||0, notes:t.notes||"" }); setModal("edit-treatment"); }}>✏️ Edit</Btn>
                            <Btn small variant="danger" onClick={() => removeTreatment(t.id)}>✕ Delete</Btn>
                        </div>
                    </div>
                    ))}
                </div>
                )}

                {/* Medications tab */}
                {patientTab==="medications" && (
                <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Medications</h3>
                    <Btn small onClick={() => { setForm({}); setModal("add-medication"); }}>+ Add Medication</Btn>
                    </div>
                    {!(selectedPatient.medications||[]).length && (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No medications prescribed</div>
                    )}
                    {(selectedPatient.medications||[]).map(m => (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:14,
                        padding:"14px 0", borderBottom:"1px solid #f1f5f9" }}>
                        <div style={{ width:40, height:40, background:"#fdf4ff", borderRadius:10,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💊</div>
                        <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{m.name}</div>
                        <div style={{ color:"#6b7280", fontSize:13 }}>
                            {m.dosage} · {m.duration} · Prescribed {m.prescribed}
                        </div>
                        </div>
                        <Btn small variant="danger" onClick={() => removeMedication(m.id)}>✕</Btn>
                    </div>
                    ))}
                </div>
                )}
                
                {/* Ledger tab */}
                {patientTab==="ledger" && (
                <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9" }}>
                    <h3 style={{ margin:"0 0 18px", fontSize:16, fontWeight:700 }}>Financial Ledger</h3>
                    {!(selectedPatient.treatments||[]).length ? (
                        <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No financial ledger generated yet. Add a treatment first.</div>
                    ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                            {(selectedPatient.treatments||[]).map(t => {
                                const tPayments = (selectedPatient.payments||[]).filter(p => p.treatment_id === t.id);
                                const bal = (t.cost||0) - (t.total_paid||0);
                                return (
                                <div key={t.id} style={{ border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
                                    <div style={{ background:"#f8fafc", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #e2e8f0" }}>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>{t.type}</div>
                                            <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{t.date} · Billed: ₹{(t.cost||0).toLocaleString()}</div>
                                        </div>
                                        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                                            <div style={{ textAlign:"right" }}>
                                                <div style={{ fontSize:12, color:"#64748b", fontWeight:600, textTransform:"uppercase" }}>Balance</div>
                                                <div style={{ fontWeight:700, fontSize:16, color:bal>0?"#dc2626":"#16a34a" }}>₹{bal.toLocaleString()}</div>
                                            </div>
                                            {bal > 0 && <Btn small onClick={() => { setForm({ treatmentId:t.id, date:TODAY, amount:bal, method:"Cash" }); setModal("collect-treatment-payment"); }}>+ Collect</Btn>}
                                        </div>
                                    </div>
                                    {tPayments.length > 0 && (
                                        <div style={{ padding:"12px 18px", background:"#fff" }}>
                                            <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:8, letterSpacing:0.5 }}>Payments</div>
                                            {tPayments.map(p => (
                                                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px dashed #f1f5f9", alignItems:"center" }}>
                                                    <div style={{ fontSize:14, color:"#475569" }}>{p.date} · {p.method}</div>
                                                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                                                        <div style={{ fontWeight:600, color:"#16a34a" }}>+ ₹{p.amount.toLocaleString()}</div>
                                                        <div style={{ display:"flex", gap:4 }}>
                                                            <Btn small variant="ghost" style={{ padding:"2px 6px", fontSize:12, color:"#64748b" }} onClick={() => { setForm({ id:p.id, amount:p.amount, method:p.method, date:p.date }); setModal("edit-payment"); }}>Edit</Btn>
                                                            <Btn small variant="ghost" style={{ padding:"2px 6px", fontSize:12, color:"#dc2626" }} onClick={() => removePayment(p.id)}>Delete</Btn>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}
            </div>
            
          </div>
          );
        })()}

        {/* ── REVENUE VIEW ── */}
        {!loading && view==="revenue" && (() => {
            const fs = financeSummary || {};
            const allCollections = (fs.collections || []).filter(c =>
                !collectionsSearch || c.patient_name?.toLowerCase().includes(collectionsSearch.toLowerCase()) ||
                c.treatment_type?.toLowerCase().includes(collectionsSearch.toLowerCase())
            );
            const arList = (fs.arByPatient || []).filter(p => {
                if (arFilter === "recent") return p.treatments.some(t => t.days_overdue <= 30);
                if (arFilter === "overdue") return p.treatments.some(t => t.days_overdue > 30);
                return true;
            });

            const TABS = [
                { id:"summary",     label:"📊 Summary" },
                { id:"collections", label:"💵 Collections" },
                { id:"receivables", label:"🔴 Receivables" },
                { id:"ledger",      label:"📒 Global Ledger" },
            ];
            const CHART_COLORS = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];

            return (
          <div style={{ padding:32, maxWidth:1200, margin:"0 auto" }}>
            {/* HEADER */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
              <div>
                <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:"#0f172a" }}>💰 Financial Dashboard</h1>
                <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>Complete picture of Vital Dental clinic finances</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Inp label="" type="date" value={financeDates.start} onChange={e=>setFinanceDates(f=>({...f,start:e.target.value}))} style={{ marginBottom:0 }} />
                <span style={{ color:"#94a3b8", fontWeight:600 }}>to</span>
                <Inp label="" type="date" value={financeDates.end} onChange={e=>setFinanceDates(f=>({...f,end:e.target.value}))} style={{ marginBottom:0 }} />
                <Btn onClick={loadFinanceSummary} loading={financeLoading}>Apply</Btn>
                {(financeDates.start||financeDates.end) && <Btn variant="ghost" onClick={() => setFinanceDates({start:"",end:""})}>Clear</Btn>}
              </div>
            </div>

            {/* TAB BAR */}
            <div style={{ display:"flex", gap:4, marginBottom:24, background:"#f1f5f9", borderRadius:12, padding:4, width:"fit-content" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setRevenueTab(t.id)} style={{
                  padding:"10px 22px", borderRadius:9, border:"none",
                  background: revenueTab===t.id ? "#fff" : "transparent",
                  color: revenueTab===t.id ? "#111827" : "#6b7280",
                  fontWeight: revenueTab===t.id ? 700 : 500,
                  fontSize:14, cursor:"pointer", fontFamily:"inherit",
                  boxShadow: revenueTab===t.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                  transition:"all 0.15s"
                }}>{t.label}</button>
              ))}
            </div>

            {financeLoading && <div style={{ textAlign:"center", padding:40, color:"#94a3b8", fontSize:16 }}>Loading financial data…</div>}

            {/* ── TAB 1: SUMMARY ── */}
            {!financeLoading && revenueTab==="summary" && (
              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                {/* KPI Cards */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16 }}>
                  {[
                    { label:"Total Billed", value:`₹${(fs.totalBilled||0).toLocaleString()}`, sub:"Total treatment charges", color:"#3b82f6", bg:"#eff6ff", icon:"🏥" },
                    { label:"Total Collected", value:`₹${(fs.totalCollected||0).toLocaleString()}`, sub:"Payments received", color:"#10b981", bg:"#f0fdf4", icon:"💵" },
                    { label:"Amount Due", value:`₹${(fs.amountDue||0).toLocaleString()}`, sub:"Outstanding balance", color:(fs.amountDue||0)>0?"#ef4444":"#10b981", bg:(fs.amountDue||0)>0?"#fef2f2":"#f0fdf4", icon:"⚠️" },
                    { label:"Collection Rate", value:`${fs.collectionRate||0}%`, sub:"Of billed amount collected", color:"#8b5cf6", bg:"#faf5ff", icon:"📈" },
                  ].map(card => (
                    <div key={card.label} style={{ background:card.bg, borderRadius:16, padding:22, border:`1.5px solid ${card.color}22` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:13, color:card.color, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{card.label}</div>
                          <div style={{ fontSize:30, fontWeight:800, color:card.color, marginTop:6, lineHeight:1 }}>{card.value}</div>
                          <div style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>{card.sub}</div>
                        </div>
                        <div style={{ fontSize:28 }}>{card.icon}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly Chart + Top Patients */}
                <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:20 }}>
                  <div style={{ background:"#fff", borderRadius:16, padding:24, border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:700 }}>Monthly Collections</h3>
                    <div style={{ height:280 }}>
                      {(fs.monthlyTrend||[]).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fs.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#6b7280",fontSize:12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill:"#6b7280",fontSize:12}} tickFormatter={v=>`₹${v/1000}k`} dx={-10} />
                            <Tooltip cursor={{fill:"#f8fafc"}} contentStyle={{borderRadius:8, border:"none", boxShadow:"0 4px 15px rgba(0,0,0,0.1)"}} formatter={(v)=>[`₹${Number(v).toLocaleString()}`,"Collected"]} />
                            <Bar dataKey="collected" fill="#3b82f6" radius={[6,6,0,0]} barSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:14}}>No payment data yet</div>}
                    </div>
                  </div>

                  <div style={{ background:"#fff", borderRadius:16, padding:24, border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>Top 5 Patients by Revenue</h3>
                    {(fs.topPatients||[]).length === 0 ? (
                      <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No data yet</div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {(fs.topPatients||[]).map((p, i) => {
                          const bar = fs.topPatients[0]?.total_billed || 1;
                          const pct = Math.round((p.total_billed / bar) * 100);
                          return (
                            <div key={p.patient_id} style={{ cursor:"pointer" }} onClick={() => openPatient(patients.find(x=>x.id===p.patient_id))}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>#{i+1} {p.patient_name}</span>
                                <span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>₹{p.total_billed.toLocaleString()}</span>
                              </div>
                              <div style={{ height:6, background:"#f1f5f9", borderRadius:4 }}>
                                <div style={{ height:6, width:`${pct}%`, background:CHART_COLORS[i], borderRadius:4, transition:"width 0.6s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Financials Summary */}
                    <div style={{ marginTop:20, borderTop:"1px solid #f1f5f9", paddingTop:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:13, color:"#64748b" }}>Patients with balance</span>
                        <span style={{ fontSize:13, fontWeight:700, color:"#ef4444" }}>{(fs.arByPatient||[]).length}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:13, color:"#64748b" }}>Total AR outstanding</span>
                        <span style={{ fontSize:13, fontWeight:700, color:"#ef4444" }}>₹{(fs.amountDue||0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: COLLECTIONS ── */}
            {!financeLoading && revenueTab==="collections" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, color:"#64748b", fontWeight:600, textTransform:"uppercase" }}>Total Collected</div>
                    <div style={{ fontSize:28, fontWeight:800, color:"#10b981" }}>₹{(fs.totalCollected||0).toLocaleString()}</div>
                  </div>
                  <input
                    placeholder="Search patient or treatment…"
                    value={collectionsSearch}
                    onChange={e=>setCollectionsSearch(e.target.value)}
                    style={{ padding:"10px 16px", border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14, width:280, fontFamily:"inherit", outline:"none" }}
                  />
                </div>
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                  {!allCollections.length ? (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:32 }}>No payments recorded yet</div>
                  ) : (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ background:"#f8fafc", color:"#64748b", textTransform:"uppercase", fontSize:12, letterSpacing:0.5 }}>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Date</th>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Patient</th>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Treatment</th>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Method</th>
                          <th style={{ padding:"14px 20px", textAlign:"right" }}>Amount Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCollections.map(c => (
                          <tr key={c.id}
                            onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                            onClick={() => { const pt = patients.find(x=>x.id===c.patient_id); if(pt) openPatient(pt); }}
                            style={{ cursor:"pointer", borderTop:"1px solid #f1f5f9" }}>
                            <td style={{ padding:"14px 20px", fontSize:14, color:"#64748b" }}>{c.date}</td>
                            <td style={{ padding:"14px 20px", fontSize:14, fontWeight:700, color:"#111827" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <Avatar name={c.patient_name||"?"} size={28} />
                                {c.patient_name}
                              </div>
                            </td>
                            <td style={{ padding:"14px 20px", fontSize:14, color:"#475569" }}>{c.treatment_type || "—"}</td>
                            <td style={{ padding:"14px 20px", fontSize:14 }}>
                              <span style={{ background:"#f1f5f9", padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:600, color:"#475569" }}>{c.method}</span>
                            </td>
                            <td style={{ padding:"14px 20px", textAlign:"right", fontWeight:700, color:"#10b981", fontSize:15 }}>+ ₹{c.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:"#f0fdf4", borderTop:"2px solid #86efac" }}>
                          <td colSpan={4} style={{ padding:"14px 20px", fontWeight:700, fontSize:14, color:"#166534" }}>Total ({allCollections.length} payments)</td>
                          <td style={{ padding:"14px 20px", textAlign:"right", fontWeight:800, fontSize:16, color:"#15803d" }}>
                            ₹{allCollections.reduce((s,c)=>s+c.amount,0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: RECEIVABLES (AR) ── */}
            {!financeLoading && revenueTab==="receivables" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, color:"#64748b", fontWeight:600, textTransform:"uppercase" }}>Total Outstanding (AR)</div>
                    <div style={{ fontSize:28, fontWeight:800, color:"#ef4444" }}>₹{(fs.amountDue||0).toLocaleString()}</div>
                    <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>{(fs.arByPatient||[]).length} patients with outstanding balance</div>
                  </div>
                  <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:4, gap:4 }}>
                    {[{id:"all",label:"All"},{id:"recent",label:"≤30 days"},{id:"overdue",label:">30 days"}].map(f => (
                      <button key={f.id} onClick={() => setArFilter(f.id)} style={{
                        padding:"8px 16px", borderRadius:7, border:"none",
                        background:arFilter===f.id?"#fff":"transparent",
                        color:arFilter===f.id?"#111827":"#6b7280",
                        fontWeight:arFilter===f.id?700:500, fontSize:13,
                        cursor:"pointer", fontFamily:"inherit",
                        boxShadow:arFilter===f.id?"0 1px 3px rgba(0,0,0,0.1)":"none"
                      }}>{f.label}</button>
                    ))}
                  </div>
                </div>

                {!arList.length ? (
                  <div style={{ background:"#f0fdf4", borderRadius:16, padding:40, textAlign:"center" }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#166534" }}>All Clear!</div>
                    <div style={{ color:"#4ade80", marginTop:4 }}>No outstanding balances for the selected filter.</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {arList.map(patient => (
                      <div key={patient.patient_id} style={{ background:"#fff", borderRadius:16, border:"1px solid #fee2e2", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>
                        {/* Patient Header */}
                        <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fef2f2", borderBottom:"1px solid #fee2e2" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <Avatar name={patient.patient_name} size={38} />
                            <div>
                              <div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>{patient.patient_name}</div>
                              <div style={{ fontSize:13, color:"#64748b" }}>{patient.patient_phone}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600, textTransform:"uppercase" }}>Total Due</div>
                              <div style={{ fontSize:22, fontWeight:800, color:"#dc2626" }}>₹{patient.total_balance.toLocaleString()}</div>
                            </div>
                            <Btn small onClick={() => openPatient(patients.find(x=>x.id===patient.patient_id))}>View Patient</Btn>
                          </div>
                        </div>
                        {/* Treatment Rows */}
                        <div style={{ padding:"12px 20px" }}>
                          {patient.treatments.map(t => (
                            <div key={t.treatment_id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px dashed #f1f5f9" }}>
                              <div>
                                <div style={{ fontSize:14, fontWeight:600, color:"#374151" }}>{t.treatment_type}</div>
                                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                                  {t.date} · Billed: ₹{t.cost.toLocaleString()} · Paid: ₹{t.paid.toLocaleString()}
                                  {t.days_overdue > 30 && (
                                    <span style={{ marginLeft:8, background:"#fee2e2", color:"#dc2626", padding:"1px 8px", borderRadius:4, fontSize:11, fontWeight:700 }}>
                                      {t.days_overdue}d overdue
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                <div style={{ textAlign:"right" }}>
                                  <div style={{ fontSize:12, color:"#94a3b8" }}>Balance</div>
                                  <div style={{ fontSize:16, fontWeight:700, color:"#dc2626" }}>₹{t.balance.toLocaleString()}</div>
                                </div>
                                <Btn small onClick={() => {
                                  setSelectedPatient(patients.find(x=>x.id===patient.patient_id));
                                  setForm({ treatmentId:t.treatment_id, date:TODAY, amount:t.balance, method:"Cash" });
                                  setModal("collect-treatment-payment");
                                }}>+ Collect</Btn>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: GLOBAL LEDGER ── */}
            {!financeLoading && revenueTab==="ledger" && (() => {
              const allLedger = patients.flatMap(p =>
                [...(p.treatments||[]).map(t=>({...t,_type:"treatment",patientName:p.name,patientId:p.id})),
                 ...(p.payments||[]).map(py=>({...py,_type:"payment",patientName:p.name,patientId:p.id}))]
              ).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
              return (
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                  {!allLedger.length ? (
                    <div style={{ color:"#9ca3af", textAlign:"center", padding:40 }}>No transactions recorded yet</div>
                  ) : (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ background:"#f8fafc", color:"#64748b", textTransform:"uppercase", fontSize:12, letterSpacing:0.5 }}>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Date</th>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Patient</th>
                          <th style={{ padding:"14px 20px", textAlign:"left" }}>Description</th>
                          <th style={{ padding:"14px 20px", textAlign:"right" }}>Charge</th>
                          <th style={{ padding:"14px 20px", textAlign:"right" }}>Payment In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLedger.map(row => (
                          <tr key={`${row._type}-${row.id}`}
                            onClick={() => { openPatient(patients.find(x=>x.id===row.patientId)); setPatientTab("ledger"); }}
                            onMouseEnter={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.cursor="pointer"}}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                            style={{ borderTop:"1px solid #f1f5f9" }}>
                            <td style={{ padding:"13px 20px", fontSize:14, color:"#64748b" }}>{row.date}</td>
                            <td style={{ padding:"13px 20px", fontSize:14, fontWeight:600, color:"#111827" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <Avatar name={row.patientName||"?"} size={26} />
                                {row.patientName}
                              </div>
                            </td>
                            <td style={{ padding:"13px 20px", fontSize:14, color:"#475569" }}>
                              {row._type==="treatment"
                                ? <span><span style={{ background:"#dbeafe", color:"#1e40af", padding:"2px 8px", borderRadius:4, fontSize:12, fontWeight:600, marginRight:6 }}>CHARGE</span>{row.type}</span>
                                : <span><span style={{ background:"#d1fae5", color:"#065f46", padding:"2px 8px", borderRadius:4, fontSize:12, fontWeight:600, marginRight:6 }}>PAID</span>{row.method}</span>
                              }
                            </td>
                            <td style={{ padding:"13px 20px", textAlign:"right", color:"#ef4444", fontWeight:700 }}>
                              {row._type==="treatment" ? `₹${(row.cost||0).toLocaleString()}` : "—"}
                            </td>
                            <td style={{ padding:"13px 20px", textAlign:"right", color:"#10b981", fontWeight:700 }}>
                              {row._type==="payment" ? `₹${(row.amount||0).toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

          </div>
            );
        })()}

        {/* ── REMINDERS VIEW ── */}
        {!loading && view==="reminders" && (() => {
            return (
          <div style={{ padding:32 }}>
            <div style={{ marginBottom:24 }}>
                <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Daily Communications</h1>
                <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>Manage automated WhatsApp patient reminders</p>
            </div>
            
            <div style={{ display:"flex", gap:4, marginBottom:24, background:"#f1f5f9", borderRadius:10, padding:4, width:"fit-content" }}>
              <button onClick={() => setRemindersTab("today")} style={{ padding:"8px 24px", borderRadius:8, border:"none", background:remindersTab==="today"?"#fff":"transparent", color:remindersTab==="today"?"#111827":"#6b7280", fontWeight:remindersTab==="today"?700:500, fontSize:14, cursor:"pointer", fontFamily:"inherit", boxShadow:remindersTab==="today"?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>Today's Appointments</button>
              <button onClick={() => setRemindersTab("tomorrow")} style={{ padding:"8px 24px", borderRadius:8, border:"none", background:remindersTab==="tomorrow"?"#fff":"transparent", color:remindersTab==="tomorrow"?"#111827":"#6b7280", fontWeight:remindersTab==="tomorrow"?700:500, fontSize:14, cursor:"pointer", fontFamily:"inherit", boxShadow:remindersTab==="tomorrow"?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>Tomorrow's Appointments</button>
            </div>

            <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                {!remindersData.length && <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No appointments found for {remindersTab}.</div>}
                {remindersData.length > 0 && (
                <table style={{ width:"100%", borderCollapse:"collapse", marginTop:16 }}>
                    <thead>
                        <tr style={{ background:"#f8fafc", color:"#64748b", textTransform:"uppercase", fontSize:12, letterSpacing:0.5 }}>
                            <th style={{ padding:"12px 16px", textAlign:"left", borderRadius:"8px 0 0 8px" }}>Patient</th>
                            <th style={{ padding:"12px 16px", textAlign:"left" }}>Time</th>
                            <th style={{ padding:"12px 16px", textAlign:"left" }}>Type & Doctor</th>
                            <th style={{ padding:"12px 16px", textAlign:"left" }}>Contact</th>
                            <th style={{ padding:"12px 16px", textAlign:"right", borderRadius:"0 8px 8px 0" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {remindersData.map(a => (
                            <tr key={a.id} style={{ borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e=>{e.currentTarget.style.background="#f8fafc"}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <td style={{ padding:"14px 16px", fontSize:14, fontWeight:700, color:"#111827" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                        <Avatar name={a.patient_name||"?"} size={32} />
                                        {a.patient_name}
                                    </div>
                                </td>
                                <td style={{ padding:"14px 16px", fontSize:14, color:"#475569", fontWeight:600 }}>{a.time}</td>
                                <td style={{ padding:"14px 16px", fontSize:14, color:"#64748b" }}>
                                    <span style={{ fontWeight:600, color:"#374151" }}>{a.type}</span><br/>
                                    <span style={{ fontSize:12 }}>{a.doctor}</span>
                                </td>
                                <td style={{ padding:"14px 16px", fontSize:14, color:"#475569" }}>{a.patient_phone || "N/A"}</td>
                                <td style={{ padding:"14px 16px", textAlign:"right" }}>
                                    {a.reminder_sent ? (
                                        <span style={{ background:"#d1fae5", color:"#065f46", padding:"6px 12px", borderRadius:6, fontSize:13, fontWeight:700, display:"inline-block" }}>
                                            Sent ✅
                                        </span>
                                    ) : (
                                        <button onClick={() => sendWhatsAppReminder(a, remindersTab === "tomorrow")} disabled={!a.patient_phone} style={{ background: a.patient_phone ? "#25D366" : "#9ca3af", border:"none", borderRadius:8, padding:"8px 16px", cursor: a.patient_phone ? "pointer" : "not-allowed", color:"#fff", fontSize:13, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6, transition:"transform 0.15s", boxShadow: a.patient_phone ? "0 2px 8px rgba(37,211,102,0.3)" : "none" }}>
                                            💬 Send Reminder
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
          </div>
            );
        })()}

        {/* ── TREATMENTS VIEW ── */}
        {!loading && view==="treatments" && (() => {
            const allTreatments = patients.flatMap(p => 
                (p.treatments||[]).map(t => ({...t, patientName:p.name, patientId:p.id}))
            ).sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);

            return (
          <div style={{ padding:32 }}>
            <div style={{ marginBottom:24 }}>
                <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Treatments History</h1>
                <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>Global log of all treatments performed</p>
            </div>
            
            <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                {!allTreatments.length && <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No treatments recorded</div>}
                {allTreatments.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column" }}>
                        {allTreatments.map((t, i) => (
                            <div key={`${t.id}-${i}`} onClick={() => openPatient(patients.find(x => x.id===t.patientId))} style={{ padding:"16px", borderBottom:"1px solid #f1f5f9", display:"flex", gap:14, cursor:"pointer" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                                <div style={{ width:40, height:40, background:"#eff6ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🦷</div>
                                <div style={{ flex:1 }}>
                                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                                        <div style={{ fontWeight:700, fontSize:15, color:"#1e40af" }}>{t.patientName} <span style={{ color:"#334155", fontWeight:600 }}>- {t.type}</span></div>
                                        <div style={{ fontWeight:700, color:"#059669" }}>₹{Number(t.cost).toLocaleString()}</div>
                                    </div>
                                    <div style={{ color:"#6b7280", fontSize:13, marginTop:2 }}>{t.doctor} · {t.date}</div>
                                    {t.notes && <div style={{ fontSize:13, color:"#374151", marginTop:6, background:"#f8fafc", padding:"6px 10px", borderRadius:6 }}>{t.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
            );
        })()}

        {/* ── APPOINTMENTS MANAGEMENT ── */}
        {!loading && view==="appointments" && (() => {
            const currentDateObj = new Date(calendarDate);

            const handlePrevDay = () => {
                const d = new Date(currentDateObj);
                d.setDate(d.getDate() - 1);
                setCalendarDate(d.toISOString().split("T")[0]);
            };
            const handleNextDay = () => {
                const d = new Date(currentDateObj);
                d.setDate(d.getDate() + 1);
                setCalendarDate(d.toISOString().split("T")[0]);
            };
            const handleToday = () => setCalendarDate(TODAY);

            const displayDateStr = currentDateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

            // Build 7-day date strip for mobile
            const dateStrip = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                return d.toISOString().split("T")[0];
            });

            // group appointments by date (for mobile view)
            const apptsByDate = {};
            allAppointments.forEach(a => {
                if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
                apptsByDate[a.date].push(a);
            });

            // Status color dots
            const statusDot = { Scheduled:"#3b82f6", Confirmed:"#10b981", Arrived:"#f59e0b", "In Chair":"#8b5cf6", Completed:"#6b7280", Cancelled:"#ef4444" };

            if (isMobile) {
              // ── MOBILE appointments layout ──────────────────────────────
              const apptDate = mobileApptDate;
              const dayAppts = (apptsByDate[apptDate] || []).sort((a,b)=>a.time.localeCompare(b.time));
              return (
                <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
                  {/* Date strip */}
                  <div style={{ padding:"12px 0 0", background:"#fff", borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ overflowX:"auto", display:"flex", gap:6, padding:"0 16px 12px",
                      WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
                      {dateStrip.map(d => {
                        const dt = new Date(d+"T00:00:00");
                        const dayName = dt.toLocaleDateString("en-IN", { weekday:"short" });
                        const dayNum = dt.getDate();
                        const isSelected = d === apptDate;
                        const isToday = d === TODAY;
                        const hasAppts = apptsByDate[d]?.length > 0;
                        return (
                          <button key={d} onClick={() => setMobileApptDate(d)} style={{
                            minWidth:56, height:68, borderRadius:14,
                            border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
                            background: isSelected ? "#eff6ff" : isToday ? "#f8fafc" : "#fff",
                            cursor:"pointer", display:"flex", flexDirection:"column",
                            alignItems:"center", justifyContent:"center", gap:2,
                            boxShadow: isSelected ? "0 2px 8px rgba(59,130,246,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
                            flexShrink:0, position:"relative" }}>
                            <span style={{ fontSize:11, fontWeight:600, color: isSelected?"#1d4ed8":"#94a3b8", textTransform:"uppercase" }}>{dayName}</span>
                            <span style={{ fontSize:20, fontWeight:800, color: isSelected?"#1d4ed8":"#111827", lineHeight:1 }}>{dayNum}</span>
                            {hasAppts && <span style={{ width:6, height:6, borderRadius:"50%", background:"#3b82f6", position:"absolute", bottom:6 }}/>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Appointment cards */}
                  <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 0" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>
                        {new Date(apptDate+"T00:00:00").toLocaleDateString("en-IN", { weekday:"long", month:"long", day:"numeric" })}
                      </div>
                      <Btn small onClick={() => { setForm({ date:apptDate, doctor:DOCTORS[0] }); setModal("add-appointment-global"); }}>+ Add</Btn>
                    </div>

                    {dayAppts.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"48px 24px", color:"#9ca3af" }}>
                        <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                        <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>No appointments</div>
                        <div style={{ fontSize:13 }}>Tap + Add to schedule one</div>
                      </div>
                    ) : dayAppts.map(a => {
                      const pat = patients.find(x => x.id === a.patientId);
                      const isActive = !["Completed","Cancelled"].includes(a.status);
                      return (
                        <div key={a.id} style={{
                          background:"#fff", borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
                          marginBottom:12, overflow:"hidden",
                          borderLeft:`4px solid ${statusDot[a.status]||"#e5e7eb"}`,
                          opacity: a.status==="Cancelled" ? 0.55 : 1 }}>
                          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}
                            onClick={() => pat && openPatient(pat)}>
                            <div style={{ textAlign:"center", minWidth:48 }}>
                              <div style={{ fontSize:22, fontWeight:800, color:"#1e40af", lineHeight:1 }}>{a.time.slice(0,5)}</div>
                              <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>
                                {a.time.split(":")[0]>=12 ? "PM":"AM"}
                              </div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{a.patientName}</div>
                              <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{a.type}</div>
                            </div>
                            <Badge status={a.status} />
                          </div>

                          {isActive && (
                            <div style={{ padding:"10px 16px 14px", borderTop:"1px solid #f9fafb",
                              display:"flex", gap:8, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                              {a.status !== "Arrived" && a.status !== "In Chair" && (
                                <button onClick={() => changeApptStatus(a.id, "Arrived")} style={{
                                  background:"#fef3c7", color:"#92400e", border:"none",
                                  borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700,
                                  cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                                  ✔ Arrived
                                </button>
                              )}
                              <button onClick={() => {
                                setForm({ apptId:a.id, patientId:a.patientId, finalAmount:a.planned_cost||0, method:"Cash", type:a.type, doctor:a.doctor });
                                setModal("complete-appt");
                              }} style={{
                                background:"#d1fae5", color:"#065f46", border:"none",
                                borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700,
                                cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                                ✓ Complete
                              </button>
                              <button onClick={() => {
                                setForm({ apptId:a.id, patientId:a.patientId, date:a.date, time:a.time, doctor:a.doctor });
                                setModal("reschedule-appt");
                              }} style={{
                                background:"#eff6ff", color:"#1e40af", border:"none",
                                borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700,
                                cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                                🗓 Reschedule
                              </button>
                              <button onClick={() => cancelAppointmentStatus(a.patientId, a.id)} style={{
                                background:"#fee2e2", color:"#dc2626", border:"none",
                                borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700,
                                cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                                ✕ Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ── DESKTOP appointments layout ──────────────────────────
            return (
          <div style={{ padding:32 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div>
                    <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Appointments</h1>
                    <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>{apptsView === "calendar" ? displayDateStr : "Manage all schedules and statuses"}</p>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                    {apptsView === "calendar" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 12 }}>
                            <Btn variant="ghost" small onClick={handlePrevDay}>‹ Prev Day</Btn>
                            <Btn variant="ghost" small onClick={handleToday}>Today</Btn>
                            <Btn variant="ghost" small onClick={handleNextDay}>Next Day ›</Btn>
                        </div>
                    )}
                    <div style={{ background:"#f1f5f9", padding:4, borderRadius:10, display:"flex" }}>
                        <button onClick={()=>setApptsView("list")} style={{ padding:"6px 16px", borderRadius:6, border:"none", background:apptsView==="list"?"#fff":"transparent", color:apptsView==="list"?"#1e293b":"#64748b", fontWeight:apptsView==="list"?700:500, fontSize:13, cursor:"pointer", boxShadow:apptsView==="list"?"0 1px 2px rgba(0,0,0,0.05)":"none" }}>List</button>
                        <button onClick={()=>setApptsView("calendar")} style={{ padding:"6px 16px", borderRadius:6, border:"none", background:apptsView==="calendar"?"#fff":"transparent", color:apptsView==="calendar"?"#1e293b":"#64748b", fontWeight:apptsView==="calendar"?700:500, fontSize:13, cursor:"pointer", boxShadow:apptsView==="calendar"?"0 1px 2px rgba(0,0,0,0.05)":"none" }}>Calendar</button>
                    </div>
                    <Btn onClick={() => { setForm({ date:(apptsView==="calendar"?calendarDate:TODAY) }); setModal("add-appointment-global"); }}>+ Block Time</Btn>
                </div>
            </div>

            {apptsView === "calendar" && (
            <div style={{ display:"grid", gridTemplateColumns:`60px repeat(${DOCTORS.length}, 1fr)`, gap:1, background:"#e2e8f0", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
                <div style={{ background:"#f8fafc", padding:12, textAlign:"center", fontWeight:600, color:"#64748b", fontSize:13 }}>Time</div>
                {DOCTORS.map(d => (
                    <div key={d} style={{ background:"#f8fafc", padding:12, textAlign:"center", fontWeight:700, color:"#0f172a", fontSize:14 }}>{d}</div>
                ))}

                {["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map(t => (
                    <div style={{ display: "contents" }} key={t}>
                        <div style={{ background:"#fff", padding:"20px 0", textAlign:"center", fontSize:12, color:"#94a3b8", fontWeight:600 }}>{t}</div>
                        {DOCTORS.map(d => {
                            const appts = allAppointments.filter(a => a.date === calendarDate && a.doctor === d && a.time.startsWith(t.split(':')[0]));
                            return (
                                <div key={d+t} style={{ background:"#fff", padding:8, position:"relative", minHeight:80, display:"flex", flexDirection:"column", gap:4 }}>
                                    {appts.map(a => (
                                        <div key={a.id} onClick={() => openPatient(patients.find(x => x.id===a.patientId))}
                                            style={{ background:"#eff6ff", borderLeft:"3px solid #3b82f6", padding:"6px 10px", borderRadius:"0 6px 6px 0", cursor:"pointer", boxShadow:"0 1px 2px rgba(0,0,0,0.05)" }}>
                                            <div style={{ fontSize:12, fontWeight:700, color:"#1e40af", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.patientName}</div>
                                            <div style={{ fontSize:11, color:"#3b82f6", display:"flex", justifyContent:"space-between" }}>
                                                <span>{a.type}</span>
                                            </div>
                                            <div style={{ marginTop:4 }}><Badge status={a.status}/></div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
            )}

            {apptsView === "list" && (
                <div style={{ background:"#fff", borderRadius:14, border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                   {!allAppointments.length && <div style={{ color:"#9ca3af", textAlign:"center", padding:24 }}>No appointments found</div>}
                   {allAppointments.length > 0 && (
                       <table style={{ width:"100%", borderCollapse:"collapse" }}>
                           <thead>
                               <tr style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                                   {["Patient", "Date & Time", "Doctor & Type", "Status", "Est. Cost", "Actions"].map(h => (
                                       <th key={h} style={{ padding:"14px 20px", textAlign:h==="Actions"?"right":"left", fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                                   ))}
                               </tr>
                           </thead>
                           <tbody>
                               {allAppointments.map((a, i) => (
                                   <tr key={`${a.id}-${i}`} style={{ borderBottom:"1px solid #f1f5f9", transition:"background 0.1s" }} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                       <td style={{ padding:"16px 20px" }}>
                                           <div style={{ fontWeight:700, color:"#111827", cursor:"pointer" }} onClick={()=>openPatient(patients.find(x=>x.id===a.patientId))}>{a.patientName}</div>
                                       </td>
                                       <td style={{ padding:"16px 20px", color:"#475569", fontSize:14 }}>
                                           <div style={{ fontWeight:600 }}>{a.date}</div>
                                           <div style={{ fontSize:13 }}>{a.time}</div>
                                       </td>
                                       <td style={{ padding:"16px 20px" }}>
                                           <div style={{ fontWeight:600, color:"#374151", fontSize:14 }}>{a.type}</div>
                                           <div style={{ fontSize:13, color:"#64748b" }}>{a.doctor}</div>
                                       </td>
                                       <td style={{ padding:"16px 20px" }}>
                                           <Badge status={a.status} />
                                       </td>
                                       <td style={{ padding:"16px 20px", fontWeight:600, color:"#64748b" }}>
                                           ₹{(a.planned_cost || 0).toLocaleString()}
                                       </td>
                                       <td style={{ padding:"16px 20px", textAlign:"right" }}>
                                           {["Completed", "Cancelled"].includes(a.status) ? (
                                                <span style={{ fontSize:13, color:"#9ca3af" }}>—</span>
                                           ) : (
                                               <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                                                    <Btn small variant="ghost" style={{ background:"#dcfce7", color:"#166534", border:"1px solid #bbf7d0" }} onClick={() => { setForm({ apptId: a.id, patientId: a.patientId, finalAmount: a.planned_cost||0, method: "Cash", type: a.type, doctor: a.doctor }); setModal("complete-appt"); }}>✓ Complete</Btn>
                                                    <Btn small variant="ghost" onClick={() => { setForm({ apptId: a.id, patientId: a.patientId, date: a.date, time: a.time, doctor: a.doctor }); setModal("reschedule-appt"); }}>🗓 Reschedule</Btn>
                                                    <Btn small variant="ghost" style={{ color:"#dc2626" }} onClick={() => cancelAppointmentStatus(a.patientId, a.id)}>✕ Cancel</Btn>
                                               </div>
                                           )}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}
                </div>
            )}
          </div>
            );
        })()}

      </div>

      {/* ── Desktop FAB (hidden on mobile — we use bottom nav there) ── */}
      {!isMobile && (
        <div style={{ position:"fixed", bottom:32, right:32, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:16, zIndex:900 }}>
          <Btn style={{ borderRadius:"50%", width:56, height:56, fontSize:24, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 10px 25px rgba(0,0,0,0.2)" }} onClick={() => {
              const menu = document.getElementById("fab-menu");
              menu.style.display = menu.style.display === "flex" ? "none" : "flex";
          }}>+</Btn>
          <div id="fab-menu" style={{ display:"none", flexDirection:"column", gap:12, position:"absolute", bottom:72, right:0 }}>
              <Btn variant="primary" style={{ whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.15)" }} onClick={() => { setForm({}); setModal("add-patient"); }}>👥 New Patient</Btn>
              <Btn variant="primary" style={{ whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.15)" }} onClick={() => { setForm({ date:TODAY }); setModal("add-appointment-global"); }}>📅 Schedule Appointment</Btn>
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}
      {modal==="add-patient" && (
        <Modal isMobile={isMobile} title="Add New Patient" onClose={closeModal}>
          <datalist id="patient-names">
            {patients.map(p => <option key={`n-${p.id}`} value={p.name}>{p.phone}</option>)}
          </datalist>
          <datalist id="patient-phones">
            {patients.map(p => <option key={`p-${p.id}`} value={p.phone}>{p.name}</option>)}
          </datalist>
          <Inp list="patient-names" label="Full Name *" placeholder="e.g. Raj Kumar" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Inp list="patient-phones" label="Phone Number *" placeholder="+91 98765 43210" value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
          <Inp label="Email" placeholder="patient@email.com" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Age" type="number" placeholder="32" value={form.age||""} onChange={e=>setForm(f=>({...f,age:e.target.value}))} />
            <Sel label="Blood Group" value={form.bloodGroup||""} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))}>
              <option value="">Select</option>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=><option key={b}>{b}</option>)}
            </Sel>
          </div>
          <Inp label="Address" placeholder="Home address" value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={() => addPatient()} loading={saving}>Add Patient</Btn>
          </div>
        </Modal>
      )}

      {modal==="edit-patient" && (
        <Modal isMobile={isMobile} title="Edit Patient" onClose={closeModal}>
          <Inp label="Full Name" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Inp label="Phone" value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
          <Inp label="Email" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Age" type="number" value={form.age||""} onChange={e=>setForm(f=>({...f,age:e.target.value}))} />
            <Sel label="Blood Group" value={form.bloodGroup||""} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))}>
              <option value="">Select</option>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=><option key={b}>{b}</option>)}
            </Sel>
          </div>
          <Inp label="Address" value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={saveEditPatient} loading={saving}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {modal==="delete-patient" && (
        <Modal isMobile={isMobile} title="Delete Patient?" onClose={closeModal}>
          <p style={{ color:"#374151", marginBottom:24 }}>
            Delete <strong>{selectedPatient?.name}</strong>? All their appointments,
            treatments and medications will be permanently removed.
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn variant="danger" onClick={removePatient} loading={saving}>Yes, Delete</Btn>
          </div>
        </Modal>
      )}

      {modal==="add-appointment" && (
        <Modal isMobile={isMobile} title="Schedule Appointment" onClose={closeModal}>
          <Sel label="Appointment Type" value={form.type||""} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            <option value="">Select type</option>
            {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </Sel>
          <Sel label="Doctor" value={form.doctor||""} onChange={e=>setForm(f=>({...f,doctor:e.target.value}))}>
            {DOCTORS.map(d=><option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Date *" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Inp label="Time *" type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Sel label="Status" value={form.status||"Scheduled"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </Sel>
            <Inp label="Planned Cost (₹)" type="number" value={form.plannedCost||""} onChange={e=>setForm(f=>({...f,plannedCost:e.target.value}))} />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addAppointment} loading={saving}>Schedule</Btn>
          </div>
        </Modal>
      )}

      {modal==="add-appointment-global" && (
        <Modal isMobile={isMobile} title="Global Schedule" onClose={closeModal}>
          <Sel label="Select Patient *" value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}>
            <option value="">Search...</option>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name} - {p.phone}</option>)}
          </Sel>
          <Sel label="Appointment Type" value={form.type||""} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            <option value="">Select type</option>
            {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </Sel>
          <Sel label="Doctor" value={form.doctor||""} onChange={e=>setForm(f=>({...f,doctor:e.target.value}))}>
            {DOCTORS.map(d=><option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Date *" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Inp label="Time *" type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
          </div>
          <Inp label="Planned Cost (₹)" type="number" placeholder="5000" value={form.plannedCost||""} onChange={e=>setForm(f=>({...f,plannedCost:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={async () => {
                if (!form.patientId || !form.date || !form.time || !form.type) return;
                setSaving(true);
                try {
                    await api.createAppointment(form.patientId, {
                        date: form.date, time: form.time, type: form.type,
                        doctor: form.doctor || DOCTORS[0], status: "Scheduled",
                        plannedCost: Number(form.plannedCost) || 0
                    });
                    showToast("Appointment Scheduled via Global Add");
                    closeModal();
                    loadAll();
                } catch(e) { showToast(e.message, "error"); } finally { setSaving(false); }
            }} loading={saving}>Schedule</Btn>
          </div>
        </Modal>
      )}

      {modal==="complete-appt" && (
        <Modal isMobile={isMobile} title="Complete Appointment" onClose={closeModal}>
          <p style={{ color:"#475569", marginBottom:20, fontSize:14 }}>
            Marking this appointment as Completed will automatically generate a Treatment record and record the payment.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Final Amount Paid (₹) *" type="number" value={form.finalAmount||""} onChange={e=>setForm(f=>({...f,finalAmount:e.target.value}))} />
            <Sel label="Payment Method" value={form.method||"Cash"} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
               {["Cash", "Card", "UPI", "Bank Transfer"].map(m=><option key={m}>{m}</option>)}
            </Sel>
          </div>
          <div style={{ marginBottom:16 }}>
             <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Treatment Notes</label>
             <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" }} />
          </div>
          {/* WhatsApp review shortcut inside completion modal */}
          {(() => {
            const pt = patients.find(p => p.id === form.patientId) || selectedPatient;
            return pt ? (
              <div style={{ background:"linear-gradient(135deg,#e7fce8,#d1fce4)", border:"1.5px solid #86efac",
                borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#14532d" }}>🌟 After completing, send a review request!</div>
                  <div style={{ fontSize:12, color:"#166534", marginTop:2 }}>Opens WhatsApp Web for {pt.name}</div>
                </div>
                <button
                  onClick={() => { setForm(f => ({ ...f, reviewPatientName: pt.name, reviewPatientPhone: pt.phone })); setModal("send-review"); }}
                  style={{ background:"#25D366", border:"none", borderRadius:10, padding:"8px 16px",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
                  💬 Send Review Request
                </button>
              </div>
            ) : null;
          })()}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={completeAppointment} loading={saving}>Complete & Record</Btn>
          </div>
        </Modal>
      )}

      {modal==="reschedule-appt" && (
        <Modal isMobile={isMobile} title="Reschedule Appointment" onClose={closeModal}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="New Date *" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Inp label="New Time *" type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
          </div>
          <Sel label="Doctor" value={form.doctor||""} onChange={e=>setForm(f=>({...f,doctor:e.target.value}))}>
            {DOCTORS.map(d=><option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={rescheduleAppointment} loading={saving}>Reschedule</Btn>
          </div>
        </Modal>
      )}

      {modal==="add-treatment" && (
        <Modal isMobile={isMobile} title="Add Treatment Record" onClose={closeModal}>
          <Sel label="Treatment Type" value={form.type||""} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            <option value="">Select type</option>
            {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </Sel>
          <Sel label="Doctor" value={form.doctor||""} onChange={e=>setForm(f=>({...f,doctor:e.target.value}))}>
            {DOCTORS.map(d=><option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Date" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Inp label="Cost (₹)" type="number" placeholder="5000" value={form.cost||""} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Notes</label>
            <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              rows={3} placeholder="Treatment notes…"
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb",
                borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical",
                boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addTreatment} loading={saving}>Save Treatment</Btn>
          </div>
        </Modal>
      )}

      {modal==="add-medication" && (
        <Modal isMobile={isMobile} title="Add Medication" onClose={closeModal}>
          <Inp label="Medication Name *" placeholder="e.g. Amoxicillin 500mg" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Inp label="Dosage" placeholder="e.g. 3x daily after meals" value={form.dosage||""} onChange={e=>setForm(f=>({...f,dosage:e.target.value}))} />
          <Inp label="Duration" placeholder="e.g. 5 days" value={form.duration||""} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addMedication} loading={saving}>Add</Btn>
          </div>
        </Modal>
      )}

      {modal==="add-payment" && (
        <Modal isMobile={isMobile} title="Collect Payment" onClose={closeModal}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Inp label="Total Amount to be Collected (₹)" type="number" placeholder="e.g. 5000" value={form.totalAmount||""} onChange={e=>setForm(f=>({...f,totalAmount:e.target.value}))} />
            <Inp label="Amount Collected (₹) *" type="number" placeholder="e.g. 2000" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
          </div>
          
          <div style={{ background:"#f8fafc", padding:"12px 16px", borderRadius:8, marginBottom:16, border:"1px solid #e2e8f0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{ fontSize:13, fontWeight:600, color:"#64748b" }}>Remaining to be Collected:</span>
              <span style={{ fontSize:16, fontWeight:700, color:(Number(form.totalAmount||0) - Number(form.amount||0)) > 0 ? "#ef4444" : "#10b981" }}>
                ₹{Math.max(0, Number(form.totalAmount||0) - Number(form.amount||0))}
              </span>
            </div>
          </div>
          
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Date *" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Sel label="Method" value={form.method||"Cash"} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
              {["Cash", "Card", "UPI", "Bank Transfer"].map(m=><option key={m}>{m}</option>)}
            </Sel>
          </div>

          <div style={{ marginBottom:16 }}>
             <Inp label="Description / Notes (Optional)" placeholder="e.g. RCT Final Payment" value={form.invoiceDescription||""} onChange={e=>setForm(f=>({...f,invoiceDescription:e.target.value}))} />
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addPayment} loading={saving}>Record Payment</Btn>
          </div>
        </Modal>
      )}

      {modal==="edit-treatment" && (
        <Modal isMobile={isMobile} title="Edit Treatment Record" onClose={closeModal}>
          <Sel label="Treatment Type" value={form.type||""} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            <option value="">Select type</option>
            {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </Sel>
          <Sel label="Doctor" value={form.doctor||""} onChange={e=>setForm(f=>({...f,doctor:e.target.value}))}>
            {DOCTORS.map(d=><option key={d}>{d}</option>)}
          </Sel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Date" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            <Inp label="Cost (₹)" type="number" placeholder="5000" value={form.cost||""} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Notes</label>
            <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              rows={3} placeholder="Treatment notes…"
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb",
                borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical",
                boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={saveEditTreatment} loading={saving}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {modal==="collect-treatment-payment" && (
        <Modal isMobile={isMobile} title="Collect Payment" onClose={closeModal}>
          <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:13, color:"#166534", fontWeight:600 }}>Outstanding Balance</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#15803d" }}>₹{(form.amount||0).toLocaleString()}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Amount Collected (₹) *" type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            <Sel label="Method" value={form.method||"Cash"} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
               {["Cash", "Card", "UPI", "Bank Transfer"].map(m=><option key={m}>{m}</option>)}
            </Sel>
          </div>
          <Inp label="Date" type="date" value={form.date||TODAY} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addPayment} loading={saving}>Collect & Apply</Btn>
          </div>
        </Modal>
      )}

      {modal==="edit-payment" && (
        <Modal isMobile={isMobile} title="Edit Payment Record" onClose={closeModal}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Amount (₹) *" type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            <Sel label="Method" value={form.method||"Cash"} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
               {["Cash", "Card", "UPI", "Bank Transfer"].map(m=><option key={m}>{m}</option>)}
            </Sel>
          </div>
          <Inp label="Date" type="date" value={form.date||TODAY} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={saveEditPayment} loading={saving}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* ── SEND REVIEW REQUEST MODAL ── */}
      {modal==="send-review" && (() => {
        const patientName  = form.reviewPatientName  || selectedPatient?.name  || "";
        const patientPhone = form.reviewPatientPhone || selectedPatient?.phone || "";
        const GMB_LINK_PREVIEW = "https://share.google/X1XreHKupu3KZXa2B";
        const previewMsg = `Hi ${patientName}! It was great seeing you at Vital Dental today. We hope your experience was comfortable and painless! If you have a moment, we would love it if you could share your experience here: ${GMB_LINK_PREVIEW}. Keep smiling! - Dr. Pragati Singh & Team.`;
        return (
          <Modal isMobile={isMobile} title="" onClose={closeModal}>
            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:44, marginBottom:8 }}>💬</div>
              <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827" }}>Send Review Request</h2>
              <p style={{ margin:"6px 0 0", color:"#6b7280", fontSize:14 }}>via WhatsApp to <strong>{patientName}</strong></p>
            </div>

            {/* Phone chip */}
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"#f8fafc",
              border:"1.5px solid #e2e8f0", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
              <span style={{ fontSize:18 }}>📱</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5 }}>Phone Number</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#1e293b" }}>{patientPhone || "(no phone on record)"}</div>
              </div>
            </div>

            {/* Message preview */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Message Preview</div>
              <div style={{ background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:12,
                padding:"14px 16px", fontSize:13, color:"#14532d", lineHeight:1.6,
                fontStyle:"italic", maxHeight:150, overflowY:"auto" }}>
                "{previewMsg}"
              </div>
            </div>

            {/* Primary CTA — Sends + auto-marks Reviewed */}
            <button
              disabled={!patientPhone}
              onClick={() => {
                sendReviewRequest(patientName, patientPhone);
                // Auto-mark as reviewed if we know which archived patient this is
                if (form.reviewPatientId) updateReviewStatus(form.reviewPatientId, "reviewed");
                closeModal();
              }}
              style={{ width:"100%", background: patientPhone ? "#25D366" : "#9ca3af",
                border:"none", borderRadius:12, padding:"14px 0", color:"#fff",
                fontWeight:800, fontSize:16, cursor: patientPhone ? "pointer" : "not-allowed",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                boxShadow: patientPhone ? "0 4px 15px rgba(37,211,102,0.35)" : "none",
                transition:"transform 0.15s", marginBottom:8 }}
              onMouseEnter={e => { if(patientPhone) e.currentTarget.style.transform="scale(1.02)"; }}
              onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
              <svg width="22" height="22" viewBox="0 0 448 512" fill="currentColor">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
              Open WhatsApp &amp; Send
            </button>
            <div style={{ textAlign:"center", fontSize:12, color:"#9ca3af", marginBottom:12 }}>
              Sending will automatically mark this patient as <strong>Reviewed ✅</strong>
            </div>

            <div style={{ textAlign:"center", marginBottom:12 }}>
              <button onClick={() => { if (form.reviewPatientId) updateReviewStatus(form.reviewPatientId, "reviewed"); closeModal(); }}
                style={{ background:"none", border:"none", color:"#6b7280", fontSize:12, textDecoration:"underline", cursor:"pointer" }}>
                Just Mark as Reviewed
              </button>
            </div>

            <Btn variant="ghost" onClick={closeModal} style={{ width:"100%" }}>Cancel</Btn>
          </Modal>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom: isMobile ? 76 : 24, left:"50%", transform:"translateX(-50%)",
          background:toast.type==="error"?"#ef4444":"#111827",
          color:"#fff", padding:"12px 20px", borderRadius:10,
          fontSize:14, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", zIndex:2000,
          whiteSpace:"nowrap" }}>
          {toast.type==="error"?"⚠️ ":"✅ "}{toast.msg}
        </div>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
          background:"#fff", borderTop:"1px solid #e5e7eb",
          display:"grid", gridTemplateColumns:"repeat(5, 1fr)", alignItems:"center",
          boxShadow:"0 -4px 20px rgba(0,0,0,0.1)", height:68, paddingBottom:"env(safe-area-inset-bottom)" }}>

          {/* Appointments */}
          <button onClick={() => setView("appointments")} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", width:"100%", height:"100%", padding:"0",
            color: view==="appointments" ? "#3b82f6" : "#94a3b8" }}>
            <span style={{ fontSize:22 }}>📅</span>
            <span style={{ fontSize:10, fontWeight: view==="appointments"?700:500 }}>Appts</span>
          </button>

          {/* Patients */}
          <button onClick={() => setView("patients")} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", width:"100%", height:"100%", padding:"0",
            color: view==="patients" ? "#3b82f6" : "#94a3b8" }}>
            <span style={{ fontSize:22 }}>👥</span>
            <span style={{ fontSize:10, fontWeight: view==="patients"?700:500 }}>Patients</span>
          </button>

          {/* FAB — Quick Add Appointment */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}>
            <button onClick={() => {
              setForm({ date:TODAY, doctor:DOCTORS[0] });
              setModal("add-appointment-global");
            }} style={{
              width:52, height:52, borderRadius:"50%",
              background:"linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border:"none", cursor:"pointer", fontSize:26, color:"#fff",
              boxShadow:"0 4px 16px rgba(59,130,246,0.5)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transform:"translateY(-12px)" }}>
              +
            </button>
          </div>

          {/* Revenue */}
          <button onClick={() => setView("revenue")} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", width:"100%", height:"100%", padding:"0",
            color: view==="revenue" ? "#3b82f6" : "#94a3b8" }}>
            <span style={{ fontSize:22 }}>💰</span>
            <span style={{ fontSize:10, fontWeight: view==="revenue"?700:500 }}>Revenue</span>
          </button>

          {/* Reminders */}
          <button onClick={() => setView("reminders")} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", width:"100%", height:"100%", padding:"0",
            color: view==="reminders" ? "#3b82f6" : "#94a3b8" }}>
            <span style={{ fontSize:22 }}>🔔</span>
            <span style={{ fontSize:10, fontWeight: view==="reminders"?700:500 }}>Reminders</span>
          </button>
        </div>
      )}

    </div>
  );
}
