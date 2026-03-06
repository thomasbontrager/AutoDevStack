# 🌐 AI Swarm Platform

> **Global autonomous AI swarm platform** — multi-agent orchestration, GitHub automation, live world-map analytics dashboard, Docker & cloud deployment.

---

## Overview

AI Swarm Platform spawns multiple AI agents that autonomously:

- Generate and optimise environment configs using OpenAI
- Create GitHub repositories with scaffolded content
- Open pull requests across repos
- Track swarm history and analytics
- Visualise activity on a real-time world-map dashboard

---

## Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-agent swarm** | Concurrent AI agents powered by `gpt-4o-mini` |
| ⚙️ **Config optimisation** | Auto-generates `dev`, `prod`, `copilot` JSON configs |
| 🐙 **GitHub automation** | Creates repos, pushes files, opens PRs via Octokit |
| 📊 **Analytics** | Persistent metrics in `config/analytics.json` |
| 🗺️ **World-map dashboard** | Leaflet map + Chart.js charts at `localhost:4000` |
| 🐳 **Docker support** | Full Docker Compose setup (swarm + dashboard + postgres) |
| ☁️ **Cloud deploy** | SSH-based cloud deployment script |
| ⚡ **GitHub Actions** | Daily swarm, QA, monitoring, and deploy workflows |

---

## Project Structure

```
ai-swarm-platform/
├── .github/workflows/
│   ├── ai-global-swarm.yml   # Daily swarm run
│   ├── deploy.yml            # Config deployment
│   ├── qa-agent.yml          # Config validation
│   └── monitor-agent.yml     # Analytics collection
├── scripts/
│   ├── run-ai.js             # OpenAI config generator
│   ├── viral-swarm-final.js  # Swarm engine
│   ├── deploy.js             # Deployment script
│   ├── qa.js                 # Config validator
│   ├── monitor.js            # Analytics monitor
│   ├── dashboard-server.js   # Express + Socket.IO server
│   └── dashboard/index.html  # Live dashboard UI
├── config/
│   ├── dev.json              # Dev environment config
│   ├── prod.json             # Prod environment config
│   ├── copilot.json          # GitHub Copilot / CI config
│   ├── viral-repos.json      # Created repos list
│   ├── analytics.json        # Swarm analytics
│   └── history/              # Per-run agent logs
├── Dockerfile
├── docker-compose.yml
├── start-swarm.sh
├── deploy-prod.sh
├── deploy-cloud.sh
├── setup.js
├── package.json
└── .env.example
```

---

## Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)
- OpenAI API key
- GitHub Personal Access Token (`repo` + `workflow` scopes)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ai-swarm-platform.git
cd ai-swarm-platform

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and GH_TOKEN

# Run one-time setup
node setup.js
```

---

## Local Run

```bash
# Generate AI-optimised configs
npm run generate

# Validate configs
npm run qa

# Run the swarm engine
npm run swarm

# Start the live dashboard
npm run dashboard
# → Open http://localhost:4000

# Or start everything at once
bash start-swarm.sh
```

---

## Docker Run

```bash
# Build and start all services
docker-compose up --build

# Dashboard: http://localhost:4000
# Swarm engine + dashboard + PostgreSQL all start automatically

# Stop services
docker-compose down

# View logs
docker-compose logs -f dashboard
docker-compose logs -f swarm
```

---

## Cloud Deployment

Set your server details in `.env`:

```env
SERVER_HOST=your.server.ip
SERVER_USER=ubuntu
DEPLOY_KEY=~/.ssh/id_rsa
DOMAIN=swarm.example.com
```

Then run:

```bash
bash deploy-cloud.sh
```

This will:
1. SSH into your server
2. Install Docker if not present
3. Clone / update the repository
4. Copy your `.env` file
5. Start Docker Compose
6. Configure the firewall

---

## Production Deployment

```bash
# Deploy with Docker Compose + cron schedule
bash deploy-prod.sh
```

Sets containers to `restart=always` and adds an hourly cron job.

---

## GitHub Actions

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ai-global-swarm.yml` | Daily 06:00 UTC | Runs full swarm engine |
| `deploy.yml` | Push to `main` (config changes) | Deploys configs |
| `qa-agent.yml` | Every push / PR | Validates JSON configs |
| `monitor-agent.yml` | Every 6 hours | Collects analytics & commits snapshot |

### Required Secrets

Add these to **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `GH_TOKEN` | GitHub token with `repo` + `workflow` scopes |

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Start dashboard server |
| `generate` | `npm run generate` | Generate AI configs |
| `qa` | `npm run qa` | Validate configs |
| `monitor` | `npm run monitor` | Collect analytics |
| `swarm` | `npm run swarm` | Run swarm engine |
| `dashboard` | `npm run dashboard` | Start dashboard (alias for start) |
| `deploy` | `npm run deploy` | Deploy configs |
| `setup` | `npm run setup` | One-time setup |

---

## Environment Variables

See [.env.example](.env.example) for all variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Recommended | OpenAI API key |
| `GH_TOKEN` | Recommended | GitHub Personal Access Token |
| `DEPLOY_KEY` | Cloud deploy | Path to SSH private key |
| `SERVER_HOST` | Cloud deploy | Remote server hostname/IP |
| `SERVER_USER` | Cloud deploy | SSH username (default: `ubuntu`) |
| `DOMAIN` | Optional | Custom domain |
| `POSTGRES_PASSWORD` | Docker | PostgreSQL password |
| `AGENT_COUNT` | Optional | Concurrent agents (default: `3`) |
| `PORT` | Optional | Dashboard port (default: `4000`) |

---

## License

MIT
