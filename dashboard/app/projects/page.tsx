"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUser } from "@/lib/auth";
import {
  getProjects,
  addProject,
  deleteProject,
  type Project,
} from "@/lib/projects";

const STACKS = [
  "React + TypeScript + Vite",
  "Node + Express + TypeScript",
  "Next.js",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)",
];

const STACK_COLORS: Record<string, string> = {
  "React + TypeScript + Vite": "bg-blue-100 text-blue-800",
  "Node + Express + TypeScript": "bg-green-100 text-green-800",
  "Next.js": "bg-gray-100 text-gray-800",
  "T3 Stack (Next.js + Tailwind + tRPC + Prisma)": "bg-purple-100 text-purple-800",
};

function stackBadge(stack: string) {
  return STACK_COLORS[stack] ?? "bg-yellow-100 text-yellow-800";
}

const EMPTY_FORM = { name: "", stack: STACKS[0], description: "", status: "active" as const };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!getUser()) {
      router.push("/login");
      return;
    }
    setProjects(getProjects());
  }, [router]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addProject({ name: form.name.trim(), stack: form.stack, description: form.description.trim(), status: form.status });
    setProjects(getProjects());
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteProject(id);
    setProjects(getProjects());
    setDeleteId(null);
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.stack.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 mt-1">
              {projects.length} project{projects.length !== 1 ? "s" : ""} generated with AutoDevStack
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            {showForm ? "Cancel" : "+ Add Project"}
          </button>
        </div>

        {/* Add project form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-5">New Project</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="my-awesome-project"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stack
                </label>
                <select
                  value={form.stack}
                  onChange={(e) => setForm({ ...form, stack: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STACKS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description (optional)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Add Project
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or stack…"
            className="w-full sm:w-80 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Project list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="text-5xl">📂</span>
            <p className="mt-4 text-lg font-medium">No projects found</p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term." : "Add your first project above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => setDeleteId(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Confirm delete modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete project?</h3>
            <p className="text-gray-500 text-sm mb-6">
              This will remove the project from your dashboard. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: () => void;
}) {
  const badge = stackBadge(project.stack);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 break-all">{project.name}</h3>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
        )}
        <span className={`inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full ${badge}`}>
          {project.stack}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Created {project.createdAt}</span>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 transition-colors font-medium"
          aria-label={`Delete ${project.name}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
