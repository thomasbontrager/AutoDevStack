const AUTH_KEY = "autodevstack_auth";

// ⚠️  MOCK ONLY — these credentials are for local development demonstration purposes.
// Replace this entire module with a real authentication provider (e.g. NextAuth.js,
// Clerk, or your own API) before deploying to any shared or production environment.
const MOCK_USER = {
  email: process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "admin@example.com",
  password: process.env.DEMO_PASSWORD ?? "password",
  name: "Admin User",
};

export interface AuthUser {
  email: string;
  name: string;
}

export function login(email: string, password: string): AuthUser | null {
  if (email === MOCK_USER.email && password === MOCK_USER.password) {
    const user: AuthUser = { email: MOCK_USER.email, name: MOCK_USER.name };
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }
    return user;
  }
  return null;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as AuthUser;
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
