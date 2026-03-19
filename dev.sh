#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Start the English Tutor App (backend + frontend) in one command
# Usage:  ./dev.sh          Start both servers
#         ./dev.sh stop     Kill both servers
#         ./dev.sh backend  Start backend only
#         ./dev.sh frontend Start frontend only
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

stop_servers() {
  echo -e "${RED}🛑 Stopping servers...${NC}"
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✅ Ports 8000 and 5173 cleared${NC}"
}

start_backend() {
  echo -e "${BLUE}🔧 Starting backend on http://localhost:8000 ...${NC}"
  cd "$ROOT_DIR/backend"
  source venv/bin/activate
  alembic upgrade head 2>/dev/null || true
  uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  echo -e "${GREEN}   Backend PID: $BACKEND_PID${NC}"
}

start_frontend() {
  echo -e "${BLUE}🎨 Starting frontend on http://localhost:5173 ...${NC}"
  cd "$ROOT_DIR/frontend"
  npm run dev &
  FRONTEND_PID=$!
  echo -e "${GREEN}   Frontend PID: $FRONTEND_PID${NC}"
}

case "${1:-start}" in
  stop)
    stop_servers
    ;;
  backend)
    stop_servers
    start_backend
    wait
    ;;
  frontend)
    start_frontend
    wait
    ;;
  start|"")
    stop_servers
    start_backend
    sleep 2
    start_frontend
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🚀 English Tutor App is running!${NC}"
    echo -e "${GREEN}  📡 Backend:  http://localhost:8000${NC}"
    echo -e "${GREEN}  🌐 Frontend: http://localhost:5173${NC}"
    echo -e "${GREEN}  📖 API Docs: http://localhost:8000/docs${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Press ${RED}Ctrl+C${NC} to stop both servers."
    # Wait for both background processes; on Ctrl+C clean up
    trap 'stop_servers; exit 0' INT TERM
    wait
    ;;
  *)
    echo "Usage: ./dev.sh [start|stop|backend|frontend]"
    exit 1
    ;;
esac
