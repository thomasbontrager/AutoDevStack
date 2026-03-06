# Infrastructure — Deploy

This directory contains deployment scripts and configuration for the monorepo.

## Scripts

### `deploy.sh`

Runs a full deployment:
1. Builds all apps via Turborepo
2. Runs Prisma database migrations
3. Rebuilds and restarts Docker Compose services

```bash
chmod +x infrastructure/deploy/deploy.sh
./infrastructure/deploy/deploy.sh
```

## CI/CD

Add your CI/CD pipeline configuration here (GitHub Actions, GitLab CI, etc.).

### Example GitHub Actions workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: ./infrastructure/deploy/deploy.sh
```
