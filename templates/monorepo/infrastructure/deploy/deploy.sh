#!/bin/bash
# deploy.sh — simple deployment script for the monorepo

set -e

echo "🚀 Deploying monorepo..."

# Build all apps
npm run build

# Run database migrations
cd packages/database && npx prisma migrate deploy && cd ../..

# Restart services (example with Docker Compose)
cd infrastructure/docker
docker-compose pull
docker-compose up -d --build

echo "✅ Deployment complete!"
