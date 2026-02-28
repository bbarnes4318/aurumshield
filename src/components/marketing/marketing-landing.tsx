"use client";

/* ================================================================
   AURUMSHIELD — INSTITUTIONAL LANDING PAGE
   ================================================================
   Deterministic clearing layer for physical gold.
   Target: prime brokerages, UHNWIs, asset managers.

   Design system: #0A1128 navy-base + #c6a86b gold accent.
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
  Lock,
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
  "bg-white/[0.02] border border-slate-800 rounded-md hover:border-gold/30 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/* ================================================================
   NAVIGATION
   ================================================================ */
function Navigation() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A1128]/90 backdrop-blur-xl border-b border-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* LEFT: Structural Anchors (Logo + Dossiers) */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link href="/" className="flex items-center flex-shrink-0">
            <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-6 lg:h-7 w-auto" />
          </Link>
          
          <div className="hidden lg:flex items-center gap-8 border-l border-slate-800 pl-8">
            <Link
              href="/platform-overview"
              className="text-sm font-semibold text-gray-400 transition-colors hover:text-white tracking-wide"
            >
              Platform Dossier
            </Link>
            <Link
              href="/technical-overview"
              className="text-sm font-semibold text-gray-400 transition-colors hover:text-white tracking-wide"
            >
              System Architecture
            </Link>
          </div>
        </div>

        {/* RIGHT: Access Gateways */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <a
            href={`${APP_URL}/login`}
            className="hidden sm:inline-block text-sm font-semibold text-gray-400 transition-colors hover:text-white tracking-wide"
          >
            Client Portal
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 rounded-md bg-gold hover:bg-gold/90 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors"
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
    description:
      "Inventory locked with concurrency guard. Asset reserved against double-allocation.",
  },
  {
    step: "02",
    label: "Quote",
    description:
      "Live XAU/USD spot rate captured. Price locked with deterministic expiry window.",
  },
  {
    step: "03",
    label: "Capital",
    description:
      "Exposure Coverage Ratio validated. Capital adequacy confirmed before execution.",
  },
  {
    step: "04",
    label: "Settle",
    description:
      "Atomic DvP execution. Title and funds transfer simultaneously. Zero intermediate exposure.",
  },
  {
    step: "05",
    label: "Transfer",
    description:
      "SHA-256 clearing certificate issued. Append-only ledger sealed. Finality achieved.",
  },
] as const;

function SettlementLifecycleSection() {
  return (
    <section id="architecture" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            SETTLEMENT LIFECYCLE
          </p>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Deterministic Settlement Lifecycle
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          Every transaction traverses a strict, irreversible state machine. Each
          transition is role-gated, audited, and deterministic.
        </p>

        {/* Horizontal Pipeline */}
        <div className="mt-16 relative">
          {/* Connector line */}
          <div className="absolute top-6 left-6 right-6 h-px bg-white/[0.08] hidden lg:block" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {LIFECYCLE_STEPS.map((s) => (
              <div key={s.step} className="relative">
                {/* Badge */}
                <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-md border-2 border-gold/40 bg-[#0A1128]">
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

            <div className="p-0">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0A1128]">
                    <th className="px-4 py-4 font-semibold text-slate-500 uppercase tracking-widest">State</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 uppercase tracking-widest">Bilateral Risk</th>
                    <th className="px-4 py-4 font-semibold text-gold uppercase tracking-widest">AurumShield DvP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="bg-white/[0.01]">
                    <td className="px-4 py-4 text-slate-400">01. Quote &amp; Lock</td>
                    <td className="px-4 py-4 text-slate-300">$4.2M Exposed</td>
                    <td className="px-4 py-4 text-gold">Escrow Confirmed</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-slate-400">02. Capital Transit</td>
                    <td className="px-4 py-4 text-slate-300">$4.2M Exposed</td>
                    <td className="px-4 py-4 text-gold">Capital Sequestered</td>
                  </tr>
                  <tr className="bg-white/[0.01]">
                    <td className="px-4 py-4 text-slate-400">03. Physical Release</td>
                    <td className="px-4 py-4 text-rose-400 font-semibold">Max Exposure</td>
                    <td className="px-4 py-4 text-gold">Title Blocked</td>
                  </tr>
                  <tr className="bg-gold/5 border-t border-gold/20">
                    <td className="px-4 py-4 text-white font-bold">04. Settlement</td>
                    <td className="px-4 py-4 text-rose-400 font-bold">Default Risk</td>
                    <td className="px-4 py-4 text-gold font-bold tracking-wider">$0.00 (DvP)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Copy */}
          <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            RISK ARCHITECTURE
          </p>
        </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Exposure Compressed to Zero at Settlement
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
              Bilateral principal exposure is structurally removed from the
              transaction lifecycle. Central clearing replaces counterparty
              trust with deterministic, capital-monitored infrastructure.
              By replacing 100% pre-funding requirements with cryptographically
              verified 5% collateral locks, AurumShield drastically unlocks
              capital efficiency and liquidity for participating trading desks.
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
                  <CheckCircle className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
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
    <section className="pb-24 lg:pb-32 pt-4 lg:pt-8">
      {/* Architectural Divider */}
      <div className="mx-auto max-w-7xl px-6 mb-16 lg:mb-20">
        <div className="h-px w-full bg-gradient-to-r from-slate-800 via-slate-800/50 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            PHYSICAL PERIMETER
          </p>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          The Sovereign Custody Layer: Kinetic Risk Eliminated
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          Physical transport of bullion exposes participants to severe kinetic
          threats—supply chain interception, transport extortion, and
          counterfeit asset injection. AurumShield bypasses the physical rail
          entirely. Bullion is confined within sovereign-grade vault networks,
          and ownership is settled atomically.
        </p>

        <div className="mt-16 grid gap-6 lg:grid-cols-12">
          {/* Large Feature - Spans 8 columns */}
          <div className={`lg:col-span-8 ${GLASS_CARD} p-8 sm:p-10 flex flex-col justify-center`}>
            <h3 className="text-xl font-bold text-white mb-4">Sovereign Vault Confinement</h3>
            <p className="text-base leading-relaxed text-slate-400 max-w-2xl">
              Certified bullion remains locked in secure, insured facilities operated exclusively by Tier-1 logistics partners including Malca-Amit and Brink&apos;s. Counterparties never touch the physical rail. Physical reality is maintained; kinetic exposure is bypassed.
            </p>
          </div>
          
          {/* Stacked Side Features - Span 4 columns */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`${GLASS_CARD} p-6 flex-1`}>
              <h3 className="text-base font-bold text-white mb-2">Armored Transit Eliminated</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Because settlement occurs atomically at the vault level, participants never need to manage armed transport or supply chain security.
              </p>
            </div>
            <div className={`${GLASS_CARD} p-6 flex-1`}>
              <h3 className="text-base font-bold text-white mb-2">Geopolitical Insulation</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Assets remain sequestered in highly stable jurisdictions, eliminating the risk of local extortion, confiscation, or transit interception.
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
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            CLEARING INFRASTRUCTURE
          </p>
        </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-xl">
              Military-Grade Settlement Infrastructure
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
              AurumShield interposes as the central counterparty between buyers
              and sellers. The platform provides two primary access vectors: a
              full-featured institutional web application and a programmatic
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
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-[#0A1128] transition-all hover:bg-gold-hover"
              >
                <Globe className="h-4 w-4" />
                Platform Overview
              </Link>
              <Link
                href="/technical-overview"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-6 py-3 text-sm font-medium text-white transition-all hover:border-gold/40"
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
                      Structurally prevents unauthorized &ldquo;rogue
                      trader&rdquo; execution. Strict RBAC separates order
                      origination (Trader) from execution (Treasury). Final
                      settlement requires a cryptographically bound WebAuthn
                      hardware signature.
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
                      dual-rail payment routing (Moov / Modern Treasury), and
                      append-only audit ledger with tamper-evident hashing.
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
                      Immutable Settlement Finality
                    </h3>
                    <p className="text-base leading-relaxed text-gray-300 max-w-md">
                      Upon execution, the platform issues a SHA-256 signed
                      clearing certificate on an append-only ledger. This
                      provides regulators and internal auditors with an
                      unalterable, mathematically proven record of execution.
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
    detail:
      "Refiner verification against 34+ accredited refiners. Three mandatory evidence types per listing with structured field extraction.",
  },
  {
    framework: "KYC / AML",
    scope: "Identity Perimeter",
    status: "Enforced",
    detail:
      "Persona-powered biometric ID verification. OpenSanctions screening across OFAC, EU, UN, UK HMT, DFAT. UBO declaration for entities.",
  },
  {
    framework: "OECD",
    scope: "Responsible Sourcing",
    status: "Embedded",
    detail:
      "Chain of custody documentation per listing. Source-of-funds analysis during KYB onboarding. Provenance verified via OCR extraction.",
  },
  {
    framework: "Audit",
    scope: "Immutable Record",
    status: "Active",
    detail:
      "Append-only event stream with SHA-256 deterministic event IDs. Policy snapshots frozen at execution. Structured JSON for SIEM ingestion.",
  },
] as const;

function ComplianceSection() {
  return (
    <section id="compliance" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">COMPLIANCE</p>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Engineered for Institutional Compliance
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          AurumShield maps to the most stringent regulatory and security
          frameworks in global finance, ensuring your treasury operations remain
          fully compliant.
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
      <div className="mx-auto max-w-4xl px-6">
        <div className="border border-slate-800 bg-[#0B0E14] rounded-md overflow-hidden shadow-2xl">
          
          <div className="p-10 sm:p-16 text-center flex flex-col items-center">
            <Lock className="h-10 w-10 text-gold mb-6 opacity-80" />
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-4">
              Infrastructure Access is Strictly Gated.
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
              AurumShield is private clearing infrastructure reserved for qualified institutional participants, sovereign entities, and tier-1 liquidity providers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-slate-950 font-bold px-10 py-4 rounded-md transition-all duration-200"
              >
                Request Institutional Access
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="border-t border-slate-800 bg-white/[0.02] px-6 py-5 text-center">
            <p className="font-mono text-[10px] sm:text-xs text-gold tracking-[0.15em] uppercase font-semibold">
              [ VERIFIED ]: All architectural state transitions are bound by comprehensive underwritten indemnification.
            </p>
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
    <footer className="border-t border-slate-800 bg-[#0A1128] pt-16 pb-8 px-6">
      <div className="mx-auto max-w-7xl">
        
        {/* Top Grid: Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Col 1: Brand */}
          <div className="md:col-span-1">
            <img src="/arum-logo-gold.svg" alt="AurumShield" className="h-7 w-auto mb-4" />
            <p className="text-sm leading-relaxed text-slate-500">
              Deterministic clearing layer and sovereign custody infrastructure for physical bullion.
            </p>
          </div>

          {/* Col 2: Infrastructure */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Infrastructure
              </h4>
            </div>
            <ul className="space-y-4 text-sm font-medium text-gray-400">
              <li><Link href="/platform-overview" className="hover:text-white transition-colors">Platform Dossier</Link></li>
              <li><Link href="/technical-overview" className="hover:text-white transition-colors">System Architecture</Link></li>
              <li><a href={`${APP_URL}/login`} className="hover:text-white transition-colors">Client Portal</a></li>
            </ul>
          </div>

          {/* Col 3: Legal & Compliance */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Compliance
              </h4>
            </div>
            <ul className="space-y-4 text-sm font-medium text-gray-400">
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/aml-kyc" className="hover:text-white transition-colors">AML &amp; KYC Policy</Link></li>
              <li><Link href="/legal/risk-reinsurance" className="hover:text-white transition-colors">Risk &amp; Reinsurance</Link></li>
            </ul>
          </div>

          {/* Col 4: Operations Desk (Phone Number) */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Global Operations
              </h4>
            </div>
            <div className="bg-[#0B0E14] border border-slate-800 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-gold/70 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-gold/70 font-semibold">
                  24/7 Automated Desk
                </span>
              </div>
              <a href="tel:+18652757300" className="text-lg font-mono font-bold text-white hover:text-gold transition-colors block mt-1">
                +1.865.275.7300
              </a>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Voice-automated clearing concierge.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Strip: Copyright */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600 font-mono">
            &copy; {new Date().getFullYear()} AurumShield Platform. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest">
            Institutional Access Only
          </p>
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
      <KineticRiskSection />
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
