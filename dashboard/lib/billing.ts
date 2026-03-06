// Billing data helpers – all mock/localStorage based (mirrors the API plan definitions)

export type PlanId = "free" | "starter" | "pro" | "team" | "enterprise";

export interface PlanFeatures {
  maxProjects: number; // -1 = unlimited
  maxDeploymentsPerMonth: number; // -1 = unlimited
  privateProjects: boolean;
  teamMembers: number; // -1 = unlimited
  analytics: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number | null;
  currency: string;
  interval: "month" | null;
  features: PlanFeatures;
  description: string;
}

export interface Subscription {
  id: string;
  planId: PlanId;
  status: "active" | "canceled" | "past_due";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  planId: PlanId;
  planName: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  description: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface UsageStats {
  projects: { used: number; limit: number };
  deploymentsThisMonth: { used: number; limit: number };
}

// ── Plan registry ─────────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    interval: null,
    description: "Perfect for personal side-projects and experimentation.",
    features: {
      maxProjects: 3,
      maxDeploymentsPerMonth: 5,
      privateProjects: false,
      teamMembers: 1,
      analytics: false,
      prioritySupport: false,
    },
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    currency: "usd",
    interval: "month",
    description: "For freelancers and individual developers.",
    features: {
      maxProjects: 10,
      maxDeploymentsPerMonth: 50,
      privateProjects: true,
      teamMembers: 1,
      analytics: false,
      prioritySupport: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    currency: "usd",
    interval: "month",
    description: "Unlimited projects and advanced analytics for power users.",
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: 200,
      privateProjects: true,
      teamMembers: 1,
      analytics: true,
      prioritySupport: false,
    },
  },
  {
    id: "team",
    name: "Team",
    price: 79,
    currency: "usd",
    interval: "month",
    description: "Collaborate with up to 5 teammates with full analytics.",
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: -1,
      privateProjects: true,
      teamMembers: 5,
      analytics: true,
      prioritySupport: true,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    currency: "usd",
    interval: "month",
    description: "Custom contracts, SSO, and dedicated support for large teams.",
    features: {
      maxProjects: -1,
      maxDeploymentsPerMonth: -1,
      privateProjects: true,
      teamMembers: -1,
      analytics: true,
      prioritySupport: true,
    },
  },
];

// ── localStorage keys ─────────────────────────────────────────────────────────

const SUB_KEY = "autodevstack_subscription";
const INVOICES_KEY = "autodevstack_invoices";

// ── Subscription helpers ──────────────────────────────────────────────────────

export function getSubscription(): Subscription {
  if (typeof window === "undefined") return defaultSubscription();
  const stored = localStorage.getItem(SUB_KEY);
  if (!stored) {
    const sub = defaultSubscription();
    localStorage.setItem(SUB_KEY, JSON.stringify(sub));
    return sub;
  }
  return JSON.parse(stored) as Subscription;
}

function defaultSubscription(): Subscription {
  return {
    id: "sub_default",
    planId: "free",
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: new Date().toISOString(),
  };
}

export function setSubscription(planId: PlanId): Subscription {
  const plan = PLANS.find((p) => p.id === planId)!;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: Subscription = {
    id: `sub_${Date.now()}`,
    planId,
    status: "active",
    currentPeriodStart: plan.price ? now.toISOString() : null,
    currentPeriodEnd: plan.price ? periodEnd.toISOString() : null,
    createdAt: getSubscription().createdAt,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SUB_KEY, JSON.stringify(sub));

    // Generate a mock invoice for paid plans
    if (plan.price && plan.price > 0) {
      const invoice: Invoice = {
        id: `inv_${Date.now()}`,
        planId,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        status: "paid",
        description: `Subscription to ${plan.name} plan`,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
        createdAt: now.toISOString(),
      };
      const invoices = getInvoices();
      localStorage.setItem(INVOICES_KEY, JSON.stringify([invoice, ...invoices]));
    }
  }

  return sub;
}

// ── Invoice helpers ───────────────────────────────────────────────────────────

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(INVOICES_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as Invoice[];
}

// ── Usage helpers ─────────────────────────────────────────────────────────────

export function getUsageStats(projectCount: number, deploymentCount: number): UsageStats {
  const sub = getSubscription();
  const plan = PLANS.find((p) => p.id === sub.planId) ?? PLANS[0];
  return {
    projects: { used: projectCount, limit: plan.features.maxProjects },
    deploymentsThisMonth: { used: deploymentCount, limit: plan.features.maxDeploymentsPerMonth },
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatPrice(plan: Plan): string {
  if (plan.price === null) return "Custom";
  if (plan.price === 0) return "Free";
  return `$${plan.price}/mo`;
}

export function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : value.toString();
}
