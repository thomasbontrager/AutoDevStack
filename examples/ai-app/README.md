# AI App Example

> An AI-powered full-stack application scaffolded with AutoDevStack's **AI App** template.

This example showcases a production-grade AI application that integrates OpenAI (or Anthropic) through LangChain, with a Next.js frontend, an Express + Prisma backend, and a dedicated AI microservice.

---

## What This Example Demonstrates

- ✅ Next.js frontend with streaming AI responses
- ✅ Express + TypeScript API with authentication
- ✅ LangChain AI service (supports OpenAI and Anthropic)
- ✅ Prisma ORM with PostgreSQL for conversation history
- ✅ Monorepo structure (frontend / backend / ai-service)
- ✅ Docker Compose for the full stack
- ✅ Streaming Server-Sent Events (SSE) for real-time output

---

## How It Was Scaffolded

```bash
npx autodevstack my-ai-app --stack ai --git --docker
```

Or interactively:

```bash
npx autodevstack
# Project name: my-ai-app
# Stack: AI App (Next.js + Express + LangChain + Prisma + OpenAI/Anthropic)
```

---

## Project Structure

```
my-ai-app/
├── frontend/               # Next.js chat UI (port 3000)
│   ├── pages/
│   │   ├── index.tsx       # Chat interface
│   │   └── api/
│   │       └── chat.ts     # Proxies to AI service
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   └── MessageBubble.tsx
│   └── package.json
├── backend/                # Express API (port 4000)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── conversations.ts
│   │   └── middleware/
│   │       └── auth.ts
│   ├── prisma/
│   │   └── schema.prisma   # User, Conversation, Message
│   └── package.json
├── ai/                     # LangChain AI service (port 5000)
│   ├── src/
│   │   ├── index.ts
│   │   ├── chains/
│   │   │   └── chat.ts     # LangChain conversation chain
│   │   └── providers/
│   │       ├── openai.ts
│   │       └── anthropic.ts
│   └── package.json
├── docker-compose.yml      # postgres + all three services
├── .env.example
└── package.json            # Root workspace scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop
- An [OpenAI](https://platform.openai.com) or [Anthropic](https://www.anthropic.com) API key

### 1. Copy environment variables

```bash
cp .env.example .env
```

Fill in your API key:

```env
# Choose your AI provider
OPENAI_API_KEY="sk-..."
# or
ANTHROPIC_API_KEY="sk-ant-..."

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aiapp"
JWT_SECRET="your-jwt-secret"
AI_PROVIDER="openai"   # or "anthropic"
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts PostgreSQL, the Express backend, the AI service, and the Next.js frontend.

### 3. Run without Docker

```bash
# Install all workspace dependencies
npm install

# Run migrations
cd backend && npx prisma migrate dev && cd ..

# Start all services concurrently
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## Key Patterns Used

### Streaming Responses

The AI service uses Server-Sent Events (SSE) to stream token-by-token responses from the language model. The frontend consumes the stream with the `EventSource` API and appends tokens to the chat UI in real-time.

### Provider Abstraction

The AI service abstracts over OpenAI and Anthropic via LangChain's unified `ChatOpenAI` / `ChatAnthropic` interface. Switching providers is a single environment variable change.

### Conversation History

Conversations and messages are persisted in PostgreSQL via Prisma. LangChain's `BufferMemory` is seeded from the database on each request to maintain context across sessions.

### Authentication

JWT-based authentication is implemented in the Express backend. Tokens are stored in HTTP-only cookies and validated by a middleware applied to all protected routes.

---

## Deploying

### Cloud Run / Railway / Fly.io

Each service is independently deployable as a Docker container. Use the provided `Dockerfile` in each service directory.

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=<managed postgres url>
OPENAI_API_KEY=<production key>
JWT_SECRET=<strong random secret>
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_AI_URL=https://ai.yourdomain.com
```

---

## Learn More

- [AutoDevStack AI template](../../templates/ai/)
- [LangChain.js docs](https://js.langchain.com)
- [OpenAI API docs](https://platform.openai.com/docs)
- [Anthropic API docs](https://docs.anthropic.com)
- [Next.js docs](https://nextjs.org/docs)
