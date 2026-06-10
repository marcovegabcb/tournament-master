#!/bin/bash
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $api_pid $web_pid 2>/dev/null
  wait $api_pid $web_pid 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

DIR="$(cd "$(dirname "$0")" && pwd)"

kill_port() {
  local pid=$(lsof -ti:$1 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  → Killing process on port $1 (PID $pid)"
    kill $pid 2>/dev/null
    sleep 1
  fi
}

echo "🧹 Cleaning ports..."
kill_port 5185
kill_port 4200

echo "🚀 Starting backend (Torneos.API)..."
(cd "$DIR/Torneos.API" && dotnet run) &
api_pid=$!

echo "🌐 Starting frontend (TorneosWeb)..."
(cd "$DIR/TorneosWeb" && npx ng serve --host 0.0.0.0 --poll 2000 --open) &
web_pid=$!

echo ""
echo "📡 Backend PID: $api_pid"
echo "🌍 Frontend PID: $web_pid"
echo ""
echo "Press Ctrl+C to stop both services."

wait
