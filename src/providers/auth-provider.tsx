"use client";

/* ================================================================
   AUTH PROVIDER — React context for auth state
   ================================================================
   Wraps children with auth context. Loads session on mount via
   useSyncExternalStore pattern to avoid setState-in-effect lint.
   ================================================================ */

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { User, Org } from "@/lib/mock-data";
import {
  getSession,
  getCurrentUser as storeGetCurrentUser,
  createSession,
  logout as storeLogout,
  findUserByEmail,
  addUser,
  addOrg,
  getOrg,
  updateUser,
} from "@/lib/auth-store";

/* ---------- Context Shape ---------- */

interface AuthContextValue {
  user: User | null;
  org: Org | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => { success: boolean; error?: string };
  signup: (data: { email: string; name: string; orgName: string; orgType: "individual" | "company"; jurisdiction: string }) => { success: boolean; error?: string };
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ---------- External store for auth state ---------- */

type AuthSnapshot = { user: User | null; org: Org | null };

let listeners: Array<() => void> = [];
let snapshot: AuthSnapshot = { user: null, org: null };

function emitChange() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => { listeners = listeners.filter((l) => l !== listener); };
}

function getSnapshot(): AuthSnapshot {
  return snapshot;
}

const serverSnapshot: AuthSnapshot = { user: null, org: null };
function getServerSnapshot(): AuthSnapshot {
  return serverSnapshot;
}

/** Re-read session from localStorage and update snapshot */
function syncFromStorage() {
  const session = getSession();
  if (session) {
    const u = storeGetCurrentUser();
    if (u) {
      snapshot = { user: u, org: getOrg(u.orgId) };
      emitChange();
      return;
    }
  }
  snapshot = { user: null, org: null };
  emitChange();
}

// Auto-init on first client load
let initialized = false;
function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  syncFromStorage();
}

/* ---------- Provider ---------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  ensureInit();
  const authState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = authState.user;
  const org = authState.org;
  const isAuthenticated = !!user;
  // We consider loading=false because synchronous localStorage read
  // happens before first render via ensureInit()
  const isLoading = typeof window === "undefined";

  const refreshUser = useCallback(() => {
    syncFromStorage();
  }, []);

  const login = useCallback((email: string): { success: boolean; error?: string } => {
    const u = findUserByEmail(email);
    if (!u) return { success: false, error: "No account found for this email address." };
    createSession(u.id);
    updateUser(u.id, { lastLoginAt: new Date().toISOString() });
    syncFromStorage();
    return { success: true };
  }, []);

  const signup = useCallback((data: {
    email: string;
    name: string;
    orgName: string;
    orgType: "individual" | "company";
    jurisdiction: string;
  }): { success: boolean; error?: string } => {
    if (findUserByEmail(data.email)) {
      return { success: false, error: "An account with this email already exists." };
    }

    const now = new Date().toISOString();
    const orgId = `org-${Date.now()}`;
    const userId = `user-${Date.now()}`;

    const newOrg: Org = {
      id: orgId,
      legalName: data.orgName,
      type: data.orgType,
      jurisdiction: data.jurisdiction,
      createdAt: now,
    };
    addOrg(newOrg);

    const newUser: User = {
      id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name,
      role: "buyer",
      orgId,
      verificationStatus: "NOT_STARTED",
      createdAt: now,
      lastLoginAt: now,
    };
    addUser(newUser);
    createSession(userId);
    syncFromStorage();
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    storeLogout();
    snapshot = { user: null, org: null };
    emitChange();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ---------- Hook ---------- */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
