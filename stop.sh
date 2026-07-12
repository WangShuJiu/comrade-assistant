#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.pid"
PORT="${PORT:-3090}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""

# 方式1: 通过 PID 文件
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo -e "${GREEN}[STOP]${NC} Stopping Comrade Assistant (PID: $PID)..."
    kill "$PID" 2>/dev/null
    sleep 1
    if kill -0 "$PID" 2>/dev/null; then
      echo -e "${YELLOW}[FORCE]${NC} Force killing..."
      kill -9 "$PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
    echo -e "${GREEN}[OK]${NC}   Server stopped."
    echo ""
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# 方式2: 通过端口查找
PID=$(lsof -ti :$PORT -sTCP:LISTEN 2>/dev/null)
if [ -n "$PID" ]; then
  echo -e "${GREEN}[STOP]${NC} Stopping process on port $PORT (PID: $PID)..."
  kill "$PID" 2>/dev/null
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null
  fi
  echo -e "${GREEN}[OK]${NC}   Server stopped."
  echo ""
  exit 0
fi

echo -e "${YELLOW}[WARN]${NC} No running Comrade Assistant found."
echo ""
