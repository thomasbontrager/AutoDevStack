# Starter Apps

Pre-configured application starters built on top of AutoDevStack templates. Each starter app is a ready-to-deploy project targeting a specific use case.

---

## Available Starters

| Starter | Template Base | Use Case |
|---------|--------------|----------|
| [`saas-dashboard/`](saas-dashboard/) | SaaS Starter | Multi-tenant SaaS with team management and billing |
| [`ai-chatbot/`](ai-chatbot/) | AI App | Customer-facing AI chatbot with conversation history |
| [`rest-api-boilerplate/`](rest-api-boilerplate/) | Node + Express | Battle-tested REST API with auth, validation, and tests |
| [`monorepo-platform/`](monorepo-platform/) | Monorepo | Full platform with frontend, API, and shared packages |

---

## What's the Difference Between `examples/` and `starter-apps/`?

- **`examples/`** — Minimal reference projects that showcase how to use a specific AutoDevStack template. Great for learning and understanding patterns.
- **`starter-apps/`** — More opinionated, feature-rich starting points for real projects. These are closer to production-ready and include additional features beyond the base template.

---

## Using a Starter App

You can copy any starter directly:

```bash
# Copy the starter into a new project directory
cp -r starter-apps/saas-dashboard my-project
cd my-project
npm install
cp .env.example .env
# Fill in .env, then:
npm run dev
```

Or scaffold the base template and customize from there:

```bash
npx autodevstack my-project --stack saas --git --docker
```

---

## Contributing a Starter App

1. Build your project on top of an AutoDevStack template
2. Generalize it so others can use it as a starting point
3. Place it in `starter-apps/<your-starter-name>/`
4. Add a `README.md` with:
   - The use case it targets
   - Which AutoDevStack template it's based on
   - Setup instructions
   - Key features and design decisions
5. Submit a PR!

**Guidelines for starter apps:**
- Keep secrets and API keys in `.env.example` — never commit real credentials
- Include a complete `README.md` with setup instructions
- Document any manual setup steps (e.g., OAuth app creation, Stripe dashboard config)
- Keep dependencies up to date
