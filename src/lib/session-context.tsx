"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type AuthRole = "Admin" | "Staff";
export type AuthenticatedUser = {
  userId: number;
  name: string;
  email: string;
  role: AuthRole;
};
export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type SessionContextValue = {
  user: AuthenticatedUser | null;
  status: SessionStatus;
  refreshSession: () => Promise<void>;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.userId === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "Admin" || candidate.role === "Staff");
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object") {
        setUser(null);
        setStatus("error");
        return;
      }

      const result = payload as { success?: unknown; user?: unknown };
      if (result.success !== true) {
        setUser(null);
        setStatus("error");
        return;
      }
      if (result.user === null) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      if (!isAuthenticatedUser(result.user)) {
        setUser(null);
        setStatus("error");
        return;
      }

      setUser(result.user);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const check = window.setTimeout(() => { void refreshSession(); }, 0);
    return () => window.clearTimeout(check);
  }, [refreshSession]);

  const setAuthenticatedUser = useCallback((nextUser: AuthenticatedUser) => {
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object" || (payload as { success?: unknown }).success !== true) {
      throw new Error("Sign out could not be completed. Please try again.");
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return <SessionContext.Provider value={{ user, status, refreshSession, setAuthenticatedUser, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider.");
  return value;
}
