# Monorepo Template

A monorepo structure powered by Turborepo for building scalable applications.

## Structure

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js web application (port 3000)
│   └── admin/        # Next.js admin dashboard (port 3002)
├── services/
│   ├── api/          # REST API service (port 3001)
│   └── auth/         # Authentication service (port 3003)
├── packages/
│   ├── ui/           # Shared UI components
│   └── database/     # Prisma client & shared DB utilities
└── infrastructure/
    ├── docker/       # Docker Compose + per-service Dockerfiles
    └── deploy/       # Deployment scripts
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy the environment template and configure your variables:
```bash
cp .env.example .env
```

3. Run all apps in development:
```bash
npm run dev
```

4. Build all apps:
```bash
npm run build
```

## Docker

Start all services with Docker Compose:
```bash
cd infrastructure/docker
docker-compose up
```

## Features

- **Turborepo**: Fast builds with intelligent caching
- **Workspaces**: npm workspaces for package management
- **Shared Packages**: Reusable code across apps
- **Type Safety**: TypeScript throughout
- **Microservices**: Independent services for scalability
- **Authentication**: JWT-based auth service with bcrypt
- **Database**: Prisma ORM with PostgreSQL

## Adding New Apps

1. Create a new directory in `apps/`, `services/`, or `packages/`
2. Add a `package.json` with appropriate scripts
3. Reference it from other packages using workspace protocol (`workspace:*`)

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Prisma Documentation](https://www.prisma.io/docs)

