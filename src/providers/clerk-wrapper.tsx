/* ================================================================
   CLERK WRAPPER — Dual-mode (Real Clerk + Demo fallback)
   ================================================================
   When Clerk is configured with valid publishable key:
   - Wraps the app in ClerkProvider (passkeys, OAuth, MFA, etc.)
   - Sets canonical auth URLs and post-auth redirect targets

   When Clerk is NOT configured:
   - Renders children directly (no-op)
   - Mock auth system in auth-provider.tsx handles everything
   ================================================================ */

import { ClerkProvider } from "@clerk/nextjs";

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** True when Clerk is configured with a real (non-placeholder) key */
const CLERK_ENABLED =
  typeof CLERK_PUBLISHABLE_KEY === "string" &&
  CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  CLERK_PUBLISHABLE_KEY.startsWith("pk_");

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) {
    // Clerk not provisioned — demo mode, render children directly.
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
