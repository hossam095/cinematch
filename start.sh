#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== RecomendMe ==="
echo ""

# Backend
echo "[1/2] Démarrage du backend FastAPI..."
cd "$ROOT/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID → http://localhost:8000"

# Wait for backend to be ready
sleep 2

# Frontend
echo "[2/2] Démarrage du frontend React..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID → http://localhost:5173"

echo ""
echo "==================================="
echo "  Application prête !"
echo "  → Ouvrez http://localhost:5173"
echo "  → API docs: http://localhost:8000/docs"
echo "==================================="
echo ""
echo "Appuyez sur Ctrl+C pour arrêter."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Arrêt.'" INT TERM
wait
