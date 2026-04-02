#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  DentaCare — start everything with one command
#  Usage:  ./start.sh
# ─────────────────────────────────────────────────────────────────

echo ""
echo "🦷  DentaCare Clinic Manager"
echo "────────────────────────────"

# ── 1. Backend ─────────────────────────────────────────────────
echo ""
echo "▶  Starting FastAPI backend..."
cd backend

# Install Python deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "   Installing Python dependencies..."
  pip3 install -r requirements.txt -q
fi

# Start backend in background
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   ✅  Backend running at http://localhost:8000"
echo "   📄  API docs at     http://localhost:8000/docs"

# ── 2. Frontend ────────────────────────────────────────────────
echo ""
echo "▶  Starting React frontend..."
cd ../frontend

# Install npm deps if needed
if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages (first time only, ~1 min)..."
  npm install -q
fi

# Start frontend in background
npm start &
FRONTEND_PID=$!
echo "   ✅  Frontend running at http://localhost:3000"

# ── 3. Open browser ────────────────────────────────────────────
sleep 4
echo ""
echo "🚀  Opening dashboard..."
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || true

echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# ── Cleanup on exit ────────────────────────────────────────────
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
