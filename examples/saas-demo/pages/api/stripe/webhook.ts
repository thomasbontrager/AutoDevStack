import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

// Disable body parsing so we can verify the raw signature
export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing stripe signature or webhook secret' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.CheckoutSession;
      const userId = checkoutSession.metadata?.userId;
      const customerId = checkoutSession.customer as string;
      const subscriptionId = checkoutSession.subscription as string;

      if (userId && customerId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await db.subscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0]?.price.id,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0]?.price.id,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await db.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return res.status(200).json({ received: true });
}
