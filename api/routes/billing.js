const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const {
  getBilling,
  updateBilling,
  getInvoices,
  addInvoice,
} = require('../data/store');

const router = express.Router();

const billingLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: null,
    stripePriceId: null,
    features: {
      deployments: 3,
      projects: 3,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      customDomains: false,
      support: 'community',
    },
    description: 'Perfect for side projects and experimentation.',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
    features: {
      deployments: 20,
      projects: 10,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      customDomains: true,
      support: 'email',
    },
    description: 'For freelancers and solo developers.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    features: {
      deployments: 100,
      projects: 50,
      privateProjects: true,
      teamMembers: 1,
      analytics: true,
      customDomains: true,
      support: 'priority',
    },
    description: 'Full power for professional developers.',
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 7900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_TEAM || null,
    features: {
      deployments: -1,
      projects: -1,
      privateProjects: true,
      teamMembers: 10,
      analytics: true,
      customDomains: true,
      support: 'priority',
    },
    description: 'Collaborate without limits.',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    currency: 'usd',
    interval: null,
    stripePriceId: null,
    features: {
      deployments: -1,
      projects: -1,
      privateProjects: true,
      teamMembers: -1,
      analytics: true,
      customDomains: true,
      support: 'dedicated',
    },
    description: 'Custom pricing and SLAs for large teams.',
  },
};

// ---------------------------------------------------------------------------
// Stripe (optional — falls back to mock when key is not configured)
// ---------------------------------------------------------------------------
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Lazy-require so tests that don't set the env var still pass.
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

// ---------------------------------------------------------------------------
// GET /api/billing/plans  (public)
// ---------------------------------------------------------------------------
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// ---------------------------------------------------------------------------
// GET /api/billing  (authenticated)
// Returns the current user's subscription details.
// ---------------------------------------------------------------------------
router.get('/', billingLimiter, authenticateToken, (req, res) => {
  const billing = getBilling(req.user.id) || defaultBilling(req.user.id);
  const plan = PLANS[billing.plan] || PLANS.free;
  res.json({ billing: { ...billing, planDetails: plan } });
});

// ---------------------------------------------------------------------------
// POST /api/billing/checkout  (authenticated)
// Creates a Stripe Checkout session (or returns mock URL when Stripe is not
// configured).
// ---------------------------------------------------------------------------
router.post('/checkout', billingLimiter, authenticateToken, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;

  if (!planId || !PLANS[planId]) {
    return res.status(400).json({ error: `Invalid plan "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}` });
  }

  const plan = PLANS[planId];

  if (plan.price === null) {
    // Enterprise — redirect to contact sales
    return res.json({
      checkoutUrl: successUrl || 'https://autodevstack.dev/contact',
      mock: true,
    });
  }

  if (plan.price === 0) {
    return res.status(400).json({ error: 'Cannot create a checkout session for the Free plan.' });
  }

  const stripe = getStripe();

  if (!stripe) {
    // Mock mode: simulate a successful checkout
    const mockSessionId = `cs_mock_${Date.now()}`;
    return res.json({
      sessionId: mockSessionId,
      checkoutUrl: successUrl
        ? `${successUrl}?session_id=${mockSessionId}&mock=true`
        : `http://localhost:3000/billing?session_id=${mockSessionId}&mock=true`,
      mock: true,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.origin || 'http://localhost:3000'}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin || 'http://localhost:3000'}/billing`,
      metadata: { userId: req.user.id, planId },
    });
    res.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (err) {
    res.status(502).json({ error: 'Failed to create checkout session', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/subscribe  (authenticated)
// Directly subscribes the user to a plan (used for mock / downgrade to free).
// ---------------------------------------------------------------------------
router.post('/subscribe', billingLimiter, authenticateToken, (req, res) => {
  const { planId } = req.body;

  if (!planId || !PLANS[planId]) {
    return res.status(400).json({ error: `Invalid plan "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}` });
  }

  const plan = PLANS[planId];
  const now = new Date().toISOString();
  const billing = getBilling(req.user.id) || defaultBilling(req.user.id);

  const updated = {
    ...billing,
    plan: planId,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: plan.interval === 'month'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: false,
    updatedAt: now,
  };

  updateBilling(req.user.id, updated);

  // Record an invoice for paid plans
  if (plan.price && plan.price > 0) {
    addInvoice({
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: req.user.id,
      plan: planId,
      amount: plan.price,
      currency: plan.currency,
      status: 'paid',
      description: `${plan.name} plan — ${new Date(now).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
      createdAt: now,
    });
  }

  res.json({ message: `Subscribed to ${plan.name} plan`, billing: { ...updated, planDetails: plan } });
});

// ---------------------------------------------------------------------------
// POST /api/billing/cancel  (authenticated)
// Schedules the subscription to be cancelled at the end of the period.
// ---------------------------------------------------------------------------
router.post('/cancel', billingLimiter, authenticateToken, (req, res) => {
  const billing = getBilling(req.user.id) || defaultBilling(req.user.id);

  if (billing.plan === 'free') {
    return res.status(400).json({ error: 'You are already on the Free plan.' });
  }

  const stripe = getStripe();
  const now = new Date().toISOString();

  if (stripe && billing.stripeSubscriptionId) {
    // Async — don't await for now; handle via webhook in production
    stripe.subscriptions.update(billing.stripeSubscriptionId, { cancel_at_period_end: true })
      .catch(err => console.error('Stripe cancel error:', err.message));
  }

  const updated = { ...billing, cancelAtPeriodEnd: true, updatedAt: now };
  updateBilling(req.user.id, updated);

  res.json({ message: 'Subscription will be cancelled at the end of the billing period.', billing: updated });
});

// ---------------------------------------------------------------------------
// GET /api/billing/invoices  (authenticated)
// ---------------------------------------------------------------------------
router.get('/invoices', billingLimiter, authenticateToken, (req, res) => {
  const invoices = getInvoices(req.user.id);
  res.json({ invoices });
});

// ---------------------------------------------------------------------------
// POST /api/billing/webhook  (public — Stripe sends raw body)
// Note: raw body parsing is applied at the app level in server.js BEFORE
// express.json() so req.body will be a Buffer for this route.
// ---------------------------------------------------------------------------
router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  if (!stripe || !webhookSecret) {
    // Mock: just acknowledge
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, planId } = session.metadata || {};
      if (userId && planId && PLANS[planId]) {
        const now = new Date().toISOString();
        const existing = getBilling(userId) || defaultBilling(userId);
        updateBilling(userId, {
          ...existing,
          plan: planId,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          updatedAt: now,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      // Find user by stripeCustomerId
      const allBilling = require('../data/store').getAllBilling();
      const entry = allBilling.find(b => b.stripeCustomerId === sub.customer);
      if (entry) {
        updateBilling(entry.userId, {
          ...entry,
          plan: 'free',
          status: 'active',
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString(),
        });
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultBilling(userId) {
  return {
    userId,
    plan: 'free',
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    usage: { deployments: 0, projects: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = router;
module.exports.PLANS = PLANS;
