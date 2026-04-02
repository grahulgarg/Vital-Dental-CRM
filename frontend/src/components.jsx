// Shared UI primitives for Vital Dental
export const COLORS = ["#0ea5e9","#8b5cf6","#ec4899","#f97316","#10b981","#f59e0b"];
export const DOCTORS = ["Dr. Mehta","Dr. Singh","Dr. Kapoor","Dr. Sharma"];
export const TREATMENT_TYPES = ["Root Canal","Cleaning","Extraction","Filling","Crown","Implant","Braces Consult","Whitening","X-Ray","Checkup","Scaling","Fluoride Treatment"];
export const TODAY = new Date().toISOString().split("T")[0];

export const Avatar = ({ name, size=40 }) => {
  const safeName = name || "?";
  const idx = safeName.charCodeAt(0) % COLORS.length;
  const initials = safeName.split(" ").map(n=>n[0]||"").join("").slice(0,2).toUpperCase() || "?";
  return <div style={{width:size,height:size,borderRadius:"50%",background:COLORS[idx],color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,flexShrink:0}}>{initials}</div>;
};

export const Badge = ({ status }) => {
  const s = {Completed:{bg:"#dcfce7",c:"#166534"},Scheduled:{bg:"#dbeafe",c:"#1e40af"},Cancelled:{bg:"#fee2e2",c:"#991b1b"}}[status]||{bg:"#f3f4f6",c:"#374151"};
  return <span style={{background:s.bg,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{status}</span>;
};

export const Modal = ({ title, onClose, children, wide }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:wide?640:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#0f172a"}}>{title}</h2>
        <button onClick={onClose} style={{border:"none",background:"#f1f5f9",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

export const Inp = ({ label, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</label>}
    <input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",background:"#f8fafc",fontFamily:"inherit",color:"#0f172a"}} {...p}/>
  </div>
);

export const Sel = ({ label, children, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</label>}
    <select style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",background:"#f8fafc",fontFamily:"inherit",color:"#0f172a"}} {...p}>{children}</select>
  </div>
);

export const TextArea = ({ label, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</label>}
    <textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",background:"#f8fafc",fontFamily:"inherit",resize:"vertical",color:"#0f172a"}} {...p}/>
  </div>
);

export const Btn = ({ children, variant="primary", small, loading, ...p }) => {
  const v = {primary:{background:"#0ea5e9",color:"#fff"},dark:{background:"#0f172a",color:"#fff"},danger:{background:"#ef4444",color:"#fff"},ghost:{background:"#f1f5f9",color:"#475569"},success:{background:"#10b981",color:"#fff"},warning:{background:"#f59e0b",color:"#fff"}}[variant];
  return <button style={{...v,border:"none",borderRadius:8,padding:small?"6px 12px":"10px 20px",fontSize:small?12:14,fontWeight:600,cursor:loading?"wait":"pointer",fontFamily:"inherit",opacity:loading?0.7:1,whiteSpace:"nowrap",...p.style}} {...p}>{loading?"Sending…":children}</button>;
};

export const Card = ({ children, style, noPadding }) => (
  <div style={{background:"#fff",borderRadius:16,padding:noPadding?0:24,border:"1px solid #e2e8f0",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",...style}}>{children}</div>
);

export const StatCard = ({ icon, label, value, color, sub, trend }) => (
  <Card style={{display:"flex",flexDirection:"column",gap:8, position:"relative", overflow:"hidden", border:`1px solid ${color}30`, background:`linear-gradient(135deg, #ffffff 0%, ${color}08 100%)`}}>
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
      <div style={{width:46,height:46,borderRadius:12,background:color+"15",color:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon}</div>
      {trend && <div style={{fontSize:12, fontWeight:700, color:trend.up?"#10b981":"#ef4444", background:trend.up?"#dcfce7":"#fee2e2", padding:"4px 8px", borderRadius:20}}>{trend.up?"↑":"↓"} {trend.val}</div>}
    </div>
    <div style={{marginTop:4}}>
      <div style={{fontSize:32,fontWeight:800,color:"#0f172a", letterSpacing:"-0.5px"}}>{value}</div>
      <div style={{fontSize:14,color:"#64748b",fontWeight:600}}>{label}</div>
    </div>
    {sub && <div style={{fontSize:12,color:"#94a3b8", marginTop:4}}>{sub}</div>}
  </Card>
);

export const Toast = ({ msg, type }) => (
  <div style={{position:"fixed",bottom:24,right:24,background:type==="error"?"#ef4444":type==="warning"?"#f59e0b":"#0f172a",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.25)",zIndex:2000,maxWidth:360}}>
    {type==="error"?"❌ ":type==="warning"?"⚠️ ":"✅ "}{msg}
  </div>
);

export const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",padding:60,color:"#94a3b8",fontSize:15,flexDirection:"column",gap:12}}>
    <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTop:"3px solid #0ea5e9",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    Loading…
  </div>
);
