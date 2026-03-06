# Monorepo Template

A monorepo structure powered by Turborepo for building scalable applications.

## Structure

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js web application
│   └── admin/        # Admin dashboard
├── services/
│   ├── api/          # REST API service
│   └── auth/         # Authentication service
├── packages/
│   ├── ui/           # Shared UI components
│   └── database/     # Database utilities & Prisma
└── infrastructure/
    └── docker/       # Docker configurations
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run all apps in development:
```bash
npm run dev
```

3. Build all apps:
```bash
npm run build
```

## Features

- **Turborepo**: Fast builds with intelligent caching
- **Workspaces**: npm workspaces for package management
- **Shared Packages**: Reusable code across apps
- **Type Safety**: TypeScript throughout
- **Microservices**: Independent services for scalability

## Adding New Apps

1. Create a new directory in `apps/`, `services/`, or `packages/`
2. Add a `package.json` with appropriate scripts
3. Reference it from other packages using workspace protocol

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
