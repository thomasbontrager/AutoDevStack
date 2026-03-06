# Examples

This directory contains reference projects scaffolded with AutoDevStack, demonstrating real-world usage patterns for each major template.

## Available Examples

| Example | Stack | Description |
|---------|-------|-------------|
| [`saas/`](saas/) | SaaS Starter | Production SaaS with auth, Stripe billing, and PostgreSQL |
| [`ai-app/`](ai-app/) | AI App | Full-stack AI app with LangChain, OpenAI/Anthropic, and streaming |
| [`api/`](api/) | Node + Express | REST API with JWT auth, Zod validation, and Prisma ORM |
| [`weather-dashboard/`](weather-dashboard/) | Vanilla JS | Responsive weather dashboard — geolocation, 5-day forecast, unit toggle, search history |

## Contributing an Example

1. Scaffold a project using the CLI:
   ```bash
   node cli/index.js my-example --stack <stack> --git
   ```
2. Build something interesting with it
3. Add it under `examples/<your-example-name>/`
4. Include a `README.md` explaining:
   - What the example demonstrates
   - How to run it
   - Any notable patterns used
5. Submit a PR!
