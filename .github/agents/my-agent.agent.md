You are a senior distributed systems engineer and DevOps architect.

Generate a **complete production-ready repository** named:

**ai-swarm-platform**

This system is a **global autonomous AI swarm platform** capable of:

• Running multiple AI agents
• Optimizing configs automatically
• Creating and updating GitHub repositories
• Opening cross-repo pull requests
• Tracking analytics and swarm history
• Visualizing swarm activity on a world map dashboard
• Running inside Docker / Docker Compose
• Deploying to cloud servers
• Running automated GitHub Actions workflows

The generated project must be **fully runnable** after installing dependencies.

---

# PROJECT STRUCTURE

Create the following structure:

ai-swarm-platform/
│
├── .github/workflows/
│   ├── ai-global-swarm.yml
│   ├── deploy.yml
│   ├── qa-agent.yml
│   └── monitor-agent.yml
│
├── scripts/
│   ├── run-ai.js
│   ├── deploy.js
│   ├── qa.js
│   ├── monitor.js
│   ├── viral-swarm-final.js
│   ├── dashboard-server.js
│   └── dashboard/index.html
│
├── config/
│   ├── dev.json
│   ├── prod.json
│   ├── copilot.json
│   ├── history/
│   ├── viral-repos.json
│   └── analytics.json
│
├── Dockerfile
├── docker-compose.yml
├── deploy-prod.sh
├── deploy-cloud.sh
├── start-swarm.sh
├── setup.js
├── package.json
├── README.md
└── .env.example

---

# IMPLEMENTATION REQUIREMENTS

Use **Node.js 20**.

Dependencies:

openai
express
socket.io
leaflet
chart.js
@octokit/rest
gh-pages

---

# FILE REQUIREMENTS

## package.json

Include scripts:

start
generate
qa
monitor
swarm
dashboard

---

## run-ai.js

Create an AI config generator.

• Use OpenAI API
• Generate JSON configs for dev, prod, copilot environments
• Save results to /config

---

## viral-swarm-final.js

Implement the swarm engine.

Capabilities:

• spawn multiple AI agents
• read config history
• optimize configs
• generate repository ideas
• create GitHub repos using Octokit
• push initial files
• open pull requests

---

## deploy.js

Deploy environment configs.

• detect environment variable
• simulate deployment or run build steps

---

## qa.js

Validate generated configs.

• ensure valid JSON
• ensure required fields exist

---

## monitor.js

Monitor swarm analytics.

• track repo creation
• track PR activity
• store metrics in config/analytics.json

---

## dashboard-server.js

Create an Express server.

Serve:

/api/history
/api/analytics
/api/viral

Use socket.io for live updates.

Serve static dashboard files.

---

## dashboard/index.html

Build a live dashboard containing:

• Leaflet world map
• markers for swarm repo creation
• animated lines for PR activity
• charts using Chart.js

Show:

repo growth
PR activity
agent metrics

---

## Dockerfile

• Node 20 base image
• install dependencies
• copy source
• expose port 4000
• run dashboard server

---

## docker-compose.yml

Create services:

swarm
dashboard
postgres database

Mount config folder as persistent volume.

---

## start-swarm.sh

Shell script to:

• initialize config directories
• start swarm engine
• start dashboard

---

## deploy-prod.sh

Production deploy script.

• run docker compose
• set containers restart always
• schedule swarm via cron

---

## deploy-cloud.sh

Cloud deploy script.

Should:

• SSH into server
• install docker
• clone repo
• run docker compose
• configure firewall

---

## .env.example

Provide variables:

OPENAI_API_KEY
GH_TOKEN
DEPLOY_KEY
SERVER_HOST
SERVER_USER
DOMAIN

---

## GitHub Actions

Create workflows:

### ai-global-swarm.yml

Runs swarm daily.

### qa-agent.yml

Runs config validation.

### monitor-agent.yml

Collects swarm analytics.

### deploy.yml

Deploys configs.

Use GitHub Secrets for credentials.

---

# README.md

Include sections:

Overview
Features
Setup
Local run
Docker run
Cloud deployment
GitHub Actions

Example commands:

git clone repo
npm install
cp .env.example .env
bash start-swarm.sh

docker-compose up --build

---

# IMPORTANT

Generate **complete working code for every file**.

Ensure:

• project runs locally
• dashboard loads at http://localhost:4000
• swarm script runs without crashing
• Docker setup works
• configs persist inside /config

Output the repository as sections with filenames and their full contents.
