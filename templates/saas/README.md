# SaaS Starter Template

A production-ready SaaS starter built with Next.js, Prisma, Stripe, Tailwind CSS, tRPC, and NextAuth.js.

## Features

- **Authentication**: NextAuth.js with GitHub, Google, and Email providers
- **API Layer**: tRPC for end-to-end type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe integration for subscriptions and webhooks
- **Styling**: Tailwind CSS for modern UI
- **TypeScript**: Full type safety across the stack
- **Dashboard**: Pre-built user dashboard with session and subscription info
- **Admin Panel**: Built-in admin panel at `/admin`

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── lib/
│   ├── db.ts              # Prisma client singleton
│   └── stripe.ts          # Stripe client
├── server/
│   ├── trpc.ts            # tRPC initialization (public + protected procedures)
│   ├── context.ts         # tRPC request context (session + db)
│   └── routers/
│       ├── index.ts       # App router
│       ├── user.ts        # User procedures
│       └── subscription.ts # Subscription procedures
├── utils/
│   └── trpc.ts            # tRPC client-side helper
├── pages/
│   ├── api/
│   │   ├── auth/[...nextauth].ts  # NextAuth.js handler
│   │   ├── trpc/[trpc].ts         # tRPC API handler
│   │   ├── billing/
│   │   │   └── create-checkout-session.ts
│   │   └── stripe/
│   │       └── webhook.ts
│   ├── auth/signin.tsx    # Custom sign-in page
│   ├── dashboard/index.tsx
│   ├── admin/index.tsx
│   └── index.tsx
└── prisma/
    └── schema.prisma
```

## Database Setup

This template uses PostgreSQL. You can:

1. Use a local PostgreSQL instance
2. Use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`
3. Use a cloud service like Supabase, Railway, or Neon

Update your `DATABASE_URL` in `.env` accordingly.

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Add them to your `.env` file
4. For webhooks, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## OAuth Setup

Configure the providers you need in `pages/api/auth/[...nextauth].ts` and add the appropriate environment variables.

- **GitHub**: Create an OAuth app at https://github.com/settings/developers
- **Google**: Create credentials at https://console.cloud.google.com

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
