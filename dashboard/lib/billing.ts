// Billing types and mock data helpers for the AutoDevStack dashboard.
// In production, these would be backed by API calls to /api/billing/*.

export interface PlanFeatures {
  deployments: number; // -1 = unlimited
  projects: number;    // -1 = unlimited
  privateProjects: boolean;
  teamMembers: number; // -1 = unlimited
  analytics: boolean;
  customDomains: boolean;
  support: "community" | "email" | "priority" | "dedicated";
}

export interface Plan {
  id: string;
  name: string;
  price: number | null; // null = contact sales (Enterprise)
  currency: string;
  interval: "month" | null;
  features: PlanFeatures;
  description: string;
}

export interface BillingInfo {
  plan: string;
  status: "active" | "past_due" | "cancelled";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    deployments: number;
    projects: number;
  };
  planDetails: Plan;
}

export interface Invoice {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  description: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Static plan definitions (mirrors api/routes/billing.js PLANS)
// ---------------------------------------------------------------------------
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    interval: null,
    description: "Perfect for side projects and experimentation.",
    features: {
      deployments: 3,
      projects: 3,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      customDomains: false,
      support: "community",
    },
  },
  {
    id: "starter",
    name: "Starter",
    price: 900,
    currency: "usd",
    interval: "month",
    description: "For freelancers and solo developers.",
    features: {
      deployments: 20,
      projects: 10,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      customDomains: true,
      support: "email",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 2900,
    currency: "usd",
    interval: "month",
    description: "Full power for professional developers.",
    features: {
      deployments: 100,
      projects: 50,
      privateProjects: true,
      teamMembers: 1,
      analytics: true,
      customDomains: true,
      support: "priority",
    },
  },
  {
    id: "team",
    name: "Team",
    price: 7900,
    currency: "usd",
    interval: "month",
    description: "Collaborate without limits.",
    features: {
      deployments: -1,
      projects: -1,
      privateProjects: true,
      teamMembers: 10,
      analytics: true,
      customDomains: true,
      support: "priority",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    currency: "usd",
    interval: null,
    description: "Custom pricing and SLAs for large teams.",
    features: {
      deployments: -1,
      projects: -1,
      privateProjects: true,
      teamMembers: -1,
      analytics: true,
      customDomains: true,
      support: "dedicated",
    },
  },
];

// ---------------------------------------------------------------------------
// localStorage-backed billing state (mock / demo mode)
// ---------------------------------------------------------------------------
const BILLING_KEY = "autodevstack_billing";
const INVOICES_KEY = "autodevstack_invoices";

const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_demo_001",
    plan: "pro",
    amount: 2900,
    currency: "usd",
    status: "paid",
    description: "Pro plan — January 2025",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "inv_demo_002",
    plan: "pro",
    amount: 2900,
    currency: "usd",
    status: "paid",
    description: "Pro plan — February 2025",
    createdAt: "2025-02-01T00:00:00.000Z",
  },
  {
    id: "inv_demo_003",
    plan: "pro",
    amount: 2900,
    currency: "usd",
    status: "paid",
    description: "Pro plan — March 2025",
    createdAt: "2025-03-01T00:00:00.000Z",
  },
];

function getDefaultBilling(): BillingInfo {
  const freePlan = PLANS.find((p) => p.id === "free")!;
  return {
    plan: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    usage: { deployments: 1, projects: 3 },
    planDetails: freePlan,
  };
}

export function getBilling(): BillingInfo {
  if (typeof window === "undefined") return getDefaultBilling();
  const stored = localStorage.getItem(BILLING_KEY);
  if (!stored) return getDefaultBilling();
  try {
    const parsed = JSON.parse(stored) as BillingInfo;
    // Re-attach planDetails in case of stale data
    parsed.planDetails = PLANS.find((p) => p.id === parsed.plan) ?? PLANS[0];
    return parsed;
  } catch {
    return getDefaultBilling();
  }
}

export function saveBilling(billing: BillingInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BILLING_KEY, JSON.stringify(billing));
}

export function subscribeToPlan(planId: string): BillingInfo {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const now = new Date().toISOString();
  const billing: BillingInfo = {
    plan: planId,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd:
      plan.interval === "month"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    cancelAtPeriodEnd: false,
    usage: getBilling().usage,
    planDetails: plan,
  };
  saveBilling(billing);

  // Record an invoice for paid plans
  if (plan.price && plan.price > 0) {
    const invoices = getInvoices();
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      plan: planId,
      amount: plan.price,
      currency: plan.currency,
      status: "paid",
      description: `${plan.name} plan — ${new Date(now).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })}`,
      createdAt: now,
    };
    saveInvoices([invoice, ...invoices]);
  }

  return billing;
}

export function cancelSubscription(): BillingInfo {
  const billing = getBilling();
  const updated = { ...billing, cancelAtPeriodEnd: true };
  saveBilling(updated);
  return updated;
}

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return MOCK_INVOICES;
  const stored = localStorage.getItem(INVOICES_KEY);
  if (!stored) {
    // Pre-populate with demo invoices on first load
    saveInvoices(MOCK_INVOICES);
    return MOCK_INVOICES;
  }
  try {
    return JSON.parse(stored) as Invoice[];
  } catch {
    return MOCK_INVOICES;
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatFeatureValue(value: number | boolean): string {
  if (value === -1) return "Unlimited";
  if (value === true) return "✓";
  if (value === false) return "✗";
  return String(value);
}
