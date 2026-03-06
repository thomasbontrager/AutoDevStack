# 🌊 AI Swarm Platform

> Global autonomous AI swarm platform for multi-agent orchestration, automated repository management, and cross-repo collaboration

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Overview

AI Swarm Platform is a **production-ready distributed system** that orchestrates multiple autonomous AI agents to:

- 🤖 **Run Multiple AI Agents** - Spawn and coordinate AI agents with different capabilities
- ⚙️ **Auto-Optimize Configs** - AI-generated and optimized configuration for dev, prod, and copilot environments
- 📦 **Create GitHub Repositories** - Automatically generate and create repositories with initial content
- 🔀 **Open Cross-Repo PRs** - Manage pull requests across multiple repositories
- 📊 **Track Analytics** - Comprehensive analytics and swarm activity history
- 🗺️ **Live Dashboard** - Real-time world map visualization of swarm activity
- 🐳 **Docker Support** - Full Docker and Docker Compose setup
- ☁️ **Cloud Deployment** - Deploy to any cloud server with automated scripts
- ⚡ **GitHub Actions** - Automated workflows for CI/CD and scheduling

---

## ✨ Features

### Core Capabilities

- **Multi-Agent Orchestration** - Coordinate multiple AI agents working in parallel
- **Intelligent Task Distribution** - Agents automatically distribute and execute tasks
- **Repository Generation** - AI-powered repository idea generation and creation
- **Pull Request Management** - Automated PR creation and management
- **Real-Time Monitoring** - Live dashboard with Socket.IO updates
- **Historical Analytics** - Track all swarm activity over time
- **Configuration Optimization** - AI-generated configs for different environments

### Dashboard Features

- 🗺️ **Interactive World Map** - Leaflet-powered map showing global swarm activity
- 📊 **Live Charts** - Real-time analytics with Chart.js
- 📈 **Performance Metrics** - Agent performance tracking
- 🔴 **Live Updates** - WebSocket-powered real-time data
- 📱 **Responsive Design** - Works on desktop and mobile

### Deployment Options

- **Local Development** - Run on your machine for testing
- **Docker Compose** - Full containerized setup with PostgreSQL
- **Cloud Deployment** - Automated deployment to remote servers
- **GitHub Actions** - Scheduled swarm runs and monitoring

---

## 📋 Prerequisites

- **Node.js 20+** (Required)
- **OpenAI API Key** (Required for AI features)
- **GitHub Personal Access Token** (Required for repository operations)
- **Docker** (Optional, for containerized deployment)
- **PostgreSQL** (Optional, included in Docker Compose)

---

## 🚀 Quick Start

### Option 1: Local Setup

```bash
# Clone or create from template
git clone <repository-url>
cd ai-swarm-platform

# Run setup wizard
node setup.js

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Generate AI configs
npm run generate

# Start the dashboard
npm start
```

Visit **http://localhost:4000** to see the live dashboard.

### Option 2: Docker Setup

```bash
# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Run the swarm
docker-compose run --rm swarm node scripts/viral-swarm-final.js
```

Dashboard available at **http://localhost:4000**

### Option 3: Production Deployment

```bash
# Configure environment
cp .env.example .env
# Edit .env with production settings

# Run production deployment
bash deploy-prod.sh
```

### Option 4: Cloud Deployment

```bash
# Configure .env with server details
# SERVER_HOST, SERVER_USER, DOMAIN

# Deploy to cloud
bash deploy-cloud.sh
```

---

## 📁 Project Structure

```
ai-swarm-platform/
├── .github/
│   └── workflows/          # GitHub Actions workflows
│       ├── ai-global-swarm.yml    # Daily swarm execution
│       ├── deploy.yml              # Deployment automation
│       ├── qa-agent.yml            # Config validation
│       └── monitor-agent.yml       # Monitoring and metrics
├── scripts/
│   ├── run-ai.js                   # AI config generator
│   ├── viral-swarm-final.js        # Core swarm engine
│   ├── deploy.js                   # Deployment script
│   ├── qa.js                       # QA validator
│   ├── monitor.js                  # Analytics monitor
│   ├── dashboard-server.js         # Express + Socket.IO server
│   └── dashboard/
│       └── index.html              # Live dashboard UI
├── config/
│   ├── dev.json                    # Development config
│   ├── prod.json                   # Production config
│   ├── copilot.json                # Copilot config
│   ├── viral-repos.json            # Repository tracking
│   ├── analytics.json              # Swarm analytics
│   └── history/                    # Config history
├── Dockerfile                      # Container image
├── docker-compose.yml              # Multi-service setup
├── setup.js                        # Setup wizard
├── start-swarm.sh                  # Local startup script
├── deploy-prod.sh                  # Production deployment
├── deploy-cloud.sh                 # Cloud deployment
├── package.json                    # Dependencies & scripts
├── .env.example                    # Environment template
└── README.md                       # This file
```

---

## 🎮 Usage

### NPM Scripts

```bash
# Start dashboard server
npm start

# Generate AI configurations
npm run generate

# Run QA validation
npm run qa

# Monitor swarm analytics
npm run monitor

# Run the swarm engine
npm run swarm

# Start dashboard only
npm run dashboard

# Deploy configs
npm run deploy

# Development mode (dashboard + monitor)
npm run dev
```

### Docker Commands

```bash
# Build images
npm run docker:build
# or
docker-compose build

# Start services
npm run docker:up
# or
docker-compose up -d

# Stop services
npm run docker:down
# or
docker-compose down

# View logs
npm run docker:logs
# or
docker-compose logs -f

# Run swarm in container
docker-compose run --rm swarm node scripts/viral-swarm-final.js
```

### Shell Scripts

```bash
# Start swarm locally
bash start-swarm.sh

# Deploy to production
bash deploy-prod.sh

# Deploy to cloud server
bash deploy-cloud.sh
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
# Required
OPENAI_API_KEY=your-openai-api-key
GH_TOKEN=your-github-token
GH_USERNAME=your-github-username

# Server
NODE_ENV=development
PORT=4000

# Database
POSTGRES_DB=swarm
POSTGRES_USER=swarm
POSTGRES_PASSWORD=swarm_password

# Cloud deployment (optional)
SERVER_HOST=your-server.com
SERVER_USER=deploy
DOMAIN=swarm.example.com
```

### Config Files

The platform uses three main configuration files:

- **`config/dev.json`** - Development environment settings
- **`config/prod.json`** - Production environment settings
- **`config/copilot.json`** - Copilot mode settings

These configs are AI-generated or can be manually edited.

### Swarm Configuration

Key settings in config files:

```json
{
  "swarm": {
    "max_agents": 3,
    "agent_types": ["code_generator", "pr_manager", "qa_validator"],
    "coordination_strategy": "distributed"
  },
  "repository": {
    "auto_create": true,
    "pr_strategy": "feature_branch",
    "branch_naming": "ai-swarm/{agent_id}/{task_id}"
  },
  "analytics": {
    "tracking_enabled": true,
    "metrics_to_collect": ["repo_created", "pr_opened", "agent_activity"]
  }
}
```

---

## 🤖 How It Works

### 1. Swarm Coordinator

The `SwarmCoordinator` class orchestrates the entire swarm:

- Loads configuration from `config/` directory
- Spawns multiple `SwarmAgent` instances
- Coordinates task distribution
- Collects and stores analytics

### 2. AI Agents

Each `SwarmAgent`:

- Has a unique ID and type (code_generator, pr_manager, etc.)
- Uses OpenAI API to generate repository ideas
- Creates GitHub repositories via Octokit
- Opens pull requests
- Tracks its own metrics

### 3. Dashboard Server

Express server with Socket.IO:

- Serves static dashboard HTML
- Provides REST API endpoints
- Broadcasts real-time updates via WebSockets
- Watches for config changes

### 4. Analytics & Monitoring

- Tracks all swarm activity
- Stores metrics in `config/analytics.json`
- Maintains repository list in `config/viral-repos.json`
- Archives configs in `config/history/`

---

## 📊 API Endpoints

The dashboard server exposes these endpoints:

```
GET  /api/health              - Health check
GET  /api/analytics           - Current swarm analytics
GET  /api/history             - Configuration history
GET  /api/viral               - Viral repository list
GET  /api/config/:env         - Get config for environment (dev/prod/copilot)
```

### Example Response

```bash
curl http://localhost:4000/api/analytics
```

```json
{
  "timestamp": "2026-03-06T12:00:00.000Z",
  "totalAgents": 3,
  "totalRepos": 5,
  "agents": [
    {
      "id": "agent-1",
      "type": "code_generator",
      "tasksCompleted": 2,
      "reposCreated": 2,
      "prsOpened": 1
    }
  ],
  "viralRepos": [...]
}
```

---

## 🐳 Docker Architecture

### Services

- **dashboard** - Web dashboard and API server (port 4000)
- **swarm** - Swarm engine (runs on-demand)
- **postgres** - PostgreSQL database (port 5432)

### Volumes

- `postgres-data` - Database persistence
- `swarm-data` - Application data
- `./config` - Config files (mounted)

### Networks

- `swarm-network` - Internal bridge network

---

## ⚡ GitHub Actions

### Workflows

1. **AI Global Swarm** (`ai-global-swarm.yml`)
   - Runs daily at 2:00 AM UTC
   - Executes the swarm engine
   - Commits updated analytics

2. **Deploy** (`deploy.yml`)
   - Triggers on push to main
   - Runs deployment scripts
   - Updates production

3. **QA Agent** (`qa-agent.yml`)
   - Validates config changes
   - Runs on config file modifications
   - Checks JSON syntax and required fields

4. **Monitor Agent** (`monitor-agent.yml`)
   - Runs every 6 hours
   - Collects metrics
   - Detects anomalies

### Required Secrets

Configure these in your GitHub repository settings:

```
OPENAI_API_KEY   - OpenAI API key
GH_TOKEN         - GitHub Personal Access Token
GH_USERNAME      - Your GitHub username
```

---

## 🔐 Security

### Best Practices

- Never commit `.env` file to version control
- Use GitHub Secrets for workflows
- Rotate API keys regularly
- Use least-privilege access tokens
- Review generated code before deployment
- Enable 2FA on GitHub account

### GitHub Token Permissions

Your `GH_TOKEN` needs these permissions:

- `repo` - Full repository access
- `workflow` - Update workflows
- `admin:org` - Create repositories (if using org)

---

## 🧪 Testing

### Local Testing

```bash
# Run QA validation
npm run qa

# Test dashboard server
npm start
# Visit http://localhost:4000

# Test swarm engine (dry run)
npm run swarm
```

### Docker Testing

```bash
# Test build
docker-compose build

# Test services
docker-compose up

# Test swarm in container
docker-compose run --rm swarm node scripts/viral-swarm-final.js
```

---

## 📈 Monitoring & Analytics

### Dashboard Metrics

- **Active Agents** - Number of running agents
- **Repositories** - Total repos created
- **Pull Requests** - Total PRs opened
- **Tasks** - Total tasks completed

### Agent Performance

Track individual agent metrics:

- Repositories created
- Pull requests opened
- Tasks completed
- Success rate

### Historical Data

All activity is stored in:

- `config/analytics.json` - Current analytics
- `config/viral-repos.json` - Repository list
- `config/history/` - Configuration snapshots

---

## 🚨 Troubleshooting

### Common Issues

**Error: OPENAI_API_KEY not set**

```bash
# Solution: Configure .env file
cp .env.example .env
# Edit .env and add your OpenAI API key
```

**Error: GH_TOKEN not set**

```bash
# Solution: Add GitHub token to .env
# Generate token at: https://github.com/settings/tokens
```

**Dashboard not loading**

```bash
# Check if server is running
curl http://localhost:4000/api/health

# Check logs
npm start
```

**Docker services not starting**

```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs

# Rebuild
docker-compose down
docker-compose up --build
```

**Swarm not creating repos**

```bash
# Verify GitHub token permissions
# Check token has 'repo' and 'workflow' scopes

# Test Octokit connection
node -e "
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GH_TOKEN });
octokit.users.getAuthenticated().then(console.log);
"
```

---

## 🛣️ Roadmap

- [ ] Multi-provider AI support (Anthropic, Cohere, Llama)
- [ ] Agent communication protocol
- [ ] Distributed consensus algorithm
- [ ] WebAssembly agents
- [ ] Browser-based agent runtime
- [ ] Mobile dashboard app
- [ ] Slack/Discord integration
- [ ] Advanced analytics dashboard
- [ ] Multi-region deployment
- [ ] Kubernetes deployment

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

Built with:

- [OpenAI](https://openai.com/) - AI capabilities
- [GitHub Octokit](https://github.com/octokit) - GitHub API
- [Express](https://expressjs.com/) - Web server
- [Socket.IO](https://socket.io/) - Real-time updates
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Docker](https://www.docker.com/) - Containerization
- [PostgreSQL](https://www.postgresql.org/) - Database

---

## 📞 Support

- 📧 Email: [support@example.com](mailto:support@example.com)
- 💬 Issues: [GitHub Issues](https://github.com/your-org/ai-swarm-platform/issues)
- 📖 Docs: [Documentation](https://docs.example.com)

---

<div align="center">

**[⬆ back to top](#-ai-swarm-platform)**

Made with ❤️ by the AI Swarm Team

</div>
