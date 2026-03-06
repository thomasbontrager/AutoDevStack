#!/usr/bin/env bash
# deploy-cloud.sh — Deploy AI Swarm Platform to a remote cloud server via SSH
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SERVER_HOST="${SERVER_HOST:?Set SERVER_HOST in .env or environment}"
SERVER_USER="${SERVER_USER:-ubuntu}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_rsa}"
REPO_URL="${REPO_URL:-https://github.com/your-org/ai-swarm-platform.git}"
REMOTE_DIR="/opt/ai-swarm-platform"
DOMAIN="${DOMAIN:-}"

echo ""
echo "☁️   AI Swarm Platform — Cloud Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Host   : $SERVER_USER@$SERVER_HOST"
echo "  Dir    : $REMOTE_DIR"
[[ -n "$DOMAIN" ]] && echo "  Domain : $DOMAIN"
echo ""

SSH="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST"

# 1. Install Docker
echo "🐳  Installing Docker on remote server …"
$SSH "bash -c '
  if ! command -v docker &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker \$USER
    echo \"Docker installed.\"
  else
    echo \"Docker already installed: \$(docker --version)\"
  fi
'"

# 2. Clone / update repository
echo ""
echo "📦  Cloning / updating repository …"
$SSH "bash -c '
  if [[ -d $REMOTE_DIR ]]; then
    cd $REMOTE_DIR && git pull
  else
    git clone $REPO_URL $REMOTE_DIR
  fi
'"

# 3. Copy .env
if [[ -f ".env" ]]; then
  echo ""
  echo "📄  Copying .env to server …"
  scp -i "$DEPLOY_KEY" -o StrictHostKeyChecking=no .env "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/.env"
fi

# 4. Docker Compose up
echo ""
echo "🚀  Starting Docker Compose on remote server …"
$SSH "bash -c '
  cd $REMOTE_DIR
  docker compose pull --quiet 2>/dev/null || true
  docker compose up -d --build
'"

# 5. Configure UFW firewall
echo ""
echo "🔒  Configuring firewall …"
$SSH "bash -c '
  if command -v ufw &>/dev/null; then
    ufw allow 22/tcp   comment \"SSH\" 2>/dev/null || true
    ufw allow 4000/tcp comment \"AI Swarm Dashboard\" 2>/dev/null || true
    [[ \$(ufw status | grep -c inactive) -gt 0 ]] && ufw --force enable 2>/dev/null || true
    echo \"Firewall configured.\"
  else
    echo \"ufw not available — skipping firewall setup.\"
  fi
'"

echo ""
echo "✅  Cloud deployment complete!"
echo "   Dashboard : http://$SERVER_HOST:4000"
[[ -n "$DOMAIN" ]] && echo "   Domain   : https://$DOMAIN"
