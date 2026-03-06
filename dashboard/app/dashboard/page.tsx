"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getUser } from "@/lib/auth";
import { getProjects, type Project } from "@/lib/projects";

const STACK_COLORS: Record<string, string> = {
  "React + TypeScript + Vite": "bg-blue-100 text-blue-800",
  "Node + Express + TypeScript": "bg-green-100 text-green-800",
  "Next.js": "bg-gray-100 text-gray-800",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "bg-purple-100 text-purple-800",
};

function stackBadge(stack: string) {
  return STACK_COLORS[stack] ?? "bg-yellow-100 text-yellow-800";
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    setProjects(getProjects());
  }, [router]);

  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");
  const stacks = [...new Set(projects.map((p) => p.stack))];
  const recent = [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user ? `, ${user.name}` : ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s an overview of your AutoDevStack projects.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <StatCard label="Total Projects" value={projects.length} icon="📁" color="indigo" />
          <StatCard label="Active Projects" value={active.length} icon="✅" color="green" />
          <StatCard label="Archived Projects" value={archived.length} icon="🗄️" color="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent projects */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Projects</h2>
              <Link
                href="/projects"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-gray-400 text-sm">No projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{p.createdAt}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${stackBadge(p.stack)}`}
                    >
                      {p.stack}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Stacks used */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Stacks Used</h2>
            {stacks.length === 0 ? (
              <p className="text-gray-400 text-sm">No stacks detected yet.</p>
            ) : (
              <ul className="space-y-2">
                {stacks.map((stack) => {
                  const count = projects.filter((p) => p.stack === stack).length;
                  return (
                    <li key={stack} className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${stackBadge(stack)}`}
                      >
                        {stack}
                      </span>
                      <span className="text-sm text-gray-500">
                        {count} project{count !== 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Quick action */}
        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900">Add a new project</h3>
            <p className="text-indigo-600 text-sm mt-0.5">
              Generated a new project with the CLI? Register it here.
            </p>
          </div>
          <Link
            href="/projects"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Go to Projects →
          </Link>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: "indigo" | "green" | "yellow";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    green: "bg-green-50 border-green-100 text-green-700",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
  };
  return (
    <div className={`rounded-2xl border p-6 ${colorMap[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}
