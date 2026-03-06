#!/usr/bin/env bash
# start-swarm.sh — Local launcher for the AI Swarm Platform
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "🌐  AI Swarm Platform — Starting up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load .env if present
if [[ -f ".env" ]]; then
  echo "📄  Loading .env …"
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# Initialise config directories
echo "📁  Initialising config directories …"
mkdir -p config/history

# Install deps if needed
if [[ ! -d "node_modules" ]]; then
  echo "📦  Installing dependencies …"
  npm install
fi

echo ""
echo "🚀  Launching swarm engine (background) …"
node scripts/viral-swarm-final.js &
SWARM_PID=$!
echo "   Swarm PID: $SWARM_PID"

echo ""
echo "📊  Starting dashboard server …"
node scripts/dashboard-server.js &
DASHBOARD_PID=$!
echo "   Dashboard PID: $DASHBOARD_PID"

echo ""
echo "✅  Services started"
echo "   Dashboard : http://localhost:${PORT:-4000}"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both processes; kill both on exit
cleanup() {
  echo ""
  echo "🛑  Stopping services …"
  kill "$SWARM_PID" "$DASHBOARD_PID" 2>/dev/null || true
  echo "   Done."
}
trap cleanup EXIT INT TERM

wait
