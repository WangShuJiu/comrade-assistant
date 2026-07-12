#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
WEB_DIR="$SCRIPT_DIR/web"
DATA_DIR="$SCRIPT_DIR/data"

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
(cd "$SERVER_DIR" && npm install --silent 2>/dev/null)
ok "Server dependencies installed"

# 4. Install web dependencies
info "Installing frontend dependencies..."
(cd "$WEB_DIR" && npm install --silent 2>/dev/null)
ok "Frontend dependencies installed"

# 5. Build frontend
info "Building frontend..."
(cd "$WEB_DIR" && npx vite build --logLevel warn)
ok "Frontend built to web/dist/"

# 6. Find available port
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
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 7. Start server
cd "$SERVER_DIR"
exec npx tsx src/index.ts

