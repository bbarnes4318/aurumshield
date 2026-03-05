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

/** Routes that must NOT be wrapped in ClerkProvider */
const CLERK_BYPASS_PREFIXES = ["/demo"];

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Demo routes bypass ClerkProvider entirely — Clerk middleware
  // does not run on marketing-domain demo paths, so ClerkProvider
  // has no session to hydrate and useSession() throws.
  const isBypassRoute = CLERK_BYPASS_PREFIXES.some(
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
