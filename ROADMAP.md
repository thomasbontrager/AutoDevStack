# AutoDevStack Roadmap

This document outlines the planned versions and features for AutoDevStack. Community feedback is welcome — open an issue or upvote existing ones to help prioritize!

---

## v1.0.0 — Current Release ✅

- [x] Interactive CLI with `inquirer`
- [x] React + TypeScript + Vite template (`default`)
- [x] Node + Express + TypeScript template (`node`)
- [x] Next.js template (`next`)
- [x] T3 Stack template (`t3`) — Next.js + Tailwind CSS + tRPC + Prisma
- [x] Auto project-name injection into `package.json`
- [x] `_gitignore` → `.gitignore` rename on scaffold
- [x] Professional open-source repository layout (`cli/`, `templates/`, `examples/`, `docs/`, `plugins/`, `scripts/`, `tests/`)
- [x] `CODE_OF_CONDUCT.md` and `SECURITY.md`

---

## v1.1.0 — More Templates 🛠️

- [ ] SvelteKit template
- [ ] Remix template
- [ ] NestJS template
- [ ] Astro template

---

## v1.2.0 — Developer Experience 🧑‍💻

- [ ] `npm init autodevstack` support
- [ ] Published to npm registry (`npx autodevstack`)
- [ ] `--template <name>` flag for non-interactive use
- [ ] `--yes` / `-y` flag to skip prompts and use defaults

---

## v1.3.0 — Docker & DevOps 🐳

- [ ] Docker support for all stacks (generated `Dockerfile` + `docker-compose.yml`)
- [ ] GitHub Actions CI workflow in generated projects
- [ ] `.env.example` generation for all templates

---

## v2.0.0 — Interactive Configuration ⚙️

- [ ] Interactive database selection (PostgreSQL, MySQL, SQLite, MongoDB)
- [ ] Interactive auth selection (NextAuth, Clerk, Auth0, custom JWT)
- [ ] Interactive ORM selection (Prisma, Drizzle, TypeORM)
- [ ] Plugin system — community and custom plugins via `plugins/`
- [ ] Template registry — discover and install community templates

---

## Future Ideas 💡

- Web UI / dashboard for template management
- VS Code extension
- GitHub Codespaces support
- Monorepo scaffolding (Turborepo, Nx)

---

Have an idea? [Open an issue](https://github.com/thomasbontrager/AutoDevStack/issues) or submit a PR!
