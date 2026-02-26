"use client";

/* ================================================================
   SIGNUP PAGE — Coming Soon Gate
   ================================================================
   Registration is not yet enabled for public access.
   Redirects users to the login "coming soon" page for consistency.
   ================================================================ */

import Link from "next/link";
import { Shield, UserPlus, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        {/* ── Brand ── */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo className="h-12 w-auto" variant="dark" />
          </div>
          <p className="text-sm text-text-faint tracking-wide">
            Sovereign Clearing Infrastructure
          </p>
        </div>

        {/* ── Coming Soon Card ── */}
        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-8 shadow-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
            <UserPlus className="h-7 w-7 text-gold" />
          </div>

          <h1 className="text-xl font-semibold text-text tracking-tight mb-2">
            Registration Coming Soon
          </h1>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Institutional account registration will be available once our
            initial partner certification and compliance framework is finalized.
            We are currently onboarding select partners by invitation only.
          </p>

          {/* Invitation Notice */}
          <div className="rounded-[var(--radius-sm)] border border-gold/20 bg-gold/5 px-4 py-3 mb-6">
            <p className="text-xs text-gold font-medium mb-1">
              Invitation-Only Access
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              If you have received an institutional onboarding invitation,
              please contact your AurumShield representative directly.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Contact CTA */}
          <div className="flex items-center justify-center gap-2 text-xs text-text-faint mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>Request early access</span>
          </div>
          <a
            href="mailto:partners@aurumshield.vip"
            className="text-sm text-gold hover:text-gold-hover transition-colors font-medium"
          >
            partners@aurumshield.vip
          </a>
        </div>

        {/* ── Back to Home ── */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Home
          </Link>
        </div>

        {/* ── Footer ── */}
        <p className="mt-8 text-center text-[10px] text-text-faint/50">
          © 2026 AurumShield. All rights reserved.
        </p>
      </div>
    </div>
  );
}
