#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== CineMatch ==="
echo ""

# The backend needs Python >= 3.10 (uses "str | None" syntax).
# macOS ships 3.9 as python3, so look for a newer interpreter first.
PYTHON=""
for candidate in "$PYTHON_BIN" python3.13 python3.12 python3.11 python3.10 /opt/anaconda3/bin/python3 python3; do
  [ -z "$candidate" ] && continue
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    PYTHON="$candidate"
    break
  fi
done
if [ -z "$PYTHON" ]; then
  echo "Erreur : Python 3.10+ introuvable (définis PYTHON_BIN=/chemin/vers/python3)."
  exit 1
fi
echo "Python : $($PYTHON --version) ($PYTHON)"

# Backend
echo "[1/2] Démarrage du backend FastAPI..."
cd "$ROOT/backend"
"$PYTHON" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
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
