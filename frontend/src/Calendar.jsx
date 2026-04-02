import { useState } from "react";
import { Btn } from "./components";

const TIME_SLOTS = [];
for (let i = 10; i <= 19; i++) {
  TIME_SLOTS.push(`${i.toString().padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${i.toString().padStart(2, '0')}:30`);
}

export function WeeklyCalendar({ appointments, onSlotClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getWeekDays = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        days.push(nextDay);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const prevWeek = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
  };
  const nextWeek = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
  };
  const today = () => {
      setCurrentDate(new Date());
  };

  const formatDate = (date) => {
      const d = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return d.toISOString().split('T')[0];
  };

  const appointmentsMap = {};
  (appointments || []).forEach(appt => {
      const key = `${appt.date}_${appt.time}`;
      if (!appointmentsMap[key]) appointmentsMap[key] = [];
      appointmentsMap[key].push(appt);
  });

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
          <h2 style={{margin:0, fontSize:18, fontWeight:700}}>Weekly Schedule</h2>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <Btn variant="ghost" small onClick={prevWeek}>← Prev</Btn>
              <Btn variant="ghost" small onClick={today}>Today</Btn>
              <Btn variant="ghost" small onClick={nextWeek}>Next →</Btn>
          </div>
      </div>
      
      <div style={{display: "flex", gap: 10, marginBottom: 16, fontSize: 13, fontWeight: 600}}>
          <div style={{display: "flex", alignItems: "center", gap: 6}}>
             <div style={{width: 14, height: 14, background: "#dcfce7", borderRadius: 4, border: "1px solid #bbf7d0"}}></div> Open Slot
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 6}}>
             <div style={{width: 14, height: 14, background: "#dbeafe", borderRadius: 4, border: "1px solid #bfdbfe"}}></div> Booked
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 6}}>
             <div style={{width: 14, height: 14, background: "#f1f5f9", borderRadius: 4, border: "1px solid #e2e8f0"}}></div> Closed / Break
          </div>
      </div>

      <div style={{overflowX: "auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse", minWidth: 800, tableLayout: "fixed"}}>
          <thead>
            <tr>
              <th style={{width: 60, padding: 10, borderBottom: "2px solid #e2e8f0"}}></th>
              {weekDays.map((d, i) => (
                <th key={i} style={{padding: 10, borderBottom: "2px solid #e2e8f0", textAlign: "center", borderLeft: "1px solid #f1f5f9"}}>
                  <div style={{fontWeight: 700, fontSize: 14, color: "#0f172a"}}>{d.toLocaleDateString("en-IN", {weekday: "short"})}</div>
                  <div style={{fontWeight: 500, fontSize: 12, color: "#64748b"}}>{d.toLocaleDateString("en-IN", {month: "short", day: "numeric"})}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time}>
                <td style={{padding: "10px 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textAlign: "right", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #f1f5f9"}}>
                    {time}
                </td>
                {weekDays.map((d, i) => {
                    const dateStr = formatDate(d);
                    const isSaturday = d.getDay() === 6;
                    const hour = parseInt(time.split(':')[0], 10);
                    const isBreak = hour >= 14 && hour < 16;
                    const isClosed = isSaturday || isBreak;
                    
                    const slotAppts = appointmentsMap[`${dateStr}_${time}`] || [];
                    const isBooked = slotAppts.length > 0;
                    
                    let bg = isClosed ? "#f8fafc" : "#dcfce7";
                    let border = isClosed ? "#f1f5f9" : "#bbf7d0";
                    let cursor = isClosed ? "not-allowed" : "pointer";
                    
                    if (isBooked) {
                        bg = "#dbeafe";
                        border = "#bfdbfe";
                    }

                    return (
                        <td key={i} 
                            onClick={() => {
                                if (!isClosed) onSlotClick(dateStr, time);
                            }}
                            style={{
                                border: `1px solid ${border}`,
                                borderLeft: "1px solid #f1f5f9",
                                background: bg,
                                padding: 4,
                                height: 46,
                                cursor: cursor,
                                verticalAlign: "top",
                                transition: "all 0.15s"
                            }}
                            onMouseEnter={e => {
                                if (!isClosed) e.currentTarget.style.filter = "brightness(0.95)";
                            }}
                            onMouseLeave={e => {
                                if (!isClosed) e.currentTarget.style.filter = "brightness(1)";
                            }}
                        >
                            {slotAppts.map(appt => (
                                <div key={appt.id} style={{
                                    background: "#3b82f6", 
                                    color: "#fff", 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    padding: "2px 4px", 
                                    borderRadius: 4,
                                    marginBottom: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }} title={`${appt.patientName} - ${appt.type}`}>
                                    {appt.patientName}
                                </div>
                            ))}
                        </td>
                    );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardCalendar({ appointments, onPatientClick, onDateClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split("T")[0]);

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevYear = () => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
    const nextYear = () => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
    const today = () => {
        const d = new Date();
        setCurrentMonth(d);
        setSelectedDateStr(d.toISOString().split("T")[0]);
    };

    const formatDate = (year, monthIndex, day) => {
        const d = new Date(year, monthIndex, day);
        return d.toISOString().split('T')[0];
    };

    const appointmentsMap = {};
    (appointments || []).forEach(appt => {
        if (!appointmentsMap[appt.date]) appointmentsMap[appt.date] = [];
        appointmentsMap[appt.date].push(appt);
    });

    const renderDays = () => {
        const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`blank-${i}`} style={{ padding: 10 }} />);
        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isSelected = selectedDateStr === dateStr;
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const hasAppt = appointmentsMap[dateStr]?.length > 0;
            const apptCount = appointmentsMap[dateStr]?.length || 0;

            return (
                <div key={day} 
                    onClick={() => {
                        setSelectedDateStr(dateStr);
                        onDateClick?.(dateStr);
                    }}
                    style={{
                        padding: "12px 8px", 
                        textAlign: "center", 
                        border: isSelected ? "2px solid #3b82f6" : "1px solid #f1f5f9",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: isSelected ? "#eff6ff" : (isToday ? "#f0fdf4" : "#fff"),
                        boxShadow: isSelected ? "0 4px 12px rgba(59,130,246,0.15)" : "none",
                        transition: "all 0.15s",
                        position: "relative"
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = isToday ? "#f0fdf4" : "#fff"; }}
                >
                    <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? "#1e40af" : (isToday ? "#166534" : "#334155") }}>{day}</div>
                    <div style={{ height: 20, display: "flex", justifyContent: "center", alignItems: "center", marginTop: 4 }}>
                        {hasAppt && <span style={{ background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{apptCount}</span>}
                    </div>
                </div>
            );
        });
        return [...blanks, ...days];
    };

    const selectedAppts = (appointmentsMap[selectedDateStr] || []).sort((a,b) => a.time.localeCompare(b.time));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Calendar Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Btn variant="ghost" small onClick={prevYear}>«</Btn>
                    <Btn variant="ghost" small onClick={prevMonth}>‹ Prev</Btn>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Btn variant="ghost" small onClick={today}>Today</Btn>
                    <Btn variant="ghost" small onClick={nextMonth}>Next ›</Btn>
                    <Btn variant="ghost" small onClick={nextYear}>»</Btn>
                </div>
            </div>

            {/* Calendar Grid */}
            <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{d}</div>
                    ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                    {renderDays()}
                </div>
            </div>

        </div>
    );
}
