import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

// ─── Rate limiter ────────────────────────────────────────────────────────────
// FIX H-3: sessionStorage persists across page refreshes within the same tab.
// Module-level vars (original code) reset to 0 on every F5 — making lockout useless.
const RATE_LIMIT      = { maxAttempts: 5, windowMs: 10 * 60 * 1000 } as const;
const SS_KEY_COUNT    = "sb_login_attempts";
const SS_KEY_LOCKED   = "sb_login_locked_until";

function getAttemptCount(): number {
  return parseInt(sessionStorage.getItem(SS_KEY_COUNT) ?? "0", 10);
}
function getLockedUntil(): number {
  return parseInt(sessionStorage.getItem(SS_KEY_LOCKED) ?? "0", 10);
}
function recordFailedAttempt(): string {
  const count = getAttemptCount() + 1;
  sessionStorage.setItem(SS_KEY_COUNT, String(count));
  if (count >= RATE_LIMIT.maxAttempts) {
    const lockedUntil = Date.now() + RATE_LIMIT.windowMs;
    sessionStorage.setItem(SS_KEY_LOCKED, String(lockedUntil));
    sessionStorage.setItem(SS_KEY_COUNT, "0");
    return "Too many failed attempts. Login blocked for 10 minutes.";
  }
  const left = RATE_LIMIT.maxAttempts - count;
  return `Invalid email or password. ${left} attempt(s) remaining before lockout.`;
}
function resetRateLimit() {
  sessionStorage.removeItem(SS_KEY_COUNT);
  sessionStorage.removeItem(SS_KEY_LOCKED);
}

// ─── Role helper ─────────────────────────────────────────────────────────────
async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);
  const [userEmail, setUserEmail]             = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const admin = await fetchIsAdmin(session.user.id);
        if (admin) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email ?? null);
        } else {
          await supabase.auth.signOut();
        }
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setIsAuthenticated(false);
          setUserEmail(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {

    const now = Date.now();
    const lockedUntil = getLockedUntil();
    if (lockedUntil > now) {
      const mins = Math.ceil((lockedUntil - now) / 60_000);
      return { ok: false, error: `Login blocked. Try again in ${mins} minute(s).` };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { ok: false, error: recordFailedAttempt() };
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { ok: false, error: "Please verify your email address before logging in." };
    }

    const admin = await fetchIsAdmin(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      recordFailedAttempt();
      return { ok: false, error: "Access denied. This account does not have admin privileges." };
    }

    resetRateLimit();
    setIsAuthenticated(true);
    setUserEmail(data.user.email ?? null);
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, userEmail, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
