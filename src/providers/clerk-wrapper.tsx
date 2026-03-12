"use client";

/* ================================================================
   CLERK WRAPPER — Always wraps in ClerkProvider when configured
   ================================================================
   ClerkProvider is a React context provider that initializes the
   Clerk SDK. It MUST always be mounted when Clerk is configured,
   regardless of route type:

   - On app-domain routes where middleware ran: hooks return real
     session data (isLoaded=true, user data, etc.)
   - On marketing/demo routes where middleware didn't run: hooks
     return (isLoaded=true, isSignedIn=false) — no crash.

   The AuthProvider layer below handles which hooks are actually
   called (ClerkAuthAdapter vs MockAuthProvider) based on route.
   This wrapper just ensures the context exists.

   When Clerk is NOT configured (no valid publishable key):
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
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/platform"
      signUpFallbackRedirectUrl="/platform"
      signInForceRedirectUrl="/platform"
      signUpForceRedirectUrl="/platform"
    >
      {children}
    </ClerkProvider>
  );
}
