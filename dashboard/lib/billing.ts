export type PlanId = "free" | "starter" | "pro" | "team" | "enterprise";

export interface PlanFeatures {
  deploymentsPerMonth: number | null;
  privateProjects: boolean;
  teamMembers: number | null;
  analytics: boolean;
  support: "community" | "email" | "priority" | "dedicated";
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number | null;
  currency: string;
  interval: string;
  features: PlanFeatures;
  description: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: "active" | "canceled" | "past_due";
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  deploymentsThisMonth: number;
  deploymentsLimit: number | null;
  totalProjects: number;
  teamMembers: number;
  teamMembersLimit: number | null;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  planId: PlanId;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  hostedInvoiceUrl?: string | null;
}

const BILLING_KEY = "autodevstack_billing";

// ---------------------------------------------------------------------------
// Mock plan catalog (mirrors api/routes/billing.js PLANS)
// ---------------------------------------------------------------------------
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    interval: "month",
    description: "Perfect for side projects and experiments.",
    features: {
      deploymentsPerMonth: 3,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      support: "community",
    },
  },
  {
    id: "starter",
    name: "Starter",
    price: 900,
    currency: "usd",
    interval: "month",
    description: "For individual developers shipping real products.",
    features: {
      deploymentsPerMonth: 20,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      support: "email",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 2900,
    currency: "usd",
    interval: "month",
    description: "For growing teams with advanced needs.",
    features: {
      deploymentsPerMonth: 100,
      privateProjects: true,
      teamMembers: 5,
      analytics: true,
      support: "priority",
    },
  },
  {
    id: "team",
    name: "Team",
    price: 7900,
    currency: "usd",
    interval: "month",
    description: "For scaling teams with collaboration tools.",
    features: {
      deploymentsPerMonth: 500,
      privateProjects: true,
      teamMembers: 25,
      analytics: true,
      support: "priority",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    currency: "usd",
    interval: "month",
    description: "Custom pricing for large organizations.",
    features: {
      deploymentsPerMonth: null,
      privateProjects: true,
      teamMembers: null,
      analytics: true,
      support: "dedicated",
    },
  },
];

// ---------------------------------------------------------------------------
// LocalStorage helpers (mock data for the dashboard demo)
// ---------------------------------------------------------------------------
interface BillingState {
  subscription: Subscription;
  invoices: Invoice[];
}

function defaultState(): BillingState {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    subscription: {
      id: "sub_demo",
      userId: "demo",
      planId: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    invoices: [],
  };
}

function readState(): BillingState {
  if (typeof window === "undefined") return defaultState();
  const raw = localStorage.getItem(BILLING_KEY);
  if (!raw) return defaultState();
  return JSON.parse(raw) as BillingState;
}

function writeState(state: BillingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BILLING_KEY, JSON.stringify(state));
}

export function getSubscription(): Subscription {
  return readState().subscription;
}

export function getCurrentPlan(): Plan {
  const sub = getSubscription();
  return PLANS.find((p) => p.id === sub.planId) ?? PLANS[0];
}

export function getInvoices(): Invoice[] {
  return readState().invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function subscribeToPlan(planId: PlanId): { subscription: Subscription; invoice?: Invoice } {
  const state = readState();
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const updated: Subscription = {
    ...state.subscription,
    planId,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    updatedAt: now.toISOString(),
  };

  let invoice: Invoice | undefined;
  if (planId !== "free" && plan.price && plan.price > 0) {
    invoice = {
      id: `inv_${Date.now()}`,
      userId: "demo",
      subscriptionId: updated.id,
      planId,
      amount: plan.price,
      currency: plan.currency,
      status: "paid",
      periodStart: updated.currentPeriodStart,
      periodEnd: updated.currentPeriodEnd,
      createdAt: now.toISOString(),
      hostedInvoiceUrl: null,
    };
    state.invoices.unshift(invoice);
  }

  state.subscription = updated;
  writeState(state);
  return { subscription: updated, invoice };
}

export function formatPrice(amount: number | null, currency = "usd"): string {
  if (amount === null) return "Custom";
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getUsagePct(used: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
