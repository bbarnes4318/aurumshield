"use client";

/* ================================================================
   CLERK WRAPPER — Dual-mode (Real Clerk + Demo fallback)
   ================================================================
   When Clerk is configured with valid publishable key AND the
   current route is NOT a demo route:
   - Wraps the app in ClerkProvider (passkeys, OAuth, MFA, etc.)
   - Sets canonical auth URLs and post-auth redirect targets

   When Clerk is NOT configured OR route is a demo route:
   - Renders children directly (no-op)
   - Mock auth system in auth-provider.tsx handles everything

   CRITICAL: Demo routes (/demo/*) MUST NOT be wrapped in
   ClerkProvider because the Clerk middleware does not run on the
   marketing domain (aurumshield.vip), so ClerkProvider has no
   session state and useSession() throws immediately.
   ================================================================ */

import { usePathname } from "next/navigation";
import { ClerkProvider } from "@clerk/nextjs";

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** True when Clerk is configured with a real (non-placeholder) key */
const CLERK_ENABLED =
  typeof CLERK_PUBLISHABLE_KEY === "string" &&
  CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/**
 * Routes that must NOT be wrapped in ClerkProvider.
 *
 * CRITICAL: This list MUST stay in sync with every path the middleware
 * serves via `NextResponse.next()` WITHOUT running `clerkMiddleware`.
 * If Clerk middleware doesn't process the request, ClerkProvider has no
 * session state and useSession() throws immediately.
 *
 * Marketing paths: /, /platform-overview, /technical-overview, /legal, /investor
 * Demo paths: /demo
 * Dev paths: /dev
 *
 * NOTE: /login, /signup, /forgot-password are NOT bypassed — the middleware
 * runs clerkMiddleware on these (they're public routes, not marketing routes).
 * They NEED ClerkProvider to render Clerk's <SignIn> / <SignUp> components.
 */
const CLERK_BYPASS_PREFIXES = [
  "/demo",
  "/platform-overview",
  "/technical-overview",
  "/legal",
  "/investor",
  "/dev",
];

/** Exact paths (not prefix-based) that also bypass */
const CLERK_BYPASS_EXACT = ["/"];

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Any route where the middleware does NOT run clerkMiddleware must
  // bypass ClerkProvider — no session state = useSession() throws.
  const isBypassRoute =
    CLERK_BYPASS_EXACT.includes(pathname) ||
    CLERK_BYPASS_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );

  if (!CLERK_ENABLED || isBypassRoute) {
    // Clerk not provisioned or demo route — render children directly.
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignInUrl="/platform"
      afterSignUpUrl="/platform"
      signInForceRedirectUrl="/platform"
      signUpForceRedirectUrl="/platform"
    >
      {children}
    </ClerkProvider>
  );
}
