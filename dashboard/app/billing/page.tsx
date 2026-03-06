"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUser } from "@/lib/auth";
import {
  PLANS,
  getBilling,
  getInvoices,
  subscribeToPlan,
  cancelSubscription,
  formatCents,
  type BillingInfo,
  type Invoice,
  type Plan,
} from "@/lib/billing";

export default function BillingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setBilling(getBilling());
    setInvoices(getInvoices());
  }, [router]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleSubscribe(planId: string) {
    if (billing?.plan === planId) return;
    setUpgrading(planId);
    try {
      const updated = subscribeToPlan(planId);
      setBilling(updated);
      setInvoices(getInvoices());
      showToast(`Successfully switched to the ${updated.planDetails.name} plan!`);
    } catch {
      showToast("Failed to change plan. Please try again.", "error");
    } finally {
      setUpgrading(null);
    }
  }

  function handleCancel() {
    setCancelling(true);
    try {
      const updated = cancelSubscription();
      setBilling(updated);
      showToast("Subscription will be cancelled at the end of the billing period.");
    } catch {
      showToast("Failed to cancel subscription. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }

  if (!billing) return null;

  const currentPlan = billing.planDetails;
  const usageDeploymentPct =
    currentPlan.features.deployments > 0
      ? Math.min(100, (billing.usage.deployments / currentPlan.features.deployments) * 100)
      : 0;
  const usageProjectPct =
    currentPlan.features.projects > 0
      ? Math.min(100, (billing.usage.projects / currentPlan.features.projects) * 100)
      : 0;

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
          <p className="text-gray-500 mt-1">Manage your subscription, usage, and invoices.</p>
        </div>

        {/* Current plan summary */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current plan</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">{currentPlan.name}</span>
                <StatusBadge status={billing.status} cancelAtPeriodEnd={billing.cancelAtPeriodEnd} />
              </div>
              <p className="text-gray-500 text-sm mt-1">{currentPlan.description}</p>
              {billing.currentPeriodEnd && (
                <p className="text-gray-400 text-xs mt-1">
                  {billing.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}{" "}
                  {new Date(billing.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="text-right">
              {currentPlan.price !== null && currentPlan.price > 0 ? (
                <p className="text-3xl font-bold text-gray-900">
                  {formatCents(currentPlan.price)}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </p>
              ) : currentPlan.price === 0 ? (
                <p className="text-3xl font-bold text-gray-900">Free</p>
              ) : (
                <p className="text-lg font-semibold text-gray-900">Custom pricing</p>
              )}
              {billing.plan !== "free" && !billing.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
                >
                  {cancelling ? "Cancelling…" : "Cancel subscription"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Usage stats */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Usage this period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <UsageBar
              label="Deployments"
              used={billing.usage.deployments}
              limit={currentPlan.features.deployments}
              pct={usageDeploymentPct}
              color="indigo"
            />
            <UsageBar
              label="Projects"
              used={billing.usage.projects}
              limit={currentPlan.features.projects}
              pct={usageProjectPct}
              color="purple"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FeatureChip
              label="Private projects"
              active={currentPlan.features.privateProjects}
            />
            <FeatureChip
              label="Analytics"
              active={currentPlan.features.analytics}
            />
            <FeatureChip
              label="Custom domains"
              active={currentPlan.features.customDomains}
            />
            <FeatureChip
              label={`Team members: ${currentPlan.features.teamMembers === -1 ? "∞" : currentPlan.features.teamMembers}`}
              active={currentPlan.features.teamMembers > 1 || currentPlan.features.teamMembers === -1}
            />
          </div>
        </section>

        {/* Plan cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Available plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={billing.plan === plan.id}
                isUpgrading={upgrading === plan.id}
                onSelect={handleSubscribe}
              />
            ))}
          </div>
        </section>

        {/* Invoices */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-sm">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Description</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Amount</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} />
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  cancelAtPeriodEnd,
}: {
  status: BillingInfo["status"];
  cancelAtPeriodEnd: boolean;
}) {
  if (cancelAtPeriodEnd) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
        Cancels soon
      </span>
    );
  }
  const map: Record<BillingInfo["status"], string> = {
    active: "bg-green-100 text-green-700",
    past_due: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  const label: Record<BillingInfo["status"], string> = {
    active: "Active",
    past_due: "Past due",
    cancelled: "Cancelled",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function UsageBar({
  label,
  used,
  limit,
  pct,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  pct: number;
  color: "indigo" | "purple";
}) {
  const unlimited = limit === -1;
  const barColor = color === "indigo" ? "bg-indigo-500" : "bg-purple-500";
  return (
    <div>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{label}</span>
        <span>
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        {!unlimited && (
          <div
            className={`h-2 rounded-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        )}
        {unlimited && <div className={`h-2 rounded-full ${barColor} w-full opacity-30`} />}
      </div>
    </div>
  );
}

function FeatureChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
        active
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-gray-200 bg-gray-50 text-gray-400"
      }`}
    >
      <span>{active ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isUpgrading,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  isUpgrading: boolean;
  onSelect: (planId: string) => void;
}) {
  const isEnterprise = plan.price === null;
  const isFree = plan.price === 0;

  const buttonLabel = () => {
    if (isUpgrading) return "Switching…";
    if (isCurrent) return "Current plan";
    if (isEnterprise) return "Contact sales";
    return isFree ? "Downgrade" : "Upgrade";
  };

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
        isCurrent
          ? "border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50"
          : "border-gray-100 bg-white"
      }`}
    >
      <div>
        <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{plan.description}</p>
      </div>
      <div>
        {plan.price === null ? (
          <p className="text-xl font-bold text-gray-800">Custom</p>
        ) : plan.price === 0 ? (
          <p className="text-xl font-bold text-gray-800">Free</p>
        ) : (
          <p className="text-xl font-bold text-gray-800">
            {formatCents(plan.price)}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
        )}
      </div>
      <ul className="space-y-1 text-xs text-gray-600 flex-1">
        <li>
          {plan.features.deployments === -1 ? "Unlimited" : plan.features.deployments} deployments
        </li>
        <li>
          {plan.features.projects === -1 ? "Unlimited" : plan.features.projects} projects
        </li>
        <li className={plan.features.privateProjects ? "text-gray-700" : "text-gray-400"}>
          {plan.features.privateProjects ? "✓" : "✗"} Private projects
        </li>
        <li className={plan.features.analytics ? "text-gray-700" : "text-gray-400"}>
          {plan.features.analytics ? "✓" : "✗"} Analytics
        </li>
        <li>
          {plan.features.teamMembers === -1 ? "Unlimited" : plan.features.teamMembers} team{" "}
          {plan.features.teamMembers === 1 ? "member" : "members"}
        </li>
        <li className="capitalize text-gray-500">{plan.features.support} support</li>
      </ul>
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || isUpgrading}
        className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
          isCurrent
            ? "bg-indigo-100 text-indigo-600 cursor-default"
            : isEnterprise
            ? "bg-gray-900 hover:bg-gray-700 text-white"
            : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
        }`}
      >
        {buttonLabel()}
      </button>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusStyles: Record<Invoice["status"], string> = {
    paid: "bg-green-100 text-green-700",
    open: "bg-yellow-100 text-yellow-700",
    void: "bg-gray-100 text-gray-500",
  };
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="py-3 px-3 text-gray-700">{invoice.description}</td>
      <td className="py-3 px-3 text-gray-500">
        {new Date(invoice.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="py-3 px-3 text-right font-medium text-gray-800">
        {formatCents(invoice.amount, invoice.currency)}
      </td>
      <td className="py-3 px-3 text-right">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[invoice.status]}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </td>
    </tr>
  );
}
