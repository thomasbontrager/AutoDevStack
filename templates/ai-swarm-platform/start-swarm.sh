#!/bin/bash

###############################################################################
# Start Swarm Script
#
# Initializes the AI Swarm Platform locally
###############################################################################

set -e

echo "======================================================================"
echo "🚀 AI Swarm Platform - Startup Script"
echo "======================================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ Created .env file"
  echo ""
  echo "⚠️  IMPORTANT: Please edit .env and add your API keys:"
  echo "   - OPENAI_API_KEY"
  echo "   - GH_TOKEN"
  echo ""
  read -p "Press Enter to continue after updating .env..."
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY is not set in .env"
  exit 1
fi

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Error: GH_TOKEN is not set in .env"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Initialize config directories
echo "📁 Initializing config directories..."
mkdir -p config/history
echo "✅ Config directories ready"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed"
  echo ""
fi

# Generate initial configs if they don't exist
if [ ! -f "config/dev.json" ] || [ ! -f "config/prod.json" ]; then
  echo "🤖 Generating initial AI configs..."
  npm run generate
  echo "✅ Configs generated"
  echo ""
fi

# Start the dashboard in the background
echo "🌐 Starting dashboard server..."
npm run dashboard &
DASHBOARD_PID=$!
echo "✅ Dashboard server started (PID: $DASHBOARD_PID)"
echo "📊 Dashboard: http://localhost:4000"
echo ""

# Wait for dashboard to be ready
echo "⏳ Waiting for dashboard to be ready..."
sleep 3

# Check if dashboard is responding
if curl -s http://localhost:4000/api/health > /dev/null; then
  echo "✅ Dashboard is ready"
else
  echo "⚠️  Dashboard may not be fully ready yet"
fi

echo ""
echo "======================================================================"
echo "✨ AI Swarm Platform Started Successfully!"
echo "======================================================================"
echo ""
echo "Available commands:"
echo "  npm run swarm      - Run the swarm engine"
echo "  npm run monitor    - Monitor swarm analytics"
echo "  npm run qa         - Validate configurations"
echo "  npm run generate   - Generate new AI configs"
echo ""
echo "Dashboard: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop the dashboard"
echo "======================================================================"
echo ""

# Wait for dashboard process
wait $DASHBOARD_PID
