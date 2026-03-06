export interface Project {
  id: string;
  name: string;
  stack: string;
  createdAt: string;
  description: string;
  status: "active" | "archived";
}

const STORAGE_KEY = "autodevstack_projects";

const INITIAL_PROJECTS: Project[] = [
  {
    id: "1",
    name: "my-react-app",
    stack: "React + TypeScript + Vite",
    createdAt: "2025-01-15",
    description: "A React frontend with TypeScript and Vite bundler.",
    status: "active",
  },
  {
    id: "2",
    name: "api-server",
    stack: "Node + Express + TypeScript",
    createdAt: "2025-02-03",
    description: "REST API built with Express and TypeScript.",
    status: "active",
  },
  {
    id: "3",
    name: "portfolio-site",
    stack: "Next.js",
    createdAt: "2025-02-20",
    description: "Personal portfolio built with Next.js.",
    status: "active",
  },
];

export function getProjects(): Project[] {
  if (typeof window === "undefined") return INITIAL_PROJECTS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PROJECTS));
    return INITIAL_PROJECTS;
  }
  return JSON.parse(stored) as Project[];
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function addProject(project: Omit<Project, "id" | "createdAt">): Project {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
    createdAt: new Date().toISOString().split("T")[0],
  };
  saveProjects([...projects, newProject]);
  return newProject;
}

export function deleteProject(id: string): void {
  const projects = getProjects();
  saveProjects(projects.filter((p) => p.id !== id));
}
