# REST API Example

> A production-ready REST API scaffolded with AutoDevStack's **Node + Express + TypeScript** template.

This example demonstrates how to build a robust, maintainable REST API with Express and TypeScript, including authentication, validation, error handling, and database integration.

---

## What This Example Demonstrates

- ✅ Express + TypeScript with a clean project structure
- ✅ JWT-based authentication middleware
- ✅ Request validation with Zod schemas
- ✅ Centralized error handling
- ✅ PostgreSQL database via Prisma ORM
- ✅ Docker Compose for local development
- ✅ Environment-based configuration
- ✅ Structured logging with Morgan

---

## How It Was Scaffolded

```bash
npx autodevstack my-api --stack node --git --docker
```

Or interactively:

```bash
npx autodevstack
# Project name: my-api
# Stack: Node + Express + TypeScript
```

---

## Project Structure

```
my-api/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── routes/
│   │   ├── auth.ts           # POST /auth/login, POST /auth/register
│   │   ├── users.ts          # CRUD /users
│   │   └── health.ts         # GET /health
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── validate.ts       # Zod request validation
│   │   └── errorHandler.ts   # Global error handler
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── userController.ts
│   ├── services/
│   │   ├── authService.ts
│   │   └── userService.ts
│   ├── lib/
│   │   └── db.ts             # Prisma client singleton
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── prisma/
│   └── schema.prisma         # Database schema
├── tests/
│   └── api.test.ts           # Integration tests
├── docker-compose.yml        # postgres service
├── .env.example
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for local PostgreSQL)

### 1. Copy environment variables

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapi"
JWT_SECRET="your-strong-secret-here"
PORT=4000
NODE_ENV=development
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Install and run

```bash
npm install
npx prisma migrate dev
npm run dev
```

The API is now running at [http://localhost:4000](http://localhost:4000).

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Health check |
| `POST` | `/auth/register` | — | Register a new user |
| `POST` | `/auth/login` | — | Login and receive a JWT |
| `GET` | `/users` | ✅ JWT | List all users |
| `GET` | `/users/:id` | ✅ JWT | Get user by ID |
| `PUT` | `/users/:id` | ✅ JWT | Update user |
| `DELETE` | `/users/:id` | ✅ JWT | Delete user |

### Example: Register

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

### Example: Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
# Returns: { "token": "eyJ..." }
```

### Example: Authenticated request

```bash
curl http://localhost:4000/users \
  -H "Authorization: Bearer eyJ..."
```

---

## Key Patterns Used

### Validation

All request bodies are validated with [Zod](https://zod.dev) schemas in a reusable `validate` middleware. Validation errors return a structured `400` response listing each field error.

### Error Handling

A single `errorHandler` middleware is registered last in the Express chain. All route handlers call `next(err)` on errors — they never send error responses directly. This keeps error formatting consistent.

### Authentication

The `auth` middleware extracts the Bearer token from the `Authorization` header, verifies it against `JWT_SECRET`, and attaches the decoded payload to `req.user`. Protected routes apply this middleware individually, not globally.

### Database

Prisma is initialized as a singleton in `lib/db.ts` to reuse the connection pool across requests. In tests, the `DATABASE_URL` is overridden via environment variable to point at a test database.

---

## Running Tests

```bash
npm test
```

Integration tests use Node's built-in test runner and start a real Express server against a test database. The test database is isolated by setting the `DATABASE_URL` environment variable to a separate test database (or using `DB_PATH_OVERRIDE` for SQLite-based setups).

---

## Deploying

### Docker

```bash
docker build -t my-api .
docker run -p 4000:4000 --env-file .env my-api
```

### Railway / Render / Fly.io

Point the service at your git repository and set the environment variables in the platform dashboard. The `npm start` script (`node dist/index.js`) is the production entry point.

---

## Learn More

- [AutoDevStack Node template](../../templates/node/)
- [Express docs](https://expressjs.com)
- [Prisma docs](https://www.prisma.io/docs)
- [Zod docs](https://zod.dev)
