"use client";

/* ================================================================
   AURUMSHIELD — INSTITUTIONAL LANDING PAGE
   ================================================================
   Deterministic clearing layer for physical gold.
   Target: prime brokerages, UHNWIs, asset managers.

   Design system: #0A1128 navy-base + #D4AF37 gold accent.
   Glassmorphism cards, DvP visualization, metric cards.
   ================================================================ */

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  FileText,
  Code,
  Monitor,
  Cpu,
} from "lucide-react";

/* ── Section Imports ── */
import { HeroSection } from "./sections/hero";
import { TrustBand } from "./sections/trust-band";
import { MarketWeaknessSection } from "./sections/market-weakness";
import { RiskModelSection } from "./sections/risk-model";
import { ComplianceGate } from "./sections/compliance-gate";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

/* ── Shared animation for scroll reveal (CSS-only) ── */
const GLASS_CARD =
  "bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-2xl hover:border-[#D4AF37]/30 transition-all duration-300";

/* ================================================================
   NAVIGATION
   ================================================================ */
function Navigation() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A1128]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-8 w-auto" />
        </Link>

        {/* Center Links */}
        <div className="hidden lg:flex items-center gap-8">
          {["Platform", "Architecture", "Compliance", "Developers"].map(
            (link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                {link}
              </a>
            ),
          )}
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-4">
          <a
            href={`${APP_URL}/login`}
            className="hidden sm:inline-block text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Client Login
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #B68D29)",
            }}
          >
            Request Access
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ProblemSection removed — now using MarketWeaknessSection from ./sections/market-weakness */

/* ================================================================
   SETTLEMENT LIFECYCLE — Horizontal Timeline
   ================================================================ */
const LIFECYCLE_STEPS = [
  {
    step: "01",
    label: "Lock",
    description: "Inventory locked with concurrency guard. Asset reserved against double-allocation.",
  },
  {
    step: "02",
    label: "Quote",
    description: "Live XAU/USD spot rate captured. Price locked with deterministic expiry window.",
  },
  {
    step: "03",
    label: "Capital",
    description: "Exposure Coverage Ratio validated. Capital adequacy confirmed before execution.",
  },
  {
    step: "04",
    label: "Settle",
    description: "Atomic DvP execution. Title and funds transfer simultaneously. Zero intermediate exposure.",
  },
  {
    step: "05",
    label: "Transfer",
    description: "SHA-256 clearing certificate issued. Append-only ledger sealed. Finality achieved.",
  },
] as const;

function SettlementLifecycleSection() {
  return (
    <section id="architecture" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
          Settlement
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Deterministic Settlement Lifecycle
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Every transaction traverses a strict, irreversible state machine. Each transition is role-gated, audited, and deterministic.
        </p>

        {/* Horizontal Pipeline */}
        <div className="mt-16 relative">
          {/* Connector line */}
          <div className="absolute top-6 left-6 right-6 h-px bg-white/[0.08] hidden lg:block" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {LIFECYCLE_STEPS.map((s) => (
              <div key={s.step} className="relative">
                {/* Badge */}
                <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4AF37]/40 bg-[#0A1128]">
                  <span className="font-mono text-sm font-bold text-[#D4AF37]">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-white mb-2">
                  {s.label}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   EXPOSURE COMPRESSION — Dashboard Mockup
   ================================================================ */
function ExposureSection() {
  const exposureData = [
    { stage: "Pre-Trade", bilateral: 100, cleared: 100 },
    { stage: "Locked", bilateral: 85, cleared: 60 },
    { stage: "Quoted", bilateral: 85, cleared: 35 },
    { stage: "Committed", bilateral: 85, cleared: 15 },
    { stage: "Settled", bilateral: 85, cleared: 0 },
  ];

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Dashboard Mockup */}
          <div className={`${GLASS_CARD} overflow-hidden`}>
            {/* Title Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500">
                  Risk Dashboard — Exposure Monitor
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
                  Live
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Bilateral Exposure", value: "$4.2M", status: "text-amber-500" },
                  { label: "Cleared Exposure", value: "$0.00", status: "text-emerald-400" },
                  { label: "Risk Reduction", value: "100%", status: "text-[#D4AF37]" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-xl font-bold tabular-nums ${stat.status}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-4">
                Exposure by Lifecycle Stage
              </p>
              <div className="space-y-3">
                {exposureData.map((d) => (
                  <div key={d.stage} className="flex items-center gap-4">
                    <span className="w-20 text-xs text-slate-500 text-right tabular-nums">
                      {d.stage}
                    </span>
                    <div className="flex-1 flex gap-1 h-5">
                      {/* Bilateral */}
                      <div
                        className="h-full rounded-sm bg-amber-500/40 transition-all duration-700"
                        style={{ width: `${d.bilateral}%` }}
                      />
                    </div>
                    <div className="flex-1 flex gap-1 h-5">
                      {/* Cleared */}
                      <div
                        className="h-full rounded-sm transition-all duration-700"
                        style={{
                          width: `${Math.max(d.cleared, 2)}%`,
                          backgroundColor:
                            d.cleared === 0
                              ? "rgba(16, 185, 129, 0.5)"
                              : d.cleared < 30
                                ? "rgba(212, 175, 55, 0.4)"
                                : "rgba(212, 175, 55, 0.4)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 mt-2 pt-3 border-t border-white/[0.06]">
                  <span className="w-20" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" />
                    <span className="text-[11px] text-slate-500">Bilateral</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/50" />
                    <span className="text-[11px] text-slate-500">Centrally Cleared</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
              Risk Architecture
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Exposure Compressed to Zero at Settlement
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              Bilateral principal exposure is structurally removed from the
              transaction lifecycle. Central clearing replaces counterparty
              trust with deterministic, capital-monitored infrastructure.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              Continuous Exposure Coverage Ratio monitoring and hardstop limits
              are enforced computationally before execution — not applied
              retroactively through margin calls.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "Atomic DvP — no partial settlement states",
                "Continuous ECR monitoring with breach escalation",
                "SHA-256 clearing certificates per settlement",
                "Defined failure states with structured recovery",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                  <span className="text-base text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   PLATFORM ARCHITECTURE — 2-Column Asymmetric
   ================================================================ */
function ArchitectureSection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
              Infrastructure
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Full Platform Architecture
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              AurumShield interposes as the central counterparty between buyers
              and sellers. The platform provides two primary access vectors:
              a full-featured institutional web application and a programmatic
              REST API for integration into existing trading systems.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              Both interfaces connect to the same deterministic settlement
              engine, clearing ledger, and compliance perimeter. Every
              transaction follows the identical lifecycle regardless of
              origination channel.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/platform-overview"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#0A1128] transition-all hover:bg-[#E5C54B]"
              >
                <Globe className="h-4 w-4" />
                Platform Overview
              </Link>
              <Link
                href="/technical-overview"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-6 py-3 text-sm font-medium text-white transition-all hover:border-[#D4AF37]/40"
              >
                <FileText className="h-4 w-4" />
                Technical Overview
              </Link>
            </div>
          </div>

          {/* Right: Stacked Feature Cards */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute top-8 bottom-8 left-8 w-px bg-white/[0.08] hidden lg:block" />

            <div className="space-y-5">
              {/* Web App Card */}
              <div className={`${GLASS_CARD} p-8 relative`}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex-shrink-0">
                    <Monitor className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Institutional Web Application
                    </h3>
                    <p className="text-base leading-relaxed text-slate-400 max-w-md">
                      Full marketplace, order management, settlement tracking,
                      capital controls dashboard, and supervisory interface.
                      Role-gated access with biometric identity verification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Clearing Engine */}
              <div className={`${GLASS_CARD} p-8 relative`}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex-shrink-0">
                    <Cpu className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Deterministic Clearing Engine
                    </h3>
                    <p className="text-base leading-relaxed text-slate-400 max-w-md">
                      Atomic DvP settlement, SHA-256 clearing certificates,
                      dual-rail payment routing (Moov / Modern Treasury),
                      and append-only audit ledger with tamper-evident hashing.
                    </p>
                  </div>
                </div>
              </div>

              {/* API Access */}
              <div className={`${GLASS_CARD} p-8 relative`}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex-shrink-0">
                    <Code className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Programmatic API Access
                    </h3>
                    <p className="text-base leading-relaxed text-slate-400 max-w-md">
                      REST API for trade origination, settlement status polling,
                      certificate verification, and capital monitoring. Designed
                      for integration into existing OMS and EMS platforms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   COMPLIANCE TABLE — Bloomberg Terminal Style
   ================================================================ */
const COMPLIANCE_DATA = [
  {
    framework: "LBMA",
    scope: "Good Delivery Standards",
    status: "Embedded",
    detail: "Refiner verification against 34+ accredited refiners. Three mandatory evidence types per listing with structured field extraction.",
  },
  {
    framework: "KYC / AML",
    scope: "Identity Perimeter",
    status: "Enforced",
    detail: "Persona-powered biometric ID verification. OpenSanctions screening across OFAC, EU, UN, UK HMT, DFAT. UBO declaration for entities.",
  },
  {
    framework: "OECD",
    scope: "Responsible Sourcing",
    status: "Embedded",
    detail: "Chain of custody documentation per listing. Source-of-funds analysis during KYB onboarding. Provenance verified via OCR extraction.",
  },
  {
    framework: "Audit",
    scope: "Immutable Record",
    status: "Active",
    detail: "Append-only event stream with SHA-256 deterministic event IDs. Policy snapshots frozen at execution. Structured JSON for SIEM ingestion.",
  },
] as const;

function ComplianceSection() {
  return (
    <section id="compliance" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
          Compliance
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Standards &amp; Compliance Alignment
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Compliance posture is architecturally embedded into the settlement
          lifecycle. Each standard is enforced through code-level constraints,
          not policy documents.
        </p>

        {/* Data Table */}
        <div className={`mt-14 ${GLASS_CARD} overflow-hidden`}>
          {/* Header */}
          <div className="grid grid-cols-[100px_1fr_100px_2fr] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:grid-cols-[120px_180px_100px_1fr]">
            <span>Framework</span>
            <span>Scope</span>
            <span>Status</span>
            <span>Implementation</span>
          </div>

          {/* Rows */}
          {COMPLIANCE_DATA.map((row, i) => (
            <div
              key={row.framework}
              className={`grid grid-cols-[100px_1fr_100px_2fr] gap-4 px-6 py-5 sm:grid-cols-[120px_180px_100px_1fr] ${
                i < COMPLIANCE_DATA.length - 1
                  ? "border-b border-white/[0.04]"
                  : ""
              } ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}
            >
              <span className="text-sm font-semibold text-[#D4AF37]">
                {row.framework}
              </span>
              <span className="text-sm font-medium text-white">
                {row.scope}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">
                  {row.status}
                </span>
              </span>
              <span className="text-sm leading-relaxed text-slate-400">
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FINAL CTA
   ================================================================ */
function FinalCTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Structural markets require
          <br />
          structural infrastructure.
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-slate-400">
          Join the prime brokerages and liquidity providers moving to
          deterministic gold settlement.
        </p>
        <div className="mt-10">
          <a
            href={`${APP_URL}/signup`}
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-black transition-all hover:shadow-2xl hover:shadow-[#D4AF37]/25"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #B68D29)",
            }}
          >
            <span className="absolute inset-0 rounded-xl bg-[#D4AF37] animate-ping opacity-[0.08]" />
            <span className="relative">Request Institutional Access</span>
            <ArrowRight className="relative h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FOOTER
   ================================================================ */
function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-6 w-auto" />
          <span className="h-3 w-px bg-white/[0.08]" />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6 text-sm text-slate-500">
          <Link
            href="/platform-overview"
            className="transition-colors hover:text-slate-300"
          >
            Platform Overview
          </Link>
          <Link
            href="/technical-overview"
            className="transition-colors hover:text-slate-300"
          >
            Technical Overview
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white antialiased font-sans">
      <Navigation />
      <HeroSection />
      <TrustBand />
      <MarketWeaknessSection />
      <SettlementLifecycleSection />
      <ExposureSection />
      <RiskModelSection />
      <ArchitectureSection />
      <ComplianceSection />
      <ComplianceGate />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
