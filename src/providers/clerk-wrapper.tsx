"use client";

/* ================================================================
   CLERK WRAPPER — Conditionally provides ClerkProvider
   ================================================================
   Only wraps children with <ClerkProvider> when a valid publishable
   key is detected. When Clerk is not configured, children render
   directly — the mock auth system handles authentication instead.
   ================================================================ */

import { ClerkProvider } from "@clerk/nextjs";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const IS_VALID = CLERK_KEY.startsWith("pk_") && CLERK_KEY.length > 10;

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  if (!IS_VALID) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      appearance={{
        variables: {
          colorPrimary: "#C9A84C",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
