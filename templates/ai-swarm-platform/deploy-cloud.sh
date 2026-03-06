#!/bin/bash

###############################################################################
# Cloud Deployment Script
#
# Deploys AI Swarm Platform to a remote cloud server
###############################################################################

set -e

echo "======================================================================"
echo "☁️  AI Swarm Platform - Cloud Deployment"
echo "======================================================================"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found"
  exit 1
fi

# Check required cloud deployment variables
REQUIRED_VARS=("SERVER_HOST" "SERVER_USER" "DOMAIN")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set in .env"
    exit 1
  fi
done

SERVER="${SERVER_USER}@${SERVER_HOST}"

echo "🌐 Deploying to: $SERVER"
echo "📍 Domain: $DOMAIN"
echo ""

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" echo "Connected" 2>/dev/null; then
  echo "✅ SSH connection successful"
else
  echo "❌ Error: Cannot connect to $SERVER"
  echo "Please ensure:"
  echo "  1. SSH key is configured (ssh-copy-id $SERVER)"
  echo "  2. Server is accessible"
  exit 1
fi

echo ""

# Install Docker on remote server
echo "🐳 Installing Docker on remote server..."
ssh "$SERVER" << 'ENDSSH'
  # Update package list
  sudo apt-get update

  # Install Docker if not present
  if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
  else
    echo "✅ Docker already installed"
  fi

  # Install Docker Compose if not present
  if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
  else
    echo "✅ Docker Compose already installed"
  fi
ENDSSH

echo "✅ Docker setup complete"
echo ""

# Create deployment directory
DEPLOY_DIR="/opt/ai-swarm-platform"
echo "📁 Creating deployment directory..."
ssh "$SERVER" "sudo mkdir -p $DEPLOY_DIR && sudo chown $USER:$USER $DEPLOY_DIR"
echo "✅ Directory created: $DEPLOY_DIR"
echo ""

# Copy project files
echo "📦 Copying project files..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'config/history' \
  ./ "$SERVER:$DEPLOY_DIR/"
echo "✅ Files copied"
echo ""

# Copy .env file
echo "🔐 Copying environment configuration..."
scp .env "$SERVER:$DEPLOY_DIR/.env"
echo "✅ Environment configuration copied"
echo ""

# Deploy on remote server
echo "🚀 Starting deployment on remote server..."
ssh "$SERVER" << ENDSSH
  cd $DEPLOY_DIR

  # Stop existing containers
  echo "Stopping existing containers..."
  docker-compose down 2>/dev/null || true

  # Pull latest images
  echo "Building Docker images..."
  docker-compose build

  # Start services
  echo "Starting services..."
  docker-compose up -d

  # Configure restart policy
  echo "Configuring auto-restart..."
  docker update --restart unless-stopped \$(docker ps -q)

  # Check status
  echo "Checking service status..."
  docker-compose ps

  echo "✅ Deployment complete on server"
ENDSSH

echo ""
echo "🔒 Configuring firewall..."
ssh "$SERVER" << 'ENDSSH'
  # Install UFW if not present
  if ! command -v ufw &> /dev/null; then
    sudo apt-get install -y ufw
  fi

  # Configure firewall rules
  sudo ufw allow 22/tcp   # SSH
  sudo ufw allow 80/tcp   # HTTP
  sudo ufw allow 443/tcp  # HTTPS
  sudo ufw allow 4000/tcp # Dashboard

  # Enable firewall
  sudo ufw --force enable

  echo "✅ Firewall configured"
ENDSSH

echo "✅ Firewall configuration complete"
echo ""

# Display deployment info
echo "======================================================================"
echo "✨ Cloud Deployment Complete!"
echo "======================================================================"
echo ""
echo "Server: $SERVER"
echo "Domain: $DOMAIN"
echo "Dashboard: http://$DOMAIN:4000"
echo ""
echo "Useful commands:"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker-compose logs -f'"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker-compose ps'"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker-compose restart'"
echo ""
echo "Next steps:"
echo "  1. Configure DNS to point $DOMAIN to $SERVER_HOST"
echo "  2. Set up SSL/TLS certificates (Let's Encrypt recommended)"
echo "  3. Configure reverse proxy (nginx/caddy) for production"
echo ""
echo "======================================================================"
