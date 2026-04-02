"""Comprehensive mojibake fix and patients view update."""
with open(r"e:\dashboard vital dental\frontend\src\App.jsx", encoding="utf-8") as f:
    content = f.read()

# Check if the file has double-encoded chars
# The pattern â"€ is U+00E2 U+0094 U+0080 which decodes to U+2500 (box drawing ─)
# This is "double encoding" – UTF-8 bytes were treated as latin-1

# Attempt fix: re-encode as latin-1 then decode as UTF-8
# But since the file is already valid UTF-8, the double-encoded chars are already
# stored as pairs of "wrong" codepoints.
# We need to find sequences where multi-byte UTF-8 chars were decoded as iso-8859-1
# and then encoded again as UTF-8.

# Strategy: encode each character back to latin-1 bytes, then decode as UTF-8
import re

def fix_mojibake(text):
    """Try to fix double-encoded UTF-8 that was incorrectly processed through latin-1."""
    result = []
    i = 0
    while i < len(text):
        c = text[i]
        # Check for sequences starting with characters in the range 0xC2-0xF4
        # (these are the first bytes of multi-byte UTF-8 sequences)
        if '\u00c2' <= c <= '\u00f4':
            # Try to collect the continuation bytes (0x80-0xBF)
            seq = [c]
            j = i + 1
            while j < len(text) and '\u0080' <= text[j] <= '\u00bf':
                seq.append(text[j])
                j += 1
            # Try to decode this as if it were raw UTF-8 bytes
            raw_bytes = bytes(ord(x) for x in seq)
            try:
                decoded = raw_bytes.decode('utf-8')
                result.append(decoded)
                i = j
                continue
            except:
                pass
        result.append(c)
        i += 1
    return ''.join(result)

# Find how many chars need fixing
problem_chars = sum(1 for c in content if '\u00c2' <= c <= '\u00f4' or '\u0080' <= c <= '\u00bf')
print(f"Potential mojibake chars before fix: {problem_chars}")

fixed = fix_mojibake(content)
problem_after = sum(1 for c in fixed if '\u00c2' <= c <= '\u00f4' or '\u0080' <= c <= '\u00bf')
print(f"Potential mojibake chars after fix: {problem_after}")

# Check that key content is still there
key_checks = ['isMobile', 'useIsMobile', 'mobileApptDate', 'Modal', 'patients', 'appointments']
for k in key_checks:
    print(f"  {k}: {'OK' if k in fixed else 'MISSING'}")

# Now replace the patients active table with mobile-responsive version
old_block = "/* \u2500\u2500 Active Patients Table \u2500\u2500 */"
new_block = "/* \u2500\u2500 Active Patients (mobile: cards, desktop: table) \u2500\u2500 */"
if old_block in fixed:
    fixed = fixed.replace(old_block, new_block, 1)
    print("\nFound and marked patients table block")
else:
    print(f"\nNOT FOUND: '{old_block}'")
    idx = fixed.find("Active Patients Table")
    if idx >= 0:
        print(f"  'Active Patients Table' found at {idx}, context: {repr(fixed[idx-20:idx+50])}")

# Replace the table wrapper with a conditional
old_table_wrapper = """            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #f1f5f9",
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
            </div>"""

new_table_wrapper = """            {isMobile ? (
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
                          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>\U0001f4de {p.phone}</div>
                          {nextAppt && (
                            <div style={{ fontSize:12, color:"#1d4ed8", marginTop:2, fontWeight:600 }}>
                              \U0001f4c5 {nextAppt.date} at {nextAppt.time}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          {balance > 0 ? (
                            <div style={{ fontSize:13, fontWeight:700, color:"#dc2626" }}>\u20b9{balance.toLocaleString()} due</div>
                          ) : (
                            <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>\u2714 Paid</div>
                          )}
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{(p.appointments||[]).length} visits</div>
                        </div>
                        <span style={{ color:"#d1d5db", fontSize:18 }}>\u203a</span>
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
            )}"""

if old_table_wrapper in fixed:
    fixed = fixed.replace(old_table_wrapper, new_table_wrapper, 1)
    print("Replaced active patients table with mobile card version!")
else:
    print("Table wrapper NOT found - searching for it...")
    search = 'boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:24 }}'
    idx = fixed.find(search)
    print(f"  Found marginBottom:24 at: {idx}")
    if idx > 0:
        print(f"  Context: {repr(fixed[idx-100:idx+100])}")

with open(r"e:\dashboard vital dental\frontend\src\App.jsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("\nFile written!")
