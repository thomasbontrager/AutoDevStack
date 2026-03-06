import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { priceId } = req.body as { priceId: string };
  if (!priceId) {
    return res.status(400).json({ error: 'priceId is required' });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=cancelled`,
    metadata: { userId: user.id },
  });

  return res.status(200).json({ url: checkoutSession.url });
}
