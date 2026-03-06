"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout, getUser } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname === href
          ? "bg-indigo-700 text-white"
          : "text-indigo-100 hover:bg-indigo-600 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-indigo-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg tracking-tight">
              🚀 AutoDevStack
            </span>
            <div className="ml-6 flex items-center gap-1">
              {navLink("/dashboard", "Dashboard")}
              {navLink("/projects", "Projects")}
              {navLink("/billing", "Billing")}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-indigo-200 text-sm hidden sm:block">
                {user.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-indigo-100 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
