"use client";

/* ================================================================
   LOGIN PAGE — Clerk Authentication
   ================================================================
   Renders the Clerk <SignIn /> component so users can authenticate
   and access all protected app routes (dashboard, platform, etc.).

   Middleware marks /login as a public route so the page loads
   without requiring an existing session. After Clerk sign-in,
   the user is redirected to /platform.

   ClerkProvider wraps this page (NOT in the bypass list), so
   all Clerk hooks and components work correctly.

   Safety: If Clerk is not configured (missing NEXT_PUBLIC key),
   a fallback UI is shown instead of crashing.

   ZERO-SCROLL POLICY: The entire page must fit in the viewport.
   ================================================================ */

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

/** Check if Clerk is configured at build time */
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const CLERK_AVAILABLE =
  typeof CLERK_KEY === "string" &&
  CLERK_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  CLERK_KEY.startsWith("pk_");

export default function LoginPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ── Back to Home ── */}
        <div className="mb-3 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Home
          </Link>
        </div>

        {/* ── Brand ── */}
        <div className="mb-4 flex flex-col items-center">
          <div className="mb-2">
            <AppLogo className="h-10 w-auto" variant="dark" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-text-faint">
            Institutional Access
          </p>
        </div>

        {/* ── Auth UI ── */}
        {CLERK_AVAILABLE ? (
          <div className="flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-[#0f1a2b] border border-[#1e293b] shadow-lg rounded-md",
                  headerTitle: "text-[#cbd5e1]",
                  headerSubtitle: "text-[#94a3b8]",
                  socialButtonsBlockButton:
                    "border-[#1e293b] bg-[rgba(255,255,255,0.04)] text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.06)]",
                  formFieldLabel: "text-[#94a3b8]",
                  formFieldInput:
                    "bg-[rgba(255,255,255,0.04)] border-[#1e293b] text-[#cbd5e1] placeholder:text-[#64748b]",
                  formButtonPrimary:
                    "bg-[#c6a86b] hover:bg-[#d3b77d] text-slate-950 font-bold",
                  footerActionLink: "text-[#c6a86b] hover:text-[#d3b77d]",
                  identityPreviewEditButton:
                    "text-[#c6a86b] hover:text-[#d3b77d]",
                },
              }}
              routing="hash"
              signUpUrl="/signup"
              fallbackRedirectUrl="/platform"
            />
          </div>
        ) : (
          /* Fallback when Clerk is not configured */
          <div className="rounded-lg border border-[#1e293b] bg-[#0f1a2b] p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-400/80" />
            <h2 className="mb-2 text-lg font-semibold text-[#cbd5e1]">
              Authentication Unavailable
            </h2>
            <p className="mb-4 text-sm text-[#94a3b8]">
              The authentication service is currently being configured. Please
              use the demo portal to access the platform.
            </p>
            <Link
              href="/demo/login?demo=true"
              className="inline-flex items-center gap-2 rounded-md bg-[#c6a86b] px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#d3b77d]"
            >
              Access Demo Portal
            </Link>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="mt-4 text-center text-[10px] text-text-faint/50">
          © 2026 AurumShield. All rights reserved.
        </p>
      </div>
    </div>
  );
}
