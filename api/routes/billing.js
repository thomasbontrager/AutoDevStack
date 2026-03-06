const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getSubscriptionByUsername,
  upsertSubscription,
  getInvoicesByUsername,
  createInvoice,
  getProjects,
  getDeployments,
} = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const billingLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: null,
    features: {
      maxProjects: 3,
      maxDeploymentsPerMonth: 5,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      prioritySupport: false,
    },
    description: 'Perfect for personal side-projects and experimentation.',
    stripePriceId: null,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 9,
    currency: 'usd',
    interval: 'month',
    features: {
      maxProjects: 10,
      maxDeploymentsPerMonth: 50,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      prioritySupport: false,
    },
    description: 'For freelancers and individual developers.',
    stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'usd',
    interval: 'month',
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: 200,
      privateProjects: true,
      teamMembers: 1,
      analytics: true,
      prioritySupport: false,
    },
    description: 'Unlimited projects and advanced analytics for power users.',
    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 79,
    currency: 'usd',
    interval: 'month',
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: -1,
      privateProjects: true,
      teamMembers: 5,
      analytics: true,
      prioritySupport: true,
    },
    description: 'Collaborate with up to 5 teammates with full analytics.',
    stripePriceId: process.env.STRIPE_PRICE_TEAM || 'price_team_monthly',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    currency: 'usd',
    interval: 'month',
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: -1,
      privateProjects: true,
      teamMembers: -1,
      analytics: true,
      prioritySupport: true,
    },
    description: 'Custom contracts, SSO, and dedicated support for large teams.',
    stripePriceId: null,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrCreateSubscription(username) {
  let sub = getSubscriptionByUsername(username);
  if (!sub) {
    sub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username,
      planId: 'free',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertSubscription(sub);
  }
  return sub;
}

function getCurrentMonthDeploymentCount(username) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const projects = getProjects().filter(p => p.owner === username);
  const projectIds = new Set(projects.map(p => p.id));
  return getDeployments().filter(
    d => projectIds.has(d.projectId) && d.createdAt >= startOfMonth
  ).length;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/billing/plans
router.get('/plans', billingLimiter, (_req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// GET /api/billing/subscription  (authenticated)
router.get('/subscription', billingLimiter, authenticateToken, (req, res) => {
  const sub = getOrCreateSubscription(req.user.username);
  const plan = PLANS[sub.planId] || PLANS.free;
  res.json({ subscription: sub, plan });
});

// GET /api/billing/usage  (authenticated)
router.get('/usage', billingLimiter, authenticateToken, (req, res) => {
  const username = req.user.username;
  const sub = getOrCreateSubscription(username);
  const plan = PLANS[sub.planId] || PLANS.free;

  const projectCount = getProjects().filter(p => p.owner === username).length;
  const deploymentsThisMonth = getCurrentMonthDeploymentCount(username);

  res.json({
    usage: {
      projects: {
        used: projectCount,
        limit: plan.features.maxProjects,
      },
      deploymentsThisMonth: {
        used: deploymentsThisMonth,
        limit: plan.features.maxDeploymentsPerMonth,
      },
    },
    plan: {
      id: plan.id,
      name: plan.name,
    },
  });
});

// GET /api/billing/invoices  (authenticated)
router.get('/invoices', billingLimiter, authenticateToken, (req, res) => {
  const invoices = getInvoicesByUsername(req.user.username);
  res.json({ invoices });
});

// POST /api/billing/subscribe  (authenticated)
// Simulates a plan change without a real Stripe call (useful when no Stripe keys are set).
router.post('/subscribe', billingLimiter, authenticateToken, (req, res) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: 'planId is required' });
  }

  const plan = PLANS[planId];
  if (!plan) {
    return res.status(400).json({
      error: `Invalid planId "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}`,
    });
  }

  if (planId === 'enterprise') {
    return res.status(400).json({
      error: 'Enterprise plans require contacting sales. Please use /api/billing/create-checkout-session for paid plans.',
    });
  }

  const now = new Date().toISOString();
  const sub = getOrCreateSubscription(req.user.username);

  const previousPlanId = sub.planId;

  sub.planId = planId;
  sub.status = 'active';
  sub.updatedAt = now;

  // For paid plans, simulate a period
  if (plan.price && plan.price > 0) {
    sub.currentPeriodStart = now;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    sub.currentPeriodEnd = periodEnd.toISOString();

    // Generate a mock invoice for the subscription
    const invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username: req.user.username,
      planId,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      status: 'paid',
      description: `Subscription to ${plan.name} plan`,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      createdAt: now,
    };
    createInvoice(invoice);
  }

  upsertSubscription(sub);

  res.json({
    message: `Successfully ${previousPlanId === planId ? 'renewed' : 'switched to'} the ${plan.name} plan.`,
    subscription: sub,
    plan,
  });
});

// POST /api/billing/create-checkout-session  (authenticated)
// Creates a Stripe Checkout Session URL for paid plans.
// Requires STRIPE_SECRET_KEY environment variable.
router.post('/create-checkout-session', billingLimiter, authenticateToken, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;

  if (!planId) {
    return res.status(400).json({ error: 'planId is required' });
  }

  const plan = PLANS[planId];
  if (!plan) {
    return res.status(400).json({
      error: `Invalid planId "${planId}". Valid plans: ${Object.keys(PLANS).join(', ')}`,
    });
  }

  if (!plan.price || plan.price === 0) {
    return res.status(400).json({ error: 'Checkout sessions are only available for paid plans.' });
  }

  if (planId === 'enterprise') {
    return res.status(400).json({ error: 'Enterprise plans require contacting sales.' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Return a helpful error when Stripe is not configured
    return res.status(503).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payment processing.',
      hint: 'Use POST /api/billing/subscribe to switch plans without payment in development.',
    });
  }

  try {
    // Dynamically require stripe so the server starts fine without the package installed.
    // eslint-disable-next-line import/no-extraneous-dependencies
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
      metadata: { username: req.user.username, planId },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: `Failed to create checkout session: ${err.message}` });
  }
});

// POST /api/billing/webhook
// Stripe webhook to handle subscription lifecycle events.
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ error: 'Stripe webhook secret not configured.' });
  }

  let event;
  try {
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const now = new Date().toISOString();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { username, planId } = session.metadata || {};
      if (username && planId) {
        const plan = PLANS[planId];
        const sub = getOrCreateSubscription(username);
        sub.planId = planId;
        sub.status = 'active';
        sub.stripeCustomerId = session.customer;
        sub.stripeSubscriptionId = session.subscription;
        sub.updatedAt = now;
        upsertSubscription(sub);

        if (plan) {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          const invoice = {
            id: `inv_${session.id}`,
            username,
            planId,
            planName: plan.name,
            amount: plan.price,
            currency: plan.currency,
            status: 'paid',
            description: `Subscription to ${plan.name} plan`,
            periodStart: now,
            periodEnd: periodEnd.toISOString(),
            createdAt: now,
          };
          createInvoice(invoice);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      // Downgrade to free plan on cancellation
      const db = require('../data/store');
      const allSubs = [];
      // We can't easily query by stripeSubscriptionId without an index,
      // so we iterate. In production, use a real DB with indexing.
      const { getUsers } = db;
      getUsers().forEach(u => {
        const sub = getSubscriptionByUsername(u.username);
        if (sub && sub.stripeSubscriptionId === stripeSub.id) {
          sub.planId = 'free';
          sub.status = 'canceled';
          sub.stripeSubscriptionId = null;
          sub.updatedAt = now;
          upsertSubscription(sub);
        }
      });
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  res.json({ received: true });
});

module.exports = router;
module.exports.PLANS = PLANS;
