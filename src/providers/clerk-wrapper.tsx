"use client";

/* ================================================================
   CLERK WRAPPER — Placeholder
   ================================================================
   @clerk/nextjs is NOT installed. This component is a safe no-op
   that simply renders its children. When Clerk is provisioned in
   the future, install @clerk/nextjs and restore ClerkProvider here.
   ================================================================ */

// TODO: Install @clerk/nextjs and restore ClerkProvider when Clerk is provisioned
// import { ClerkProvider } from "@clerk/nextjs";

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  // Clerk is not yet configured — render children directly.
  // The mock auth system in auth-provider.tsx handles authentication.
  return <>{children}</>;
}
