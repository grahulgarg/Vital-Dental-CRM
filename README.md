# 🦷 Vital Dental — Patient Management System

A fully offline, locally-hosted clinic management system. No monthly fees, no cloud, runs on your clinic PC.

```
React Frontend  (localhost:3000)
      ↕  REST API
FastAPI Backend  (localhost:8000)
      ↕  SQLite
dental.db        ← single file in /backend
```

---

## 📁 Project Structure

```
dashboard vital dental\
├── install.bat          ← Run ONCE on first setup
├── start.bat            ← Double-click to launch
├── stop.bat             ← Stop all servers
│
├── backend\
│   ├── main.py          ← All API endpoints
│   ├── database.py      ← SQLite logic
│   ├── requirements.txt ← Python packages
│   ├── .env             ← Your API keys (private)
│   └── .env.example     ← Template for .env
│
└── frontend\
    ├── package.json
    └── src\
        ├── App.jsx       ← Main dashboard
        ├── components.jsx← Shared UI parts
        ├── api.js        ← Backend calls
        └── index.js      ← Entry point
```

---

## 🚀 Quick Start (Windows)

### Prerequisites
| Tool    | Version | Install |
|---------|---------|---------|
| Python  | 3.9+    | https://python.org |
| Node.js | 18+     | https://nodejs.org |

### Step 1 — First-time setup
```
Double-click  install.bat
```
This installs all Python and Node packages automatically.

### Step 2 — Launch
```
Double-click  start.bat
```
Opens two terminal windows and the browser automatically.

### Stop
```
Double-click  stop.bat
```

---

## 📱 WhatsApp Setup (Twilio)

1. Sign up free at https://twilio.com
2. Go to **Messaging → Try it → Send a WhatsApp message**
3. Follow the Sandbox instructions — patients must send a join message once
4. In the Vital Dental dashboard, go to **Settings** and enter:
   - Account SID
   - Auth Token
   - WhatsApp From number (e.g. `whatsapp:+14155238886`)

### Sending a Reminder
- Go to any patient → Appointments tab → click **📱 Remind**
- Or on the Dashboard → upcoming list → click **📱 Remind**
- Or on the Appointments page → click **📱 Remind** in the row

### Sending a Review Request
- Go to any patient → Treatments tab → click **⭐ Request Review**
- First add your Google review URL in **Settings**

---

## ⭐ Google Review URL

1. Open Google Maps
2. Search your clinic → click your listing
3. Click **"Get more reviews"** → copy the share link
4. Paste it in **Vital Dental → Settings → Google Review URL**

---

## 🔧 Customisation

**Add a doctor:** Edit `DOCTORS` array in `frontend\src\components.jsx`  
**Add a treatment type:** Edit `TREATMENT_TYPES` in the same file  
**Reset database:** Delete `backend\dental.db` and restart backend

---

## 📞 Support

API docs available at: **http://localhost:8000/docs** (when running)
