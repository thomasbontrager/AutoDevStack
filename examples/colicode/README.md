# ColiCode

> An AI coding assistant CLI that analyzes GitHub pull requests, delivers code-review insights, and generates improvement suggestions — with your API keys safely stored server-side.

---

## What ColiCode Demonstrates

- ✅ GitHub API integration — PR metadata, unified diffs, CI check statuses, review decisions
- ✅ OpenAI API integration — structured code review, improvement suggestions, PR insights
- ✅ Private API key handling — keys live only in the API server's `.env`; the CLI never touches them
- ✅ Express backend with shared-secret authentication
- ✅ Node.js 18+ native `fetch` — zero HTTP-client dependencies
- ✅ Interactive CLI with spinners and colour output (chalk + ora)

---

## Project Structure

```
colicode/
├── cli/
│   ├── index.js          # CLI entry point
│   └── package.json
├── api/
│   ├── server.js         # Express server
│   ├── routes/
│   │   ├── pr.js         # PR fetch + AI insights endpoints
│   │   └── ai.js         # Code review + suggestion endpoints
│   ├── lib/
│   │   ├── github.js     # GitHub API helpers (native fetch)
│   │   └── openai.js     # OpenAI Chat Completions helpers
│   ├── middleware/
│   │   └── auth.js       # X-API-Secret shared-secret guard
│   └── package.json
└── .env.example          # Environment variable template
```

---

## Prerequisites

- **Node.js 18+** (uses native `fetch` and ES modules)
- A **GitHub personal access token** with `repo` read access → [create one](https://github.com/settings/tokens)
- An **OpenAI API key** → [create one](https://platform.openai.com/api-keys)

---

## Quick Start

### 1. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
GITHUB_TOKEN=ghp_yourTokenHere
OPENAI_API_KEY=sk-yourKeyHere
OPENAI_MODEL=gpt-4o          # optional, default: gpt-4o
API_SECRET=change_me          # shared secret between CLI and server
PORT=3100                     # API server port
```

### 2. Start the API server

```bash
cd api
npm install
npm start
# ColiCode API listening on http://localhost:3100
```

### 3. Install CLI dependencies

```bash
cd cli
npm install
```

### 4. Run commands

```bash
# Analyse a pull request
node cli/index.js pr facebook/react#12345

# PR with AI-generated insights
node cli/index.js pr facebook/react#12345 --ai

# Code review of a local file
node cli/index.js review src/utils/auth.js

# AI improvement suggestion
node cli/index.js suggest src/utils/auth.js "add JSDoc comments and input validation"
```

> **Tip:** Add `colicode` to your `PATH` (`npm link` inside `cli/`) to run it globally.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `colicode pr <owner/repo#number>` | Fetch PR metadata, CI checks, and reviewer decisions |
| `colicode pr <owner/repo#number> --ai` | Same as above, plus an AI-generated analysis of the diff |
| `colicode review <file>` | Send a local file to the AI for a structured code review |
| `colicode suggest <file> "<instruction>"` | Get an AI-rewritten version of the file following your instruction |
| `colicode --help` | Show usage information |
| `colicode --version` | Print version number |

---

## API Endpoints

The API server runs on `http://localhost:3100` by default.

All `/api/*` endpoints require the `X-API-Secret` header to match the `API_SECRET` env var (if set).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check — no auth required |
| `GET` | `/api/pr/:owner/:repo/:number` | PR metadata + diff + checks + reviews |
| `GET` | `/api/pr/:owner/:repo/:number/insights` | Above + AI-generated analysis |
| `POST` | `/api/review` | AI code review of a snippet (`{ code, filename?, language? }`) |
| `POST` | `/api/suggest` | AI improvement suggestion (`{ code, instruction, filename? }`) |

---

## Architecture — Private API Key Handling

```
Developer machine                    ColiCode API server
──────────────────                   ───────────────────
colicode CLI                         Express server
  │                                    │
  │  X-API-Secret header               │  GITHUB_TOKEN  ──▶ GitHub API
  │─────────────────────────────────▶  │
  │                                    │  OPENAI_API_KEY ──▶ OpenAI API
  │◀─────────────────────────────────  │
  │  Formatted results                 │
```

The CLI sends only a shared secret (`API_SECRET`) — your `GITHUB_TOKEN` and `OPENAI_API_KEY` never leave the server. This pattern makes ColiCode safe to use in team environments where a single API server serves multiple developers.

---

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | **Yes** (server) | — | GitHub PAT with `repo` read access |
| `OPENAI_API_KEY` | **Yes** (server) | — | OpenAI API key |
| `OPENAI_MODEL` | No (server) | `gpt-4o` | Chat model to use |
| `API_SECRET` | Recommended | *(none — auth skipped)* | Shared secret between CLI and server |
| `PORT` | No (server) | `3100` | API server listen port |
| `COLICODE_API_URL` | No (CLI) | `http://localhost:3100` | API server base URL |

---

## Sample Output

```
────────────────────────────────────────────────────────────────────────────────
PR #12345 — Fix memory leak in event listener cleanup
────────────────────────────────────────────────────────────────────────────────
  author           gaearon
  state            OPEN
  draft            no
  branch           main ← fix/memory-leak
  labels           #bug  #performance
  changes          +47  -23  across 3 file(s)
  created          3/5/2026, 9:12:00 AM
  updated          3/6/2026, 2:30:00 PM
  url              https://github.com/facebook/react/pull/12345

  CI Checks:
  ✓ build (ubuntu-latest)  completed → success
  ✓ test (ubuntu-latest)   completed → success

  Reviews:
  ✓ APPROVED  sebmarkbage  3/6/2026

────────────────────────────────────────────────────────────────────────────────
AI Insights
────────────────────────────────────────────────────────────────────────────────
## Summary
This PR resolves a memory leak caused by event listeners added in a `useEffect`
hook that were not cleaned up on component unmount ...

## Key changes
- Added cleanup return function to `useEffect` in `EventEmitter.js`
- Removed stale `componentWillUnmount` logic from class component
- Added regression test in `EventEmitter.test.js`

## Potential concerns
- The new cleanup assumes the listener reference is stable; if the parent
  re-renders and passes a new function reference, the cleanup will target the
  wrong listener.

## Suggestions
1. Wrap the callback in `useCallback` to stabilise the reference.
2. Add a test that verifies cleanup occurs on unmount.
3. Consider extracting the listener logic into a custom hook for reuse.
```

---

## Extending ColiCode

- **Add a `lint` command** — send a diff to the AI with a linting ruleset prompt
- **Slack / Discord notifications** — post AI insights to a webhook after each review
- **GitHub Actions integration** — run `colicode pr` as a workflow step and post comments
- **Support Anthropic** — swap `openai.js` helpers for Anthropic's Messages API

---

## Learn More

- [GitHub REST API — Pull Requests](https://docs.github.com/en/rest/pulls)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [AutoDevStack AI template](../../templates/ai/)
