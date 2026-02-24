/* ================================================================
   AUTHZ — Server-side Authorization Helpers
   ================================================================
   Policy helpers for use in API routes and Server Actions.
   Each helper validates the current session and enforces role or
   capability requirements. Falls back to mock auth when Clerk
   is not configured.

   Usage in server actions / API routes:
     const session = await requireSession();
     const buyer   = await requireBuyer();
     const cap     = await requireComplianceCapability("LOCK_PRICE");
   ================================================================ */

import { auth, currentUser } from "@clerk/nextjs/server";

/* ── Types ── */

export type UserRole =
  | "admin"
  | "buyer"
  | "seller"
  | "treasury"
  | "compliance"
  | "vault_ops";

/**
 * Compliance capabilities — ordered by privilege escalation.
 * Each capability implies all previous capabilities.
 */
export type ComplianceCapability =
  | "BROWSE"
  | "QUOTE"
  | "LOCK_PRICE"
  | "EXECUTE_PURCHASE"
  | "SETTLE";

/** The ordered capability ladder */
const CAPABILITY_LADDER: ComplianceCapability[] = [
  "BROWSE",
  "QUOTE",
  "LOCK_PRICE",
  "EXECUTE_PURCHASE",
  "SETTLE",
];

/** Map KYC status → maximum capability granted */
const KYC_CAPABILITY_MAP: Record<string, ComplianceCapability> = {
  NOT_STARTED: "BROWSE",
  PENDING: "BROWSE",
  DOCUMENTS_REQUIRED: "BROWSE",
  IN_REVIEW: "QUOTE",
  APPROVED: "SETTLE", // Full access
  REJECTED: "BROWSE",
};

/** Clerk org role → AurumShield role */
const CLERK_ROLE_MAP: Record<string, UserRole> = {
  "org:admin": "admin",
  "org:buyer": "buyer",
  "org:seller": "seller",
  "org:treasury": "treasury",
  "org:compliance": "compliance",
  "org:vault_ops": "vault_ops",
};

/* ── Check if Clerk is configured ── */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/* ================================================================
   SESSION HELPERS
   ================================================================ */

export interface AuthSession {
  userId: string;
  role: UserRole;
  kycStatus: string;
  orgId: string | null;
  email: string | null;
}

/**
 * Require a valid authenticated session.
 * Throws 401 if no session exists.
 */
export async function requireSession(): Promise<AuthSession> {
  if (!CLERK_ENABLED) {
    // Demo mode — return a mock session for server-side checks.
    // In demo mode, actual auth is handled client-side by auth-provider.
    return {
      userId: "demo-user",
      role: "buyer",
      kycStatus: "APPROVED",
      orgId: null,
      email: "demo@aurumshield.io",
    };
  }

  const { userId, orgRole, orgId } = await auth();

  if (!userId) {
    throw new AuthError(401, "Authentication required");
  }

  // Resolve role from org membership
  const role: UserRole = orgRole
    ? (CLERK_ROLE_MAP[orgRole] ?? "buyer")
    : "buyer";

  // Get KYC status from user's public metadata
  const user = await currentUser();
  const kycStatus =
    (user?.publicMetadata?.kycStatus as string) ?? "NOT_STARTED";

  return {
    userId,
    role,
    kycStatus,
    orgId: orgId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  };
}

/* ================================================================
   ROLE HELPERS
   ================================================================ */

/**
 * Require a specific role. Throws 403 if the user's role doesn't match.
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthSession> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(
      403,
      `Forbidden: requires role ${allowedRoles.join(" | ")}, got ${session.role}`,
    );
  }
  return session;
}

/** Convenience: require buyer role */
export async function requireBuyer(): Promise<AuthSession> {
  return requireRole("buyer");
}

/** Convenience: require seller role */
export async function requireSeller(): Promise<AuthSession> {
  return requireRole("seller");
}

/** Convenience: require admin role */
export async function requireAdmin(): Promise<AuthSession> {
  return requireRole("admin", "treasury", "compliance", "vault_ops");
}

/* ================================================================
   COMPLIANCE CAPABILITY HELPERS
   ================================================================ */

/**
 * Require a compliance capability. This is based on the user's KYC
 * status — not their role. A buyer with APPROVED KYC has full
 * capability; a buyer with PENDING KYC can only BROWSE.
 *
 * Capabilities are hierarchical: requiring LOCK_PRICE implies
 * the user also has BROWSE and QUOTE.
 *
 * Throws 403 if the user's KYC status doesn't grant the capability.
 */
export async function requireComplianceCapability(
  capability: ComplianceCapability,
): Promise<AuthSession> {
  const session = await requireSession();

  const maxCapability =
    KYC_CAPABILITY_MAP[session.kycStatus] ?? "BROWSE";
  const maxIndex = CAPABILITY_LADDER.indexOf(maxCapability);
  const requiredIndex = CAPABILITY_LADDER.indexOf(capability);

  if (requiredIndex > maxIndex) {
    throw new AuthError(
      403,
      `Compliance gate: capability "${capability}" requires KYC status beyond "${session.kycStatus}". ` +
        `Current max capability: "${maxCapability}".`,
    );
  }

  return session;
}

/* ================================================================
   ERROR CLASS
   ================================================================ */

/**
 * Structured auth error that API routes can catch and convert
 * to an appropriate HTTP response.
 */
export class AuthError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Helper to convert AuthError to a NextResponse-compatible object.
 * Usage in API routes:
 *   try { await requireSession(); }
 *   catch (e) { return authErrorResponse(e); }
 */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  // Re-throw non-auth errors
  throw error;
}
