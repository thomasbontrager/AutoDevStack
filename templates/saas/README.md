# SaaS Starter Template

A production-ready SaaS starter built with Next.js, Prisma, Stripe, and Tailwind CSS.

## Features

- **Authentication**: NextAuth.js with multiple provider support
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe integration for subscriptions
- **Styling**: Tailwind CSS for modern UI
- **TypeScript**: Full type safety
- **Dashboard**: Pre-built admin dashboard

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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
