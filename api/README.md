# AutoDevStack Platform API

A simple REST API backend for the AutoDevStack platform that handles user authentication, project management, and deployment triggers.

## Quick Start

```bash
cd api
npm install
npm start
```

The server starts on **http://localhost:4000** by default.

**Default credentials:** `admin` / `admin123`

## Endpoints

### Authentication

#### `POST /api/auth/login`
Authenticate and receive a JWT token.

**Request:**
```json
{ "username": "admin", "password": "admin123" }
```
**Response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "1", "username": "admin", "role": "admin" }
}
```

---

### Projects

All project endpoints require a `Authorization: Bearer <token>` header.

#### `POST /api/projects/create`
Create a new project and register it with the platform.

**Request:**
```json
{ "name": "my-app", "stack": "next", "description": "Optional description" }
```
**Valid stacks:** `default`, `node`, `next`, `t3`, `saas`, `monorepo`

**Response (201):**
```json
{
  "message": "Project created successfully",
  "project": {
    "id": "proj_1234567890",
    "name": "my-app",
    "stack": "next",
    "owner": "admin",
    "status": "created",
    "createdAt": "..."
  }
}
```

#### `GET /api/projects`
List all projects owned by the authenticated user.

#### `GET /api/projects/:id`
Get details for a specific project.

---

### Deployments

#### `POST /api/deploy`
Trigger a deployment for a project.

**Request:**
```json
{ "projectId": "proj_1234567890", "environment": "staging" }
```
**Valid environments:** `development`, `staging`, `production`

**Response (201):**
```json
{
  "message": "Deployment triggered for project \"my-app\" in staging",
  "deployment": {
    "id": "deploy_1234567890",
    "projectId": "proj_1234567890",
    "environment": "staging",
    "status": "queued",
    "createdAt": "..."
  }
}
```

#### `GET /api/deploy`
List all deployments for the authenticated user's projects.

---

### Health Check

#### `GET /api/health`
```json
{ "status": "ok", "version": "1.0.0" }
```

## Configuration

| Environment Variable | Default                    | Description              |
|----------------------|----------------------------|--------------------------|
| `PORT`               | `4000`                     | Server port              |
| `JWT_SECRET`         | `autodevstack-secret-key`  | JWT signing secret       |

> **Production tip:** Set a strong `JWT_SECRET` via environment variable.

## Data Persistence

Data is stored in `api/data/db.json` (in-memory reads, synced to file on write). The default admin user is pre-seeded. To add users, edit `db.json` directly — password hashes can be generated with:

```bash
node -e "const b=require('bcryptjs'); b.hash('mypassword',10).then(console.log)"
```

## CLI Integration

Use `--register` when scaffolding a project to register it with the platform:

```bash
autodevstack my-app --stack next --register
# Optionally point at a remote API:
autodevstack my-app --stack next --register --api-url https://api.example.com
```

## Running Tests

```bash
cd api
npm test
```

## Development

```bash
npm run dev   # auto-restarts on file changes (requires Node 18+)
```
