const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const {
  getSubscriptionByUserId,
  upsertSubscription,
  getInvoicesByUserId,
  createInvoice,
  getDeployments,
  getProjects,
  getSubscriptionByStripeId,
} = require('../data/store');

const router = express.Router();

const billingLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// --------------------------------------------------------------------------
// Plan definitions
// --------------------------------------------------------------------------
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    stripePriceId: null,
    features: {
      deploymentsPerMonth: 3,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      support: 'community',
    },
    description: 'Perfect for side projects and experiments.',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
    features: {
      deploymentsPerMonth: 20,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      support: 'email',
    },
    description: 'For individual developers shipping real products.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    features: {
      deploymentsPerMonth: 100,
      privateProjects: true,
      teamMembers: 5,
      analytics: true,
      support: 'priority',
    },
    description: 'For growing teams with advanced needs.',
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 7900,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_TEAM || null,
    features: {
      deploymentsPerMonth: 500,
      privateProjects: true,
      teamMembers: 25,
      analytics: true,
      support: 'priority',
    },
    description: 'For scaling teams with collaboration tools.',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || null,
    features: {
      deploymentsPerMonth: null,
      privateProjects: true,
      teamMembers: null,
      analytics: true,
      support: 'dedicated',
    },
    description: 'Custom pricing for large organizations.',
  },
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function getOrCreateSubscription(userId) {
  let sub = getSubscriptionByUserId(userId);
  if (!sub) {
    sub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      planId: 'free',
      status: 'active',
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertSubscription(sub);
  }
  return sub;
}

function computeUsage(username, planId) {
  const plan = PLANS[planId] || PLANS.free;
  const allDeployments = getDeployments().filter(d => d.triggeredBy === username);
  const allProjects = getProjects().filter(p => p.owner === username);

  // Deployments this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const deploymentsThisMonth = allDeployments.filter(d => d.createdAt >= monthStart).length;

  return {
    deploymentsThisMonth,
    deploymentsLimit: plan.features.deploymentsPerMonth,
    totalProjects: allProjects.length,
    teamMembers: 1,
    teamMembersLimit: plan.features.teamMembers,
  };
}

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------

// GET /api/billing/plans  – public
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// GET /api/billing/subscription  – authenticated
router.get('/subscription', billingLimiter, authenticateToken, (req, res) => {
  const sub = getOrCreateSubscription(req.user.id);
  const plan = PLANS[sub.planId] || PLANS.free;
  const usage = computeUsage(req.user.username, sub.planId);
  res.json({ subscription: sub, plan, usage });
});

// POST /api/billing/subscribe  – authenticated
// Body: { planId } – upgrades/downgrades the subscription
// In production this would create a Stripe Checkout Session; here we use a
// lightweight flow that can integrate Stripe when STRIPE_SECRET_KEY is set.
router.post('/subscribe', billingLimiter, authenticateToken, async (req, res) => {
  const { planId } = req.body;

  if (!planId || !PLANS[planId]) {
    return res.status(400).json({
      error: `Invalid plan. Valid plans: ${Object.keys(PLANS).join(', ')}`,
    });
  }

  if (planId === 'enterprise') {
    return res.status(400).json({
      error: 'Enterprise plans require contacting sales. Please email sales@autodevstack.dev',
    });
  }

  const sub = getOrCreateSubscription(req.user.id);
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // When Stripe is configured, create/update a real Stripe subscription
  if (stripeKey && PLANS[planId].stripePriceId) {
    try {
      const Stripe = require('stripe');
      const stripe = Stripe(stripeKey);

      let customerId = sub.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId: req.user.id, username: req.user.username },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: PLANS[planId].stripePriceId, quantity: 1 }],
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?success=1`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?canceled=1`,
        metadata: { userId: req.user.id, planId },
      });

      return res.json({
        checkoutUrl: session.url,
        message: 'Redirect user to checkoutUrl to complete payment',
      });
    } catch (err) {
      return res.status(502).json({ error: 'Failed to create Stripe checkout session', detail: err.message });
    }
  }

  // No Stripe configured – update subscription locally (dev/demo mode)
  const now = new Date();
  const updated = {
    ...sub,
    planId,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  };
  upsertSubscription(updated);

  // Generate a mock invoice for paid plans
  if (planId !== 'free' && PLANS[planId].price > 0) {
    const invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: req.user.id,
      subscriptionId: updated.id,
      planId,
      amount: PLANS[planId].price,
      currency: PLANS[planId].currency,
      status: 'paid',
      periodStart: updated.currentPeriodStart,
      periodEnd: updated.currentPeriodEnd,
      createdAt: now.toISOString(),
    };
    createInvoice(invoice);
  }

  res.json({
    subscription: updated,
    plan: PLANS[planId],
    message: `Successfully subscribed to ${PLANS[planId].name} plan`,
  });
});

// GET /api/billing/invoices  – authenticated
router.get('/invoices', billingLimiter, authenticateToken, (req, res) => {
  const invoices = getInvoicesByUserId(req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ invoices });
});

// POST /api/billing/webhook  – Stripe webhook (raw body required)
// Verifies the Stripe-Signature header when STRIPE_WEBHOOK_SECRET is set.
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (webhookSecret && sig) {
    try {
      const Stripe = require('stripe');
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }
  } else {
    // No webhook secret – parse raw body (dev/test mode only)
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in webhook body' });
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, planId } = session.metadata || {};
      if (userId && planId && PLANS[planId]) {
        const sub = getOrCreateSubscription(userId);
        const now = new Date();
        upsertSubscription({
          ...sub,
          planId,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
        });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      const sub = getSubscriptionByStripeId(stripeSub.id);
      if (sub) {
        upsertSubscription({
          ...sub,
          status: stripeSub.status === 'canceled' ? 'canceled' : 'active',
          updatedAt: new Date().toISOString(),
        });
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const stripeInvoice = event.data.object;
      const { userId: uid, planId: pid } = stripeInvoice.subscription_details?.metadata || {};
      if (uid && pid) {
        createInvoice({
          id: `inv_${stripeInvoice.id}`,
          userId: uid,
          subscriptionId: stripeInvoice.subscription,
          planId: pid,
          amount: stripeInvoice.amount_paid,
          currency: stripeInvoice.currency,
          status: 'paid',
          stripeInvoiceId: stripeInvoice.id,
          hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
          periodStart: new Date(stripeInvoice.period_start * 1000).toISOString(),
          periodEnd: new Date(stripeInvoice.period_end * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      break;
    }
    default:
      // Unhandled event type – acknowledge receipt
      break;
  }

  res.json({ received: true });
});

module.exports = router;
module.exports.PLANS = PLANS;
