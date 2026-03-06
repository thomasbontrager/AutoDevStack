"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUser } from "@/lib/auth";
import {
  PLANS,
  getSubscription,
  getCurrentPlan,
  getInvoices,
  subscribeToPlan,
  formatPrice,
  formatDate,
  getUsagePct,
  type Plan,
  type Subscription,
  type Invoice,
  type PlanId,
} from "@/lib/billing";
import { getProjects } from "@/lib/projects";

const SUPPORT_LABELS: Record<string, string> = {
  community: "Community",
  email: "Email",
  priority: "Priority",
  dedicated: "Dedicated",
};

export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deploymentsThisMonth] = useState(1); // mock: 1 deployment this month
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setSubscription(getSubscription());
    setCurrentPlan(getCurrentPlan());
    setInvoices(getInvoices());
  }, [router]);

  function handleSubscribe(planId: PlanId) {
    if (planId === "enterprise") {
      setFeedback({ type: "error", msg: "Enterprise plans are not available for self-service. Please contact sales@autodevstack.dev to get a custom quote." });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const result = subscribeToPlan(planId);
      setSubscription(result.subscription);
      setCurrentPlan(PLANS.find((p) => p.id === planId) ?? null);
      setInvoices(getInvoices());
      const planName = PLANS.find((p) => p.id === planId)?.name ?? planId;
      setFeedback({ type: "success", msg: `Successfully switched to the ${planName} plan.` });
    } catch {
      setFeedback({ type: "error", msg: "Failed to update plan. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (!subscription || !currentPlan) return null;

  const projects = getProjects();
  const usagePct = getUsagePct(deploymentsThisMonth, currentPlan.features.deploymentsPerMonth);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing &amp; Plans</h1>
          <p className="text-gray-500 mt-1">Manage your subscription, usage, and invoices.</p>
        </div>

        {feedback && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
              feedback.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* Current plan + period */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <CurrentPlanCard plan={currentPlan} subscription={subscription} />
          <UsageCard
            deploymentsUsed={deploymentsThisMonth}
            deploymentsLimit={currentPlan.features.deploymentsPerMonth}
            usagePct={usagePct}
            totalProjects={projects.length}
            teamMembers={1}
            teamMembersLimit={currentPlan.features.teamMembers}
          />
          <NextBillingCard subscription={subscription} currentPlan={currentPlan} />
        </div>

        {/* Plan comparison */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === subscription.planId}
                onSelect={handleSubscribe}
                loading={loading}
              />
            ))}
          </div>
        </section>

        {/* Invoice history */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invoice History</h2>
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
              No invoices yet. Invoices appear here after subscribing to a paid plan.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Invoice</th>
                    <th className="px-6 py-3 text-left">Plan</th>
                    <th className="px-6 py-3 text-left">Period</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500 text-xs">{inv.id.slice(0, 18)}&hellip;</td>
                      <td className="px-6 py-4 capitalize text-gray-800 font-medium">{inv.planId}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-semibold">
                        {formatPrice(inv.amount, inv.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CurrentPlanCard({ plan, subscription }: { plan: Plan; subscription: Subscription }) {
  const badgeColor: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-indigo-100 text-indigo-700",
    team: "bg-purple-100 text-purple-700",
    enterprise: "bg-yellow-100 text-yellow-800",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Current Plan</p>
      <div className="flex items-center gap-3 mb-3">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor[plan.id] ?? "bg-gray-100 text-gray-700"}`}>
          {plan.name}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          subscription.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {subscription.status}
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {formatPrice(plan.price, plan.currency)}
        {plan.price !== null && plan.price > 0 && (
          <span className="text-base font-normal text-gray-400"> / {plan.interval}</span>
        )}
      </p>
      <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
    </div>
  );
}

function UsageCard({
  deploymentsUsed,
  deploymentsLimit,
  usagePct,
  totalProjects,
  teamMembers,
  teamMembersLimit,
}: {
  deploymentsUsed: number;
  deploymentsLimit: number | null;
  usagePct: number;
  totalProjects: number;
  teamMembers: number;
  teamMembersLimit: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Usage This Month</p>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Deployments</span>
            <span className="font-medium text-gray-800">
              {deploymentsUsed} / {deploymentsLimit === null ? "∞" : deploymentsLimit}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-yellow-400" : "bg-indigo-500"}`}
              style={{ width: deploymentsLimit === null ? "0%" : `${usagePct}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Projects</span>
          <span className="font-medium text-gray-800">{totalProjects}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Team members</span>
          <span className="font-medium text-gray-800">
            {teamMembers} / {teamMembersLimit === null ? "∞" : teamMembersLimit}
          </span>
        </div>
      </div>
    </div>
  );
}

function NextBillingCard({ subscription, currentPlan }: { subscription: Subscription; currentPlan: Plan }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Billing Period</p>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-medium text-gray-800">Renews:</span>{" "}
        {formatDate(subscription.currentPeriodEnd)}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        <span className="font-medium text-gray-800">{daysLeft}</span> days remaining
      </p>
      {currentPlan.price !== null && currentPlan.price > 0 ? (
        <p className="text-2xl font-bold text-gray-900">
          {formatPrice(currentPlan.price, currentPlan.currency)}
          <span className="text-sm font-normal text-gray-400"> due</span>
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">No upcoming charge</p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onSelect,
  loading,
}: {
  plan: Plan;
  isCurrent: boolean;
  onSelect: (id: PlanId) => void;
  loading: boolean;
}) {
  const highlight = plan.id === "pro";
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
        isCurrent
          ? "border-indigo-400 bg-indigo-50 shadow-md"
          : highlight
          ? "border-indigo-300 bg-white shadow-lg"
          : "border-gray-100 bg-white shadow-sm hover:shadow-md"
      }`}
    >
      {highlight && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full shadow">
          Popular
        </span>
      )}
      <h3 className="text-base font-bold text-gray-800 mb-1">{plan.name}</h3>
      <p className="text-2xl font-extrabold text-gray-900 mb-1">
        {formatPrice(plan.price, plan.currency)}
        {plan.price !== null && plan.price > 0 && (
          <span className="text-xs font-normal text-gray-400"> /mo</span>
        )}
      </p>
      <p className="text-xs text-gray-500 mb-4">{plan.description}</p>

      <ul className="space-y-1.5 mb-5 flex-1 text-xs text-gray-600">
        <FeatureRow
          label={
            plan.features.deploymentsPerMonth === null
              ? "Unlimited deployments"
              : `${plan.features.deploymentsPerMonth} deployments / mo`
          }
          enabled
        />
        <FeatureRow label="Private projects" enabled={plan.features.privateProjects} />
        <FeatureRow
          label={
            plan.features.teamMembers === null
              ? "Unlimited team members"
              : `${plan.features.teamMembers} team member${plan.features.teamMembers === 1 ? "" : "s"}`
          }
          enabled
        />
        <FeatureRow label="Analytics" enabled={plan.features.analytics} />
        <FeatureRow label={`${SUPPORT_LABELS[plan.features.support]} support`} enabled />
      </ul>

      {isCurrent ? (
        <span className="text-center text-indigo-700 font-semibold text-sm py-2 border border-indigo-300 rounded-lg bg-indigo-50">
          Current plan
        </span>
      ) : (
        <button
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {plan.id === "enterprise" ? "Contact Sales" : "Switch"}
        </button>
      )}
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={enabled ? "text-green-500" : "text-gray-300"}>
        {enabled ? "✓" : "✗"}
      </span>
      <span className={enabled ? "" : "line-through text-gray-400"}>{label}</span>
    </li>
  );
}
