"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUser } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import {
  PLANS,
  getSubscription,
  setSubscription,
  getInvoices,
  getUsageStats,
  formatPrice,
  formatLimit,
  type Plan,
  type Subscription,
  type Invoice,
  type UsageStats,
} from "@/lib/billing";

// ── Small helpers ─────────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color =
    limit === -1
      ? "bg-green-500"
      : pct >= 90
      ? "bg-red-500"
      : pct >= 70
      ? "bg-yellow-500"
      : "bg-indigo-500";

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      {limit === -1 ? (
        <div className="bg-green-500 h-2 rounded-full w-full opacity-30" />
      ) : (
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

function FeatureCheck({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-green-500 font-bold">✓</span>
  ) : (
    <span className="text-gray-300 font-bold">✗</span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-gray-400">Loading billing…</div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscriptionState] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!getUser()) {
      router.push("/login");
      return;
    }

    const sub = getSubscription();
    setSubscriptionState(sub);
    setInvoices(getInvoices());

    const projects = getProjects();
    // For demonstration, deployments this month is kept at 0 since localStorage
    // doesn't track deployments in the dashboard mock.
    setUsage(getUsageStats(projects.length, 0));

    // Handle Stripe redirect query params
    if (searchParams.get("success") === "true") {
      showToast("success", "Payment successful! Your plan has been updated.");
    } else if (searchParams.get("canceled") === "true") {
      showToast("error", "Payment was canceled. Your plan was not changed.");
    }
  }, [router, searchParams]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function handleUpgrade(planId: string) {
    if (planId === "enterprise") {
      window.location.href = "mailto:sales@autodevstack.io?subject=Enterprise%20Plan%20Inquiry";
      return;
    }

    setUpgrading(planId);
    try {
      const updated = setSubscription(planId as Subscription["planId"]);
      setSubscriptionState(updated);
      setInvoices(getInvoices());
      const plan = PLANS.find((p) => p.id === planId)!;
      showToast("success", `Switched to the ${plan.name} plan successfully.`);
    } catch {
      showToast("error", "Failed to switch plan. Please try again.");
    } finally {
      setUpgrading(null);
    }
  }

  const currentPlan = PLANS.find((p) => p.id === subscription?.planId) ?? PLANS[0];

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing &amp; Plans</h1>
          <p className="text-gray-500 mt-1">
            Manage your subscription, usage, and invoices.
          </p>
        </div>

        {/* Current plan + usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Current plan card */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Plan</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-bold text-indigo-700">{currentPlan.name}</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  subscription?.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {subscription?.status ?? "active"}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-4">{currentPlan.description}</p>

            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-gray-400">
                Renews on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4 text-sm space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Private projects</span>
                <FeatureCheck ok={currentPlan.features.privateProjects} />
              </div>
              <div className="flex justify-between">
                <span>Team members</span>
                <span className="font-medium">
                  {formatLimit(currentPlan.features.teamMembers)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Analytics</span>
                <FeatureCheck ok={currentPlan.features.analytics} />
              </div>
              <div className="flex justify-between">
                <span>Priority support</span>
                <FeatureCheck ok={currentPlan.features.prioritySupport} />
              </div>
            </div>
          </section>

          {/* Usage card */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Usage This Month</h2>
            {usage ? (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Projects</span>
                    <span className="font-medium">
                      {usage.projects.used} /{" "}
                      {formatLimit(usage.projects.limit)}
                    </span>
                  </div>
                  <UsageBar used={usage.projects.used} limit={usage.projects.limit} />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Deployments</span>
                    <span className="font-medium">
                      {usage.deploymentsThisMonth.used} /{" "}
                      {formatLimit(usage.deploymentsThisMonth.limit)}
                    </span>
                  </div>
                  <UsageBar
                    used={usage.deploymentsThisMonth.used}
                    limit={usage.deploymentsThisMonth.limit}
                  />
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Team members</span>
                    <span className="font-medium">
                      1 / {formatLimit(currentPlan.features.teamMembers)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Loading usage…</p>
            )}
          </section>
        </div>

        {/* Plan comparison */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlan.id}
                isUpgrading={upgrading === plan.id}
                onSelect={() => handleUpgrade(plan.id)}
              />
            ))}
          </div>
        </section>

        {/* Invoices */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invoices</h2>
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-gray-400 text-sm">No invoices yet. Upgrade to a paid plan to see billing history.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(inv.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{inv.description}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${inv.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : inv.status === "open"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// ── Plan card component ───────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  isUpgrading,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  isUpgrading: boolean;
  onSelect: () => void;
}) {
  const isHighlighted = plan.id === "pro";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
        isCurrent
          ? "border-indigo-400 bg-indigo-50 shadow-md"
          : isHighlighted
          ? "border-indigo-200 bg-white shadow-md"
          : "border-gray-100 bg-white shadow-sm hover:shadow-md"
      }`}
    >
      {isHighlighted && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
          Popular
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
          Current
        </span>
      )}

      <div className="mb-3">
        <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
        <p className="text-2xl font-extrabold text-indigo-700 mt-1">{formatPrice(plan)}</p>
        <p className="text-xs text-gray-500 mt-1 leading-snug">{plan.description}</p>
      </div>

      <ul className="text-xs text-gray-600 space-y-1.5 flex-1 mb-4">
        <li>
          <span className="font-medium">{formatLimit(plan.features.maxProjects)}</span> projects
        </li>
        <li>
          <span className="font-medium">
            {formatLimit(plan.features.maxDeploymentsPerMonth)}
          </span>{" "}
          deploys/mo
        </li>
        <li className="flex items-center gap-1">
          <FeatureCheck ok={plan.features.privateProjects} /> Private projects
        </li>
        <li>
          <span className="font-medium">{formatLimit(plan.features.teamMembers)}</span> team member
          {plan.features.teamMembers !== 1 ? "s" : ""}
        </li>
        <li className="flex items-center gap-1">
          <FeatureCheck ok={plan.features.analytics} /> Analytics
        </li>
        <li className="flex items-center gap-1">
          <FeatureCheck ok={plan.features.prioritySupport} /> Priority support
        </li>
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent || isUpgrading}
        className={`w-full text-sm font-semibold py-2 rounded-lg transition-colors ${
          isCurrent
            ? "bg-indigo-100 text-indigo-400 cursor-default"
            : plan.id === "enterprise"
            ? "bg-gray-800 hover:bg-gray-900 text-white"
            : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
        }`}
      >
        {isCurrent
          ? "Current plan"
          : isUpgrading
          ? "Switching…"
          : plan.id === "enterprise"
          ? "Contact sales"
          : plan.price === 0
          ? "Downgrade"
          : "Upgrade"}
      </button>
    </div>
  );
}
