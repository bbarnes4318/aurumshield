/* ================================================================
   AUTHZ — Server-side Authorization Helpers
   ================================================================
   Policy helpers for use in API routes and Server Actions.
   Each helper validates the current session and enforces role or
   capability requirements. Falls back to mock auth when Clerk
   is not configured.

   Institutional Role Model:
     INSTITUTION_TRADER    — Executes trades on behalf of an institution
     INSTITUTION_TREASURY  — Manages settlement & capital for institution
     BROKER_DEALER_API     — Programmatic API access for broker-dealers
     admin / compliance / vault_ops — Internal platform roles (unchanged)

   LEI Enforcement:
     All institutional and broker-dealer roles MUST have a valid LEI
     (Legal Entity Identifier) in their organization metadata.
     Operations are blocked if LEI is missing or invalid.

   Usage in server actions / API routes:
     const session = await requireSession();
     const trader  = await requireRole("INSTITUTION_TRADER");
     const cap     = await requireComplianceCapability("LOCK_PRICE");
   ================================================================ */

import { auth, currentUser } from "@clerk/nextjs/server";

/* ── Types ── */

export type UserRole =
  | "admin"
  | "INSTITUTION_TRADER"
  | "INSTITUTION_TREASURY"
  | "BROKER_DEALER_API"
  | "compliance"
  | "vault_ops"
  // Legacy aliases — retained for backward compatibility during UI migration
  | "buyer"
  | "seller"
  | "treasury";

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
  UNDER_REVIEW: "BROWSE",  // Parallel engagement may elevate within BROWSE
  APPROVED: "SETTLE", // Full access
  REJECTED: "BROWSE",
};

/**
 * RSK-012: Capabilities that MUST be verified against the DB compliance
 * case. These gate financial execution and cannot fall back to the stale
 * JWT KYC_CAPABILITY_MAP. If the DB is unreachable, access is DENIED.
 */
const PROTECTED_CAPABILITIES: ReadonlySet<ComplianceCapability> = new Set([
  "LOCK_PRICE",
  "EXECUTE_PURCHASE",
  "SETTLE",
]);

/** Clerk org role → AurumShield role */
const CLERK_ROLE_MAP: Record<string, UserRole> = {
  "org:admin": "admin",
  "org:institution_trader": "INSTITUTION_TRADER",
  "org:institution_treasury": "INSTITUTION_TREASURY",
  "org:broker_dealer_api": "BROKER_DEALER_API",
  "org:compliance": "compliance",
  "org:vault_ops": "vault_ops",
  // Legacy mappings for backward compatibility during transition
  "org:buyer": "INSTITUTION_TRADER",
  "org:seller": "INSTITUTION_TRADER",
  "org:treasury": "INSTITUTION_TREASURY",
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
  /** LEI code from organization metadata (required for institutional roles) */
  leiCode: string | null;
}

/**
 * Require a valid authenticated session.
 * Throws 401 if no session exists.
 */
export async function requireSession(): Promise<AuthSession> {
  if (!CLERK_ENABLED) {
    // Demo mode — return a mock session for server-side checks.
    return {
      userId: "demo-user",
      role: "INSTITUTION_TRADER",
      kycStatus: "APPROVED",
      orgId: null,
      email: "demo@aurumshield.io",
      leiCode: "MOCK00DEMO00LEI00001",
    };
  }

  const { userId, orgRole, orgId } = await auth();

  if (!userId) {
    throw new AuthError(401, "Authentication required");
  }

  // Resolve role from org membership
  const role: UserRole = orgRole
    ? (CLERK_ROLE_MAP[orgRole] ?? "INSTITUTION_TRADER")
    : "INSTITUTION_TRADER";

  // Get KYC status and LEI from user/org metadata
  const user = await currentUser();
  const kycStatus =
    (user?.publicMetadata?.kycStatus as string) ?? "NOT_STARTED";
  const leiCode =
    (user?.publicMetadata?.leiCode as string) ?? null;

  return {
    userId,
    role,
    kycStatus,
    orgId: orgId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    leiCode,
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

/** Convenience: require institution trader role */
export async function requireTrader(): Promise<AuthSession> {
  return requireRole("INSTITUTION_TRADER");
}

/** Convenience: require institution treasury role */
export async function requireTreasury(): Promise<AuthSession> {
  return requireRole("INSTITUTION_TREASURY");
}

/** Convenience: require admin role */
export async function requireAdmin(): Promise<AuthSession> {
  return requireRole("admin", "INSTITUTION_TREASURY", "compliance", "vault_ops");
}

/**
 * Require a valid LEI code on the session.
 * All institutional and broker-dealer operations MUST have an LEI.
 * Blocks execution if LEI is missing.
 */
export async function requireLEI(): Promise<AuthSession> {
  const session = await requireSession();
  if (!session.leiCode) {
    throw new AuthError(
      403,
      `LEI_REQUIRED: A valid Legal Entity Identifier (LEI) is required for this operation. ` +
        `No LEI found in organization metadata for user ${session.userId}. ` +
        `Contact your compliance officer to register an LEI via GLEIF.`,
    );
  }
  return session;
}

/** @deprecated Use requireTrader() */
export async function requireBuyer(): Promise<AuthSession> {
  return requireTrader();
}

/** @deprecated Use requireTrader() */
export async function requireSeller(): Promise<AuthSession> {
  return requireTrader();
}

/* ================================================================
   COMPLIANCE CAPABILITY HELPERS
   ================================================================ */

/**
 * Require a compliance capability.
 *
 * RSK-012 — FAIL-CLOSED ENFORCEMENT:
 *
 *   Protected capabilities (LOCK_PRICE, EXECUTE_PURCHASE, SETTLE)
 *   REQUIRE a DB-verified APPROVED compliance case. If the database
 *   is unreachable, execution halts with a 500. If no APPROVED case
 *   exists, a 403 is thrown. The stale JWT KYC_CAPABILITY_MAP is
 *   NEVER consulted for these capabilities.
 *
 *   Low-privilege capabilities (BROWSE, QUOTE) may still fall back
 *   to the KYC_CAPABILITY_MAP for convenience, since they cannot
 *   initiate financial execution.
 *
 * Capabilities are hierarchical: requiring LOCK_PRICE implies
 * the user also has BROWSE and QUOTE.
 *
 * Throws:
 *   - 500 if DB is unreachable and a protected capability is requested
 *   - 403 if the user lacks the required capability
 */
export async function requireComplianceCapability(
  capability: ComplianceCapability,
): Promise<AuthSession> {
  const session = await requireSession();

  const requiredIndex = CAPABILITY_LADDER.indexOf(capability);

  // Protected capabilities that gate financial execution
  const isProtected = PROTECTED_CAPABILITIES.has(capability);

  if (isProtected) {
    // ── RSK-012: Strict DB-only path — no JWT fallback ──
    // DB errors MUST bubble (500). No try/catch.
    const { getComplianceCaseByUserId } =
      await import("@/lib/compliance/models");
    const { TIER_TO_CAPABILITY_MAP } = await import("@/lib/compliance/tiering");
    const cc = await getComplianceCaseByUserId(session.userId);

    if (!cc || !TIER_TO_CAPABILITY_MAP[cc.tier]) {
      // Parallel Engagement: UNDER_REVIEW with parallel_engagement_enabled
      // allows BROWSE access for mock checkouts, but not protected capabilities
      if (cc && cc.status === "UNDER_REVIEW") {
        throw new AuthError(
          403,
          `COMPLIANCE_UNDER_REVIEW: Capability "${capability}" is pending compliance review. ` +
            `Your application is being processed. You may browse and access indicative pricing.`,
        );
      }

      throw new AuthError(
        403,
        `COMPLIANCE_DENIED: Capability "${capability}" requires an APPROVED compliance case. ` +
          `No valid compliance record found for user ${session.userId}.`,
      );
    }

    if (cc.status !== "APPROVED") {
      throw new AuthError(
        403,
        `COMPLIANCE_NOT_APPROVED: Capability "${capability}" requires APPROVED status. ` +
          `Current status: ${cc.status} for user ${session.userId}.`,
      );
    }

    const maxCapability = TIER_TO_CAPABILITY_MAP[cc.tier];
    const maxIndex = CAPABILITY_LADDER.indexOf(maxCapability);

    if (requiredIndex > maxIndex) {
      throw new AuthError(
        403,
        `COMPLIANCE_TIER_INSUFFICIENT: Capability "${capability}" requires tier above current. ` +
          `Current max: "${maxCapability}" (tier: ${cc.tier}).`,
      );
    }

    return session;
  }

  // ── Low-privilege path (BROWSE, QUOTE) — KYC fallback is acceptable ──
  let maxCapability: ComplianceCapability =
    KYC_CAPABILITY_MAP[session.kycStatus] ?? "BROWSE";

  try {
    const { getComplianceCaseByUserId } =
      await import("@/lib/compliance/models");
    const { TIER_TO_CAPABILITY_MAP } = await import("@/lib/compliance/tiering");
    const cc = await getComplianceCaseByUserId(session.userId);

    if (cc && cc.status === "APPROVED" && TIER_TO_CAPABILITY_MAP[cc.tier]) {
      maxCapability = TIER_TO_CAPABILITY_MAP[cc.tier];
    }
  } catch {
    // Non-fatal for BROWSE/QUOTE: fall back to KYC_CAPABILITY_MAP
    console.warn(
      "[AUTHZ] ComplianceCase lookup failed for low-privilege capability, using KYC fallback",
    );
  }

  const maxIndex = CAPABILITY_LADDER.indexOf(maxCapability);

  if (requiredIndex > maxIndex) {
    throw new AuthError(
      403,
      `Compliance gate: capability "${capability}" requires verification beyond current level. ` +
        `Current max capability: "${maxCapability}".`,
    );
  }

  return session;
}

/* ================================================================
   STEP-UP AUTHENTICATION (RE-VERIFICATION)
   ================================================================ */

/**
 * Capabilities that require step-up authentication (re-verification).
 * These represent high-value, irreversible operations.
 */
const REVERIFICATION_CAPABILITIES: Set<ComplianceCapability> = new Set([
  "LOCK_PRICE",
  "EXECUTE_PURCHASE",
  "SETTLE",
]);

/**
 * Check whether a given capability requires step-up re-verification.
 */
export function requiresReverification(
  capability: ComplianceCapability,
): boolean {
  return REVERIFICATION_CAPABILITIES.has(capability);
}

/**
 * Maximum age (in milliseconds) for a session to be considered
 * "recently verified". Sessions older than this require step-up auth.
 *
 * Default: 5 minutes (300,000 ms).
 */
const REVERIFICATION_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Server-side check that the current session was recently verified.
 *
 * In Clerk mode:
 *   Checks `session.lastActiveAt` or the custom `reverifiedAt` claim.
 *   If the session is older than REVERIFICATION_MAX_AGE_MS, throws
 *   AuthError(403, "REVERIFICATION_REQUIRED").
 *
 * In demo mode:
 *   Always passes (no re-verification needed).
 *
 * @throws AuthError with message "REVERIFICATION_REQUIRED" if step-up is needed
 */
export async function requireReverification(): Promise<void> {
  if (!CLERK_ENABLED) {
    // Demo mode — skip reverification
    return;
  }

  try {
    const { sessionClaims } = await auth();

    // Check for a custom reverifiedAt claim (set by Clerk after re-auth)
    const reverifiedAt = sessionClaims?.reverifiedAt as number | undefined;
    if (reverifiedAt) {
      const age = Date.now() - reverifiedAt;
      if (age <= REVERIFICATION_MAX_AGE_MS) return;
    }

    // Fallback: check Clerk's session `iat` (issued-at)
    const iat = sessionClaims?.iat as number | undefined;
    if (iat) {
      const age = Date.now() - iat * 1000;
      if (age <= REVERIFICATION_MAX_AGE_MS) return;
    }
  } catch {
    // If Clerk auth() fails, require reverification
  }

  throw new AuthError(403, "REVERIFICATION_REQUIRED");
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Re-throw non-auth errors
  throw error;
}
