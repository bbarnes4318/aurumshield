"use client";

/* ================================================================
   MARKETING LANDING PAGE — AurumShield
   ================================================================
   Premium marketing landing page served on the root domain
   (aurumshield.vip). Showcases platform capabilities and
   directs users to the app subdomain for signup/login.
   ================================================================ */

import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

/* ── Feature cards data ── */
const FEATURES = [
  {
    icon: "🛡️",
    title: "Sovereign Custody",
    description:
      "Military-grade vault infrastructure with real-time GPS tracking, tamper-evident seals, and fully insured transit corridors.",
  },
  {
    icon: "⚖️",
    title: "Atomic Settlement",
    description:
      "Delivery-versus-Payment finality. Funds and metal move simultaneously — no counterparty exposure, no settlement risk.",
  },
  {
    icon: "🔍",
    title: "Institutional Compliance",
    description:
      "KYC/KYB onboarding via Persona, OFAC screening, PEP checks, and full audit trails for every transaction.",
  },
  {
    icon: "📊",
    title: "Risk Analytics",
    description:
      "Real-time counterparty scoring, position limits, and actuarial transit insurance with configurable risk parameters.",
  },
  {
    icon: "🏦",
    title: "Dual-Rail Settlement",
    description:
      "Modern Treasury for institutional wire rails, Moov for instant settlement. Automatic routing based on amount and urgency.",
  },
  {
    icon: "🔐",
    title: "Passkey Authentication",
    description:
      "Passwordless biometric authentication via WebAuthn. No passwords to leak, no SMS OTP to intercept.",
  },
] as const;

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-white/5 bg-[#0a0a0f]/80 px-6 py-4 backdrop-blur-xl sm:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
            <span className="text-sm font-bold text-black">Au</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            AurumShield
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${APP_URL}/login`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-black transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/20"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
          <div className="absolute -right-40 bottom-40 h-[600px] w-[600px] rounded-full bg-amber-600/5 blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium tracking-wider text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            SOVEREIGN FINANCIAL INFRASTRUCTURE
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Institutional Gold
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300 bg-clip-text text-transparent">
              Clearing & Custody
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
            Deterministic risk-first execution for sovereign-grade
            counterparties. Atomic DvP settlement, dual-rail banking, and
            cryptographic finality — built for institutions that cannot
            afford settlement failure.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={`${APP_URL}/signup`}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-base font-semibold text-black transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/25"
            >
              Open an Account
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
            <Link
              href="/platform-overview"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Platform Overview
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 text-white/20">
          <span className="text-xs font-medium tracking-widest uppercase">
            Explore
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="relative px-6 py-24 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for{" "}
              <span className="text-amber-400">Institutional Scale</span>
            </h2>
            <p className="mx-auto max-w-xl text-base text-white/40">
              Every component engineered for zero-trust environments where
              settlement failure is not an option.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-amber-500/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 text-2xl">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/40">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 py-24 sm:px-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-transparent p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Ready to secure your gold operations?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-base text-white/40">
            Join institutional counterparties who trust AurumShield for
            sovereign-grade clearing, custody, and compliance.
          </p>
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-base font-semibold text-black transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/25"
          >
            Get Started Today
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-8 sm:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/30">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/20 text-xs font-bold text-amber-400">
              Au
            </div>
            <span>© {new Date().getFullYear()} AurumShield</span>
          </div>
          <div className="flex gap-6 text-sm text-white/30">
            <Link
              href="/platform-overview"
              className="transition-colors hover:text-white/60"
            >
              Platform
            </Link>
            <Link
              href="/technical-overview"
              className="transition-colors hover:text-white/60"
            >
              Technical Overview
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
