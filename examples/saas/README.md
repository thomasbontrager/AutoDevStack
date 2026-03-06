# SaaS Starter Example

> A production-ready SaaS application scaffolded with AutoDevStack's **SaaS Starter** template.

This example demonstrates how to quickly launch a SaaS product with authentication, subscription billing, and a PostgreSQL database — all wired up and ready to go.

---

## What This Example Demonstrates

- ✅ Next.js Pages Router with TypeScript
- ✅ Prisma ORM connected to PostgreSQL
- ✅ Stripe subscription billing (checkout + webhooks)
- ✅ NextAuth.js authentication (email + OAuth providers)
- ✅ TailwindCSS UI components
- ✅ Docker Compose for local development
- ✅ Environment variable configuration

---

## How It Was Scaffolded

```bash
npx autodevstack my-saas --stack saas --git --docker
```

Or interactively:

```bash
npx autodevstack
# Project name: my-saas
# Stack: SaaS Starter (Next.js + Prisma + Stripe + Tailwind)
```

---

## Project Structure

```
my-saas/
├── pages/
│   ├── index.tsx          # Landing page
│   ├── dashboard.tsx      # User dashboard
│   ├── api/
│   │   ├── auth/          # NextAuth.js handlers
│   │   └── webhooks/
│   │       └── stripe.ts  # Stripe webhook handler
├── prisma/
│   └── schema.prisma      # Database schema (User, Subscription)
├── components/
│   ├── Navbar.tsx
│   ├── PricingTable.tsx
│   └── SubscriptionBadge.tsx
├── lib/
│   ├── db.ts              # Prisma client singleton
│   └── stripe.ts          # Stripe client
├── styles/
│   └── globals.css
├── docker-compose.yml     # postgres + redis
├── .env.example
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for local PostgreSQL + Redis)
- A [Stripe](https://stripe.com) account (test keys)
- A GitHub OAuth app (optional, for social login)

### 1. Copy environment variables

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## Key Patterns Used

### Authentication

NextAuth.js is configured in `pages/api/auth/[...nextauth].ts`. Supported providers are set via environment variables — no code changes needed to swap providers.

### Billing

Stripe Checkout sessions are created in an API route. The Stripe webhook handler at `pages/api/webhooks/stripe.ts` listens for `checkout.session.completed` and `customer.subscription.*` events to keep the database in sync.

### Database

Prisma is used as the ORM with a `User` model and a `Subscription` model. The database client is a singleton in `lib/db.ts` to prevent connection pool exhaustion in Next.js dev mode.

---

## Deploying

### Vercel (recommended for Next.js)

```bash
npx vercel --prod
```

Set the environment variables in the Vercel dashboard, and point `DATABASE_URL` at a managed PostgreSQL provider (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)).

### Docker

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Learn More

- [AutoDevStack SaaS template](../../templates/saas/)
- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [Stripe docs](https://stripe.com/docs)
- [NextAuth.js docs](https://next-auth.js.org)
