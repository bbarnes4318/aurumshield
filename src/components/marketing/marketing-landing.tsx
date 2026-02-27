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
  Fingerprint,
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
  "bg-[#0B0E14] border border-slate-800 rounded-md hover:border-gold/30 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/* ================================================================
   NAVIGATION
   ================================================================ */
function Navigation() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A1128]/80 backdrop-blur-xl border-b border-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-6 lg:h-7 w-auto" />
        </Link>

        {/* Center Links */}
        <div className="hidden lg:flex items-center gap-8">
          {["Platform", "Architecture", "Compliance", "Developers"].map(
            (link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
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
            className="hidden sm:inline-block text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Client Portal
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] hover:bg-[#D4AF37]/90 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors"
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
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
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
                <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-md border-2 border-gold/40 bg-[#0B0E14]">
                  <span className="font-mono text-sm font-bold text-gold">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-white mb-2">
                  {s.label}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
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
                <Monitor className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-400">
                  Risk Dashboard — Exposure Monitor
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gold/70" />
                <span className="text-[10px] uppercase tracking-wider text-gold/70 font-semibold">
                  Live
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Bilateral Exposure", value: "$4.2M", status: "text-gray-300" },
                  { label: "Cleared Exposure", value: "$0.00", status: "text-gold" },
                  { label: "Risk Reduction", value: "100%", status: "text-gold" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-xl font-bold font-mono tracking-tight tabular-nums ${stat.status}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-4">
                Exposure by Lifecycle Stage
              </p>
              <div className="space-y-3">
                {exposureData.map((d) => (
                  <div key={d.stage} className="flex items-center gap-4">
                    <span className="w-20 text-xs text-gray-400 text-right tabular-nums">
                      {d.stage}
                    </span>
                    <div className="flex-1 flex gap-1 h-5">
                      {/* Bilateral */}
                      <div
                        className="h-full rounded-sm bg-slate-800 transition-all duration-700"
                        style={{ width: `${d.bilateral}%` }}
                      />
                    </div>
                    <div className="flex-1 flex gap-1 h-5">
                      {/* Cleared */}
                      <div
                        className="h-full rounded-sm bg-gold/60 transition-all duration-700"
                        style={{ width: `${Math.max(d.cleared, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 mt-2 pt-3 border-t border-white/[0.06]">
                  <span className="w-20" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
                    <span className="text-[11px] text-gray-400">Bilateral</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-gold/60" />
                    <span className="text-[11px] text-gray-400">Centrally Cleared</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-4">
              Risk Architecture
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Exposure Compressed to Zero at Settlement
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
              Bilateral principal exposure is structurally removed from the
              transaction lifecycle. Central clearing replaces counterparty
              trust with deterministic, capital-monitored infrastructure.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
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
   KINETIC RISK — Sovereign Custody Layer
   ================================================================ */
function KineticRiskSection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-4">
          Physical Perimeter
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          The Sovereign Custody Layer: Kinetic Risk Eliminated
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          Physical transport of bullion exposes participants to severe kinetic
          threats—supply chain interception, transport extortion, and counterfeit
          asset injection. AurumShield bypasses the physical rail entirely.
          Bullion is confined within sovereign-grade vault networks, and
          ownership is settled atomically.
        </p>

        <div className="mt-16 grid gap-6 lg:grid-cols-12">
          {/* Large Feature - Spans 8 columns */}
          <div className={`lg:col-span-8 ${GLASS_CARD} p-8 sm:p-10 flex flex-col justify-center`}>
            <h3 className="text-xl font-bold text-white mb-4">Sovereign Vault Confinement</h3>
            <p className="text-base leading-relaxed text-gray-300 max-w-2xl">
              Certified bullion remains locked in secure, insured facilities operated exclusively by Tier-1 partners including Malca-Amit and Brink&apos;s. Counterparties never manage armed logistics or enter volatile territories. Physical reality is maintained; kinetic exposure is bypassed.
            </p>
          </div>

          {/* Stacked Side Features - Span 4 columns */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`${GLASS_CARD} p-6 flex-1`}>
              <h3 className="text-base font-bold text-white mb-2">Asset Provenance</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Independent LBMA-certified partners conduct physical assays prior to digital allocation, structurally eliminating counterfeit asset risk.
              </p>
            </div>
            <div className={`${GLASS_CARD} p-6 flex-1 border-gold/30 bg-gold/5`}>
              <h3 className="text-base font-bold text-gold mb-2">100% Indemnification</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Every ounce settled is fully underwritten against theft, loss, and catastrophic fraud.
              </p>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-4">
              Infrastructure
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Military-Grade Settlement Infrastructure
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
              AurumShield interposes as the central counterparty between buyers
              and sellers. The platform provides two primary access vectors:
              a full-featured institutional web application and a programmatic
              REST API for integration into existing trading systems.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
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
              {/* Maker-Checker Card */}
              <div className={`${GLASS_CARD} p-8 relative`}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20 shrink-0">
                    <Fingerprint className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Maker-Checker Biometric Authorization
                    </h3>
                    <p className="text-base leading-relaxed text-gray-300 max-w-md">
                      Structurally prevents unauthorized &ldquo;rogue trader&rdquo; execution.
                      Strict RBAC separates order origination (Trader) from
                      execution (Treasury). Final settlement requires a
                      cryptographically bound WebAuthn hardware signature.
                    </p>
                  </div>
                </div>
              </div>

              {/* Clearing Engine */}
              <div className={`${GLASS_CARD} p-8 relative`}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20 shrink-0">
                    <Cpu className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Atomic Escrow Engine
                    </h3>
                    <p className="text-base leading-relaxed text-gray-300 max-w-md">
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20 shrink-0">
                    <Code className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Real-Time Audit Telemetry
                    </h3>
                    <p className="text-base leading-relaxed text-gray-300 max-w-md">
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
      <div className="mt-16 w-full bg-[#D0A85C]/5 border-y border-[#D0A85C]/20 py-4 flex items-center justify-center px-4">
        <p className="text-center font-mono text-xs sm:text-sm text-[#D0A85C] tracking-[0.2em] uppercase">
          [ VERIFIED ]: ALL ARCHITECTURAL STATE TRANSITIONS ARE BOUND BY COMPREHENSIVE UNDERWRITTEN INDEMNIFICATION.
        </p>
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
        <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-4">
          Compliance
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Engineered for Institutional Compliance
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          AurumShield maps to the most stringent regulatory and security
          frameworks in global finance, ensuring your treasury operations
          remain fully compliant.
        </p>

        {/* Data Table */}
        <div className={`mt-14 ${GLASS_CARD} overflow-hidden`}>
          {/* Header */}
          <div className="grid grid-cols-[100px_1fr_100px_2fr] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:grid-cols-[120px_180px_100px_1fr]">
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
              <span className="text-sm font-semibold text-gold">
                {row.framework}
              </span>
              <span className="text-sm font-medium text-white">
                {row.scope}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs font-semibold text-gold">
                  {row.status}
                </span>
              </span>
              <span className="text-sm leading-relaxed text-gray-300">
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
    <section className="py-24 lg:py-32 bg-[#0A1128]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border border-slate-800 bg-[#0B0E14] rounded-md p-10 sm:p-16">
          
          <div className="max-w-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-4">
              Structural markets require structural infrastructure.
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Institutional participants are migrating to deterministic bullion clearing. Access is restricted to qualified entities.
            </p>
          </div>

          <div className="mt-8 lg:mt-0 flex-shrink-0">
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-bold px-8 py-4 rounded-md transition-all duration-200"
            >
              Request Institutional Access
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>

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
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-6 w-auto" />
          <span className="h-3 w-px bg-white/[0.08]" />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
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
      <KineticRiskSection />
      <ArchitectureSection />
      <ComplianceSection />
      <ComplianceGate />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
