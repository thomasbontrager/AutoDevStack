#!/usr/bin/env bash
# deploy-prod.sh — Production deployment via Docker Compose
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "🚀  AI Swarm Platform — Production Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load .env
if [[ -f ".env" ]]; then
  echo "📄  Loading .env …"
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# Build and start containers with restart-always policy
echo ""
echo "🐳  Building and starting Docker containers …"
docker compose up -d --build

# Set containers to restart=always
echo ""
echo "🔄  Configuring restart policy …"
docker update --restart=always ai-swarm-engine 2>/dev/null   || true
docker update --restart=always ai-swarm-dashboard 2>/dev/null || true
docker update --restart=always ai-swarm-postgres 2>/dev/null  || true

echo ""
echo "⏰  Scheduling swarm cron job (runs every hour) …"
CRON_JOB="0 * * * * cd $SCRIPT_DIR && docker compose run --rm swarm >> /var/log/ai-swarm.log 2>&1"
# Add only if not already present
(crontab -l 2>/dev/null | grep -qF "ai-swarm-platform") || \
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅  Production deployment complete"
echo "   Dashboard : http://localhost:4000"
echo "   Containers: $(docker compose ps --services | tr '\n' ' ')"
