"use client";

/* ================================================================
   LOGIN PAGE — Coming Soon Gate
   ================================================================
   Authentication is not yet enabled for public access.
   This page shows a professional "coming soon" notice while
   preserving the institutional brand identity.
   ================================================================ */

import Link from "next/link";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

export default function LoginPage() {
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
            <Lock className="h-7 w-7 text-gold" />
          </div>

          <h1 className="text-xl font-semibold text-text tracking-tight mb-2">
            Platform Access Coming Soon
          </h1>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            AurumShield is currently onboarding select institutional partners.
            Registration and platform login will be available upon completion
            of our initial partner certification round.
          </p>

          {/* Status Indicators */}
          <div className="space-y-3 text-left mb-6">
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
              <div className="flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-gold/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </div>
              <span className="text-xs text-text-muted">
                Infrastructure deployment — <span className="text-success font-medium">Operational</span>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
              <div className="flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-gold/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </div>
              <span className="text-xs text-text-muted">
                Compliance & KYB verification — <span className="text-gold font-medium">In Progress</span>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-text-faint/30" />
              <span className="text-xs text-text-muted">
                Public registration — <span className="text-text-faint font-medium">Pending</span>
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-6" />

          {/* Contact CTA */}
          <div className="flex items-center justify-center gap-2 text-xs text-text-faint mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>Institutional inquiries welcome</span>
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
