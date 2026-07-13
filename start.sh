#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
WEB_DIR="$SCRIPT_DIR/web"
DATA_DIR="$SCRIPT_DIR/data"
PID_FILE="$SCRIPT_DIR/.pid"
PY_PID_FILE="$SCRIPT_DIR/.pid_py"
LOG_FILE="$SCRIPT_DIR/server.log"
PY_LOG_FILE="$SCRIPT_DIR/py_service.log"
PY_PORT=8765

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      ${GREEN}Comrade Assistant - Setup & Launch${BLUE}        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  err "Node.js is not installed. Please install Node.js >= 18."
  exit 1
fi
ok "Node.js $(node --version)"

# 2. Create data directory
mkdir -p "$DATA_DIR"
ok "Data directory ready"

# 3. Install server dependencies
info "Installing server dependencies..."
(cd "$SERVER_DIR" && npm install --silent --ignore-scripts 2>/dev/null)
ok "Server dependencies installed"

# 4. Install web dependencies
info "Installing frontend dependencies..."
(cd "$WEB_DIR" && npm install --silent 2>/dev/null)
ok "Frontend dependencies installed"

# 5. Build frontend
info "Building frontend..."
(cd "$WEB_DIR" && npx vite build --logLevel warn)
ok "Frontend built to web/dist/"

# 6. Start Python classification service
info "Starting Python classification service..."
PY_SERVICE_DIR="$SERVER_DIR/py_service"
(cd "$PY_SERVICE_DIR" && \
  HF_ENDPOINT=https://hf-mirror.com \
  setsid python -u main.py > "$PY_LOG_FILE" 2>&1 &)
echo $! > "$PY_PID_FILE"
ok "Python service launched (port $PY_PORT, may take ~30s to load model)"

# 7. Find available port
PORT="${PORT:-3090}"
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
  warn "Port $PORT is in use, trying $((PORT + 1))"
  PORT=$((PORT + 1))
done
export PORT

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🚀  Comrade Assistant is starting...        ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:${PORT}              ║${NC}"
echo -e "${GREEN}║  API:       http://localhost:${PORT}/api/health  ║${NC}"
echo -e "${GREEN}║  Logs:      ${LOG_FILE}    ║${NC}"
echo -e "${GREEN}║  Stop:      bash stop.sh                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 8. Start server — 完全脱离终端，关闭 SSH 不停止
cd "$SERVER_DIR"

# 使用 setsid 创建新的会话（session），彻底脱离当前终端
setsid npx tsx src/index.ts > "$LOG_FILE" 2>&1 &
SS_PID=$!

sleep 2

# 从端口获取真正的 Node.js 进程 PID（setsid 可能 fork）
ACTUAL_PID=$(lsof -ti :$PORT -sTCP:LISTEN 2>/dev/null)
if [ -z "$ACTUAL_PID" ]; then
  ACTUAL_PID=$SS_PID
fi
echo $ACTUAL_PID > "$PID_FILE"

if kill -0 $ACTUAL_PID 2>/dev/null; then
  ok "Server started successfully (PID: $ACTUAL_PID)"
  echo ""
  echo "  To view logs:    tail -f $LOG_FILE"
  echo "  To stop:         bash $SCRIPT_DIR/stop.sh"
  echo ""
  echo "  💡 The server runs in a detached session. Closing this terminal"
  echo "     or SSH connection will NOT affect it."
  echo ""
else
  err "Server failed to start. Check logs: $LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi
