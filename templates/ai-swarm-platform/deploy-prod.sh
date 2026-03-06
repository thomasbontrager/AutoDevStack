#!/bin/bash

###############################################################################
# Production Deployment Script
#
# Deploys AI Swarm Platform using Docker Compose
###############################################################################

set -e

echo "======================================================================"
echo "🚀 AI Swarm Platform - Production Deployment"
echo "======================================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "Please create .env from .env.example and configure it"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Validate required variables
REQUIRED_VARS=("OPENAI_API_KEY" "GH_TOKEN" "GH_USERNAME")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set in .env"
    exit 1
  fi
done

echo "✅ Environment configuration validated"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true
echo "✅ Containers stopped"
echo ""

# Build images
echo "🔨 Building Docker images..."
docker-compose build
echo "✅ Images built"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
echo "✅ Services started"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

if docker-compose ps | grep -q "Up"; then
  echo "✅ Services are running"
else
  echo "⚠️  Some services may not be running"
fi

echo ""
echo "======================================================================"
echo "✨ Production Deployment Complete!"
echo "======================================================================"
echo ""
echo "Services:"
echo "  Dashboard: http://localhost:4000"
echo "  PostgreSQL: localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f           - View logs"
echo "  docker-compose ps                - Check service status"
echo "  docker-compose exec swarm bash   - Access swarm container"
echo "  docker-compose down              - Stop all services"
echo ""
echo "To run the swarm manually:"
echo "  docker-compose run --rm swarm node scripts/viral-swarm-final.js"
echo ""
echo "======================================================================"

# Optional: Set up cron job
read -p "Do you want to schedule the swarm to run daily? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  CRON_CMD="0 2 * * * cd $(pwd) && docker-compose run --rm swarm node scripts/viral-swarm-final.js >> /var/log/ai-swarm.log 2>&1"

  # Add to crontab if not already present
  (crontab -l 2>/dev/null | grep -v "ai-swarm"; echo "$CRON_CMD") | crontab -

  echo "✅ Cron job scheduled to run daily at 2:00 AM"
  echo "📋 View cron jobs: crontab -l"
fi

echo ""
echo "🎉 Deployment complete!"
