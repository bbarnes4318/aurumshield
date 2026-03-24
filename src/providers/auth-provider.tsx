"use client";

/* ================================================================
   AUTH PROVIDER — Unified auth context (Clerk + Demo fallback)
   ================================================================
   This provider implements the Adapter Pattern:

   1. When Clerk is configured (valid publishable key) AND user is
      on a Clerk-protected route, identity is sourced EXCLUSIVELY
      from Clerk's session and organization membership. Roles map
      from Clerk org roles to the application's UserRole type.
      ⚠️  Demo/mock identity is NEVER consulted in this path.

   2. When on a bypass route (demo, marketing, dev) OR when Clerk
      is not configured, the provider falls back to MockAuthProvider
      which uses localStorage-backed mock auth for demo scenarios.
      ⚠️  Mock identity is NOT authoritative for protected server
      actions. Server actions independently verify via authz.ts.

   3. The exported useAuth() hook and AuthContextValue interface
      remain identical — all 25+ consumer components work unchanged.
      The `authSource` field indicates whether identity is
      Clerk-verified ("clerk") or mock ("mock").

   Key assumptions:
   - Clerk Organization roles map to UserRole via CLERK_ROLE_MAP
   - Default role for users without an org membership is "buyer"
   - The User and Org types are extended with Clerk IDs when sourced
     from Clerk, but maintain backward compatibility with mock data
   ================================================================ */

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth-mode";
import type { User, Org, UserRole } from "@/lib/mock-data";
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

/* ---------- Clerk Role Mapping ---------- */

/**
 * Maps Clerk Organization role slugs to AurumShield UserRole.
 * Configure these in your Clerk Dashboard → Organizations → Roles.
 *
 * Expected Clerk org roles:
 *   org:admin     → admin
 *   org:buyer     → buyer
 *   org:seller    → seller
 *   org:treasury  → treasury
 *   org:compliance → compliance
 *   org:vault_ops → vault_ops
 */
const CLERK_ROLE_MAP: Record<string, UserRole> = {
  "org:admin": "admin",
  "org:buyer": "buyer",
  "org:seller": "seller",
  "org:treasury": "treasury",
  "org:compliance": "compliance",
  "org:vault_ops": "vault_ops",
  "org:broker": "BROKER",
};

const DEFAULT_ROLE: UserRole = "buyer";

/** Check if Clerk is configured with real (non-placeholder) keys.
 *  Delegates to centralized auth-mode.ts.
 *  ⚠️  This is a client-side check. Server-side callers should use
 *  isProductionAuth() from auth-mode.ts instead.
 */
const clerkReady = isClerkConfigured();

/* ---------- Context Shape ---------- */

interface AuthContextValue {
  user: User | null;
  org: Org | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Source of the current identity:
   * - "clerk" = Clerk-verified session (authoritative for protected actions)
   * - "mock" = localStorage-backed demo/dev session (NOT authoritative)
   * - "loading" = session is still resolving
   */
  authSource: "clerk" | "mock" | "loading";
  login: (email: string) => { success: boolean; error?: string };
  signup: (data: {
    email: string;
    name: string;
    orgName: string;
    orgType: "individual" | "company";
    jurisdiction: string;
  }) => { success: boolean; error?: string };
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ================================================================
   MOCK AUTH — External store for demo/fallback mode
   ================================================================ */

type AuthSnapshot = { user: User | null; org: Org | null };

let listeners: Array<() => void> = [];
let snapshot: AuthSnapshot = { user: null, org: null };

function emitChange() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
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

/* ================================================================
   AUTH PROVIDER — Dual-mode (Clerk primary, mock fallback)
   ================================================================ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // ── Routes where Clerk hooks should NOT be called ──
  // ClerkProvider is always mounted (see clerk-wrapper.tsx), but on
  // marketing-domain routes the middleware does NOT run clerkMiddleware,
  // so Clerk's internal session state is uninitialized. Calling useUser()
  // or useOrganization() on those routes would return empty/undefined data
  // or throw. We use MockAuthProvider for these instead.
  //
  // Auth pages (/login, /signup, /forgot-password) are NOT bypassed —
  // the middleware runs clerkMiddleware on them so Clerk hooks work.
  const BYPASS_PREFIXES = [
    "/demo",
    "/platform-overview",
    "/technical-overview",
    "/legal",
    "/investor-brief",
    "/dev",
  ];
  const isBypassRoute =
    pathname === "/" ||
    BYPASS_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );

  if (clerkReady && !isBypassRoute) {
    return <ClerkAuthAdapter>{children}</ClerkAuthAdapter>;
  }

  return <MockAuthProvider>{children}</MockAuthProvider>;
}

/* ---------- Clerk Auth Adapter ----------
 * ⚠️  TRUST BOUNDARY: When this adapter is active, identity is
 * sourced EXCLUSIVELY from Clerk. Demo/mock store is NOT consulted.
 * This prevents localStorage-backed mock users from shadowing
 * real Clerk sessions.
 */

function ClerkAuthAdapter({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { organization, membership } = useOrganization();

  // Map Clerk user → AurumShield User
  const user: User | null = useMemo(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null;

    // Derive role from Clerk org membership
    const orgRole = membership?.role ?? "";
    const role: UserRole = CLERK_ROLE_MAP[orgRole] ?? DEFAULT_ROLE;

    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        "User",
      role,
      orgId: organization?.id ?? `clerk-org-${clerkUser.id}`,
      verificationStatus:
        clerkUser.primaryEmailAddress?.verification?.status === "verified"
          ? ("VERIFIED" as const)
          : ("NOT_STARTED" as const),
      createdAt: clerkUser.createdAt?.toISOString() ?? new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt?.toISOString() ?? null,
    };
  }, [
    isLoaded,
    isSignedIn,
    clerkUser,
    organization,
    membership,
  ]);

  // Map Clerk org → AurumShield Org
  const org: Org | null = useMemo(() => {
    if (!organization) return null;

    return {
      id: organization.id,
      legalName: organization.name,
      type: "company" as const,
      jurisdiction: "", // TODO: Map from org metadata if needed
      createdAt:
        organization.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }, [organization]);

  const isAuthenticated = !!user;
  const isLoading = !isLoaded;
  const authSource = isLoading ? "loading" as const : "clerk" as const;

  // Clerk adapter does NOT support mock login/signup.
  // Sign-in/sign-up must go through Clerk's flows.
  const login = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_email: string): { success: boolean; error?: string } => {
      return {
        success: false,
        error: "Please use Clerk sign-in for real accounts.",
      };
    },
    [],
  );

  const signup = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_data: {
      email: string;
      name: string;
      orgName: string;
      orgType: "individual" | "company";
      jurisdiction: string;
    }): { success: boolean; error?: string } => {
      return {
        success: false,
        error: "Please use the sign-up form to create an account.",
      };
    },
    [],
  );

  const logout = useCallback(() => {
    // Clerk sign-out is handled by Clerk's UserButton component.
    // No mock store interaction in this adapter.
  }, []);

  const refreshUser = useCallback(() => {
    // Clerk handles session refresh automatically.
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        isAuthenticated,
        isLoading,
        authSource,
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

/* ---------- Mock Auth Provider (⚠️ Demo / Clerk-not-configured) ----------
 * Identity from this provider is NOT authoritative for protected
 * server actions. Server actions independently verify via authz.ts.
 */

function MockAuthProvider({ children }: { children: ReactNode }) {
  ensureInit();
  const authState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const user = authState.user;
  const org = authState.org;
  const isAuthenticated = !!user;
  // We consider loading=false because synchronous localStorage read
  // happens before first render via ensureInit()
  const isLoading = typeof window === "undefined";
  const authSource = "mock" as const;

  const refreshUser = useCallback(() => {
    syncFromStorage();
  }, []);

  const login = useCallback(
    (email: string): { success: boolean; error?: string } => {
      const u = findUserByEmail(email);
      if (!u)
        return {
          success: false,
          error: "No account found for this email address.",
        };
      createSession(u.id);
      updateUser(u.id, { lastLoginAt: new Date().toISOString() });
      syncFromStorage();
      return { success: true };
    },
    [],
  );

  const signup = useCallback(
    (data: {
      email: string;
      name: string;
      orgName: string;
      orgType: "individual" | "company";
      jurisdiction: string;
    }): { success: boolean; error?: string } => {
      if (findUserByEmail(data.email)) {
        return {
          success: false,
          error: "An account with this email already exists.",
        };
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
    },
    [],
  );

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
        authSource,
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
