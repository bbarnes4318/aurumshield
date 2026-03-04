"use client";

/* ================================================================
   DEV SIGNIN — Real Clerk Authentication Bypass
   ================================================================
   Internal route for operator/demo access. Renders the actual
   Clerk <SignIn /> component so users can authenticate and access
   all protected app routes (dashboard, transactions, etc.).

   The production /login page remains the institutional vetting
   gate for external visitors.

   Middleware marks /dev/(.*) as public, so this page loads
   without auth. After Clerk sign-in, the user has a real
   session and can access all protected routes.
   ================================================================ */

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

export default function DevSignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        {/* ── Back to Home ── */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Home
          </Link>
        </div>

        {/* ── Brand ── */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3">
            <AppLogo className="h-10 w-auto" variant="dark" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-text-faint">
            Operator Access
          </p>
        </div>

        {/* ── Clerk SignIn ── */}
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
            fallbackRedirectUrl="/dashboard"
          />
        </div>

        {/* ── Footer ── */}
        <p className="mt-8 text-center text-[10px] text-text-faint/50">
          © 2026 AurumShield. Operator access only.
        </p>
      </div>
    </div>
  );
}
