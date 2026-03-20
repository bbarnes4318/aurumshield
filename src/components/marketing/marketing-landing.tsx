"use client";

/* ================================================================
   AURUMSHIELD — INSTITUTIONAL LANDING PAGE
   ================================================================
   Deterministic clearing layer for physical gold.
   Target: prime brokerages, UHNWIs, asset managers.

   Design system: #0A1128 navy-base + #c6a86b gold accent.
   Glassmorphism cards, DvP visualization, metric cards.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

/* ── Section Imports ── */
import { HeroSection } from "./sections/hero";
import { TrustBand } from "./sections/trust-band";
import { MarketWeaknessSection } from "./sections/market-weakness";
import { RiskModelSection } from "./sections/risk-model";
import { ComplianceGate } from "./sections/compliance-gate";
import { TelemetryTerminal } from "./telemetry-terminal";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

/* ── Shared animation for scroll reveal (CSS-only) ── */
const GLASS_CARD =
  "bg-white/2 border border-slate-800 rounded-md hover:border-gold/30 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/* ================================================================
   NAVIGATION — Glassmorphism sticky nav with institutional links
   ================================================================ */
const NAV_LINKS = [
  { label: "Platform Dossier", href: "/platform-dossier" },
  { label: "System Architecture", href: "/system-architecture" },
] as const;

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Body scroll lock when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Escape key closes menu
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  // Focus trap — keep tab within mobile menu
  useEffect(() => {
    if (!mobileOpen || !menuRef.current) return;
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <nav className="fixed top-0 z-50 w-full backdrop-blur-md border-b border-slate-800 bg-[#0A1128]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          {/* LEFT: Logo */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/arum-logo-gold.svg"
                alt="AurumShield"
                width={120}
                height={28}
                className="h-6 lg:h-7 w-auto"
                priority
                unoptimized
              />
            </Link>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13px] font-medium text-slate-400 transition-colors duration-200 hover:text-white tracking-wide"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT: CTA + Mobile hamburger */}
          <div className="flex items-center gap-6 sm:gap-8 shrink-0">
            <a
              href={APP_URL}
              className="hidden lg:inline-flex text-[13px] font-medium text-slate-400 transition-colors duration-200 hover:text-white tracking-wide"
            >
              Client Portal
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="hidden sm:inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-[#0A1128] transition-colors bg-gold hover:bg-gold-hover"
            >
              Request Access
            </a>
            <a
              href="/perimeter/verify?demo=active"
              className="hidden lg:inline-flex items-center gap-2 rounded-md border border-gold/30 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-gold transition-all hover:border-gold/60 hover:bg-gold/10"
            >
              Initiate Institutional Demo
            </a>

            {/* Mobile hamburger — visible below lg */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden touch-target rounded-md text-gray-400 hover:text-white transition-colors active:scale-95"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      <div
        className={`fixed inset-0 z-60 bg-black/80 transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* ── Mobile Menu Panel ── */}
      <div
        ref={menuRef}
        className={`fixed inset-y-0 right-0 z-60 w-72 max-w-[85vw] bg-[#0A1128] border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            Navigation
          </span>
          <button
            onClick={closeMobile}
            className="touch-target rounded-md text-gray-400 hover:text-white transition-colors active:scale-95"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex flex-col px-5 py-6 gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={closeMobile}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </a>
          ))}

          <a
            href={APP_URL}
            onClick={closeMobile}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Client Portal
          </a>

          <div className="h-px bg-slate-800 my-3" />

          <a
            href={`${APP_URL}/signup`}
            onClick={closeMobile}
            className="mt-4 flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-[#0A1128] transition-colors active:scale-[0.98] bg-gold hover:bg-gold-hover"
          >
            Request Access
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </>
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
        <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-3xl">
          Deterministic Settlement Lifecycle
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          Whether sourcing from vetted mine originators or institutional
          sellers, every trade traverses a strict, irreversible state machine.
          Each transition is role-gated, audited, and deterministic.
        </p>

        {/* Horizontal Pipeline */}
        <div className="mt-16 relative">
          {/* Connector line */}
          <div className="absolute top-6 left-6 right-6 h-px bg-white/8 hidden lg:block" />

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
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-3">
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

            {/* Responsive scroll wrapper — prevents table from breaking mobile viewport */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0A1128]">
                    <th className="px-4 py-4 font-semibold text-slate-500 uppercase tracking-widest">
                      State
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-500 uppercase tracking-widest">
                      Bilateral Risk
                    </th>
                    <th className="px-4 py-4 font-semibold text-gold uppercase tracking-widest">
                      AurumShield DvP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="bg-white/1">
                    <td className="px-4 py-4 text-slate-400">
                      01. Quote &amp; Lock
                    </td>
                    <td className="px-4 py-4 text-slate-300">$4.2M Exposed</td>
                    <td className="px-4 py-4 text-gold">Escrow Confirmed</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-slate-400">
                      02. Capital Transit
                    </td>
                    <td className="px-4 py-4 text-slate-300">$4.2M Exposed</td>
                    <td className="px-4 py-4 text-gold">Capital Sequestered</td>
                  </tr>
                  <tr className="bg-white/1">
                    <td className="px-4 py-4 text-slate-400">
                      03. Physical Release
                    </td>
                    <td className="px-4 py-4 text-rose-400 font-semibold">
                      Max Exposure
                    </td>
                    <td className="px-4 py-4 text-gold">Title Blocked</td>
                  </tr>
                  <tr className="bg-gold/5 border-t border-gold/20">
                    <td className="px-4 py-4 text-white font-bold">
                      04. Settlement
                    </td>
                    <td className="px-4 py-4 text-rose-400 font-bold">
                      Default Risk
                    </td>
                    <td className="px-4 py-4 text-gold font-bold tracking-wider">
                      $0.00 (DvP)
                    </td>
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
            <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-xl">
              T+0 Finality. Zero Temporal Risk.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-200">
              In legacy markets, a T+2 settlement window creates exponential
              counterparty risk. AurumShield&apos;s engine executes atomically,
              collapsing the settlement window to zero and eliminating temporal
              exposure entirely.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { prefix: "Bilateral trust requirements:", suffix: "Eliminated." },
                { prefix: "Asset reconciliation:", suffix: "Instant & Absolute." },
                { prefix: "Counterparty default risk:", suffix: "Mathematically Zero." },
              ].map((item) => (
                <div key={item.prefix} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-gold mt-0.5 shrink-0" />
                  <span className="text-base text-gray-200">
                    {item.prefix} <strong className="text-white">{item.suffix}</strong>
                  </span>
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
   SOLUTION — Bypassing the Middlemen
   ================================================================ */
function KineticRiskSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(198,168,107,0.04) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* ── Section Header — centered for impact ── */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="h-px w-10 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              THE SOLUTION
            </p>
            <div className="h-px w-10 bg-gold/50" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white leading-[1.15]">
            Bypassing the Middlemen.
            <br />
            <span className="text-gold">Eliminating the Risk.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-2xl text-base md:text-lg leading-relaxed text-gray-300">
            AurumShield replaces trust with deterministic proof and unshakeable
            financial guarantees. We orchestrate a closed-loop ecosystem that
            connects you directly to the source.
          </p>
        </div>

        {/* ── Bento Grid — 1 large + 2 side-by-side ── */}
        <div className="grid gap-5 lg:gap-6">
          {/* ▸ Feature 1 — Full-width hero card */}
          <div className="group relative rounded-xl border border-gold/20 bg-linear-to-br from-gold/6 to-transparent p-8 md:p-10 lg:p-12 overflow-hidden transition-all duration-300 hover:border-gold/40">
            {/* Large faded number */}
            <span className="pointer-events-none absolute -right-4 -top-6 font-mono text-[10rem] font-black leading-none text-gold/4 select-none">
              01
            </span>

            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="inline-block mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70 border border-gold/20 rounded-full px-3 py-1">
                  MARKET DISCRETION
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                  Your Trade Privacy Is a Non-Negotiable Asset
                </h3>
                <p className="text-base leading-relaxed text-gray-300 max-w-2xl">
                  While we maintain strict, bank-grade AML compliance, our
                  platform is structured to ensure your identity, allocations,
                  and trade volumes remain strictly confidential and completely
                  shielded from public registries and OTC desks.
                </p>
              </div>

              {/* Visual accent — lock icon cluster */}
              <div className="hidden lg:flex items-center justify-center w-28 h-28 rounded-2xl border border-gold/15 bg-gold/5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  className="w-12 h-12 text-gold/60"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Gold accent bar */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-transparent via-gold/40 to-transparent" />
          </div>

          {/* ▸ Features 2 + 3 — Side by side */}
          <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
            {/* Feature 2 */}
            <div className="group relative rounded-xl border border-slate-800 bg-white/2 p-8 md:p-10 overflow-hidden transition-all duration-300 hover:border-gold/30 hover:bg-gold/2">
              <span className="pointer-events-none absolute -right-2 -top-4 font-mono text-[8rem] font-black leading-none text-white/2 select-none">
                02
              </span>

              <div className="relative z-10">
                <span className="inline-block mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70 border border-gold/20 rounded-full px-3 py-1">
                  DIRECT SOURCE
                </span>
                <h3 className="text-lg md:text-xl font-bold text-white mb-3">
                  Direct Miner Sourcing
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  We bypass retail dealers and OTC brokers entirely, sourcing
                  directly from verified, heavily vetted mining operations. No
                  middlemen. No inflated premiums. Direct access to the source
                  of supply.
                </p>
              </div>

              {/* Hover accent */}
              <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-xl bg-linear-to-r from-transparent via-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-xl border border-slate-800 bg-white/2 p-8 md:p-10 overflow-hidden transition-all duration-300 hover:border-gold/30 hover:bg-gold/2">
              <span className="pointer-events-none absolute -right-2 -top-4 font-mono text-[8rem] font-black leading-none text-white/2 select-none">
                03
              </span>

              <div className="relative z-10">
                <span className="inline-block mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70 border border-gold/20 rounded-full px-3 py-1">
                  LEGAL PROTECTION
                </span>
                <h3 className="text-lg md:text-xl font-bold text-white mb-3">
                  Absolute Legal Title
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  Your gold is physically segregated. Through strict legal
                  bailment, your assets are &ldquo;bankruptcy remote&rdquo;&mdash;meaning
                  they can never be seized by a bank or vaulting provider. You
                  hold absolute, unencumbered legal title.
                </p>
              </div>

              {/* Hover accent */}
              <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-xl bg-linear-to-r from-transparent via-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
            <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-xl">
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
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-6 py-3 text-sm font-medium text-white transition-all hover:border-gold/40"
              >
                <FileText className="h-4 w-4" />
                Technical Overview
              </Link>
            </div>
          </div>

          {/* Right: Stacked Feature Cards */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute top-8 bottom-8 left-8 w-px bg-white/8 hidden lg:block" />

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
   COMPLIANCE TABLE — Enterprise Audit Report
   ================================================================ */
const COMPLIANCE_DATA = [
  {
    framework: "SOC 2",
    type: "Type II",
    scope: "Security & Availability Controls",
    status: "CONTINUOUS",
    detail:
      "Real-time control monitoring across all trust services criteria. Annual third-party attestation with continuous automated evidence collection.",
  },
  {
    framework: "KYC / AML",
    type: "BSA",
    scope: "Identity & Transaction Perimeter",
    status: "ENFORCED",
    detail:
      "Veriff biometric ID + liveness detection. OpenSanctions screening: OFAC, EU, UN, UK HMT, DFAT. UBO declaration for all entities. Ongoing transaction monitoring.",
  },
  {
    framework: "ISO 27001",
    type: "Annex A",
    scope: "Information Security Management",
    status: "CERTIFIED",
    detail:
      "Full ISMS implementation covering cryptographic key management, access control, network segmentation, and incident response. Annual surveillance audit.",
  },
  {
    framework: "LBMA",
    type: "GD List",
    scope: "Good Delivery Standards",
    status: "EMBEDDED",
    detail:
      "Refiner verification against 34+ accredited refiners. Three mandatory evidence types per listing with structured OCR field extraction and chain-of-custody.",
  },
  {
    framework: "OECD",
    type: "DDG",
    scope: "Responsible Mineral Sourcing",
    status: "EMBEDDED",
    detail:
      "Five-step due diligence framework. Source-of-funds analysis during KYB onboarding. Provenance cryptographically sealed per transaction.",
  },
  {
    framework: "Audit",
    type: "SHA-256",
    scope: "Immutable Clearing Record",
    status: "ACTIVE",
    detail:
      "Append-only event stream with deterministic event IDs. Policy snapshots frozen at execution time. Structured JSON export for SIEM ingestion.",
  },
] as const;

function ComplianceSection() {
  return (
    <section id="compliance" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            AUDIT REPORT
          </p>
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-3xl">
          Regulatory &amp; Cryptographic Compliance
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-400">
          Aarumshield operates exceeding global financial regulatory standards.
          Our infrastructure is continuously audited for absolute cryptographic
          and operational integrity.
        </p>

        {/* ── Audit Table — Enterprise Report Layout ── */}
        <div className="mt-14 border border-gray-800 rounded-md overflow-hidden bg-[#070B16]">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[110px_80px_1fr_110px_1fr] gap-0 border-b-2 border-gray-700 bg-[#0A0E18]">
            <div className="px-5 py-4 border-r border-gray-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Framework
              </span>
            </div>
            <div className="px-4 py-4 border-r border-gray-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Type
              </span>
            </div>
            <div className="px-5 py-4 border-r border-gray-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Scope
              </span>
            </div>
            <div className="px-4 py-4 border-r border-gray-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Status
              </span>
            </div>
            <div className="px-5 py-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Implementation Detail
              </span>
            </div>
          </div>

          {/* Desktop Rows */}
          {COMPLIANCE_DATA.map((row, i) => (
            <div
              key={row.framework}
              className={`hidden md:grid grid-cols-[110px_80px_1fr_110px_1fr] gap-0 ${
                i < COMPLIANCE_DATA.length - 1
                  ? "border-b border-gray-800/70"
                  : ""
              } ${i % 2 === 0 ? "bg-white/1" : "bg-transparent"} hover:bg-gold/2 transition-colors duration-150`}
            >
              <div className="px-5 py-4 border-r border-gray-800/50 flex items-start">
                <span className="font-mono text-sm font-bold text-gold tracking-wide">
                  {row.framework}
                </span>
              </div>
              <div className="px-4 py-4 border-r border-gray-800/50 flex items-start">
                <span className="font-mono text-xs text-gray-500 mt-0.5">
                  {row.type}
                </span>
              </div>
              <div className="px-5 py-4 border-r border-gray-800/50 flex items-start">
                <span className="text-sm text-gray-200">{row.scope}</span>
              </div>
              <div className="px-4 py-4 border-r border-gray-800/50 flex items-start">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                  <span className="font-mono text-[10px] font-bold text-emerald-400/90 tracking-wider">
                    {row.status}
                  </span>
                </span>
              </div>
              <div className="px-5 py-4 flex items-start">
                <span className="text-sm leading-relaxed text-gray-400">
                  {row.detail}
                </span>
              </div>
            </div>
          ))}

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-800/70">
            {COMPLIANCE_DATA.map((row, i) => (
              <div
                key={row.framework}
                className={`px-5 py-5 ${i % 2 === 0 ? "bg-white/1" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-gold tracking-wide">
                    {row.framework}
                    <span className="ml-2 text-[10px] text-gray-600">
                      {row.type}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                    <span className="font-mono text-[10px] font-bold text-emerald-400/90 tracking-wider">
                      {row.status}
                    </span>
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200 mb-2">
                  {row.scope}
                </p>
                <p className="text-sm leading-relaxed text-gray-400">
                  {row.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Audit Footer — Certification Stamp */}
          <div className="border-t-2 border-gray-700 bg-[#0A0E18] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-mono text-[10px] text-gray-600 tracking-wider uppercase">
              Last Audit Cycle: Q4 2025 &bull; Next Review: Q2 2026
            </span>
            <span className="font-mono text-[10px] text-gold/60 tracking-wider uppercase">
              [ CLASSIFICATION: INSTITUTIONAL — NOT FOR PUBLIC DISTRIBUTION ]
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   VAULT DIVIDER — Cinematic Section Break
   ================================================================ */
function VaultDivider() {
  return (
    <div className="w-full h-64 overflow-hidden relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/vault-divider-bg.png"
        alt=""
        className="object-cover w-full h-full opacity-40 grayscale"
        aria-hidden="true"
      />
      {/* Navy tint overlay */}
      <div className="absolute inset-0 bg-[#0A1128]/50 pointer-events-none" />
      {/* Bottom gradient bleed */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#0A1128] to-transparent pointer-events-none" />
      {/* Top gradient bleed */}
      <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#0A1128] to-transparent pointer-events-none" />
      {/* Center accent line */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-px w-32 bg-linear-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    </div>
  );
}

/* ================================================================
   SOVEREIGN ASSETS — Private Client Advisory
   ================================================================ */
function SovereignAssetsSection() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "#070B16" }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* ── Ultra-premium panel ── */}
        <div className="relative border border-gold/20 rounded-md overflow-hidden bg-[#080C18] shadow-[0_0_60px_-15px_rgba(198,168,107,0.06)]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-gold/30 rounded-tl-md pointer-events-none" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-gold/30 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-gold/30 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-gold/30 rounded-br-md pointer-events-none" />

          {/* Panel content */}
          <div className="relative px-8 py-12 sm:px-14 sm:py-16 lg:px-20 lg:py-20">
            {/* Eyebrow */}
            <div className="flex items-center gap-4 mb-6">
              <ShieldCheck className="h-5 w-5 text-gold/70" />
              <div className="h-px w-8 bg-gold/40" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-gold/70">
                PRIVATE CLIENT ADVISORY
              </p>
            </div>

            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white max-w-2xl leading-tight">
              Sovereign Asset Acquisition.
            </h2>

            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-400">
              For ultra-high-net-worth individuals and institutional treasuries,
              Aarumshield facilitates the direct acquisition of physical,
              operational gold mines. Bypass the fractional markets entirely and
              secure sovereign-grade, ground-floor assets.
            </p>

            {/* Divider */}
            <div className="my-10 h-px w-full bg-linear-to-r from-gold/20 via-gold/10 to-transparent" />

            {/* Feature bullets */}
            <div className="grid gap-4 sm:grid-cols-2 mb-10">
              {[
                "Direct mine originator access",
                "Full geological due diligence",
                "Title transfer & sovereign vaulting",
                "Institutional-grade legal structuring",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-gold/60 shrink-0" />
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>

            {/* High-friction CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex items-center justify-center gap-3 rounded-md border border-gold/60 px-10 py-4 text-sm font-bold text-gold uppercase tracking-wider transition-all duration-300 hover:bg-gold/10 hover:border-gold hover:shadow-[0_0_20px_rgba(198,168,107,0.1)]"
              >
                Inquire for Private Deal Flow
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-700 px-8 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider transition-all duration-300 hover:border-gray-500 hover:text-gray-200"
              >
                Request Institutional Access
              </a>
            </div>
          </div>

          {/* Classification footer */}
          <div className="border-t border-gold/10 bg-gold/2 px-8 sm:px-14 lg:px-20 py-4">
            <p className="font-mono text-[10px] text-gold/40 tracking-wider uppercase">
              This offering is restricted to qualified institutional investors and sovereign wealth entities.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   INSTITUTIONAL BUYER JOURNEY — 6-Phase Overview
   ================================================================ */
const JOURNEY_PHASES = [
  {
    phase: "01",
    title: "Identity Registration",
    description:
      "Clerk-secured institutional email verification and 2FA TOTP authorization. Cryptographically sealed session binding.",
    href: "/perimeter/register",
    status: "COMPLIANCE GATE",
  },
  {
    phase: "02",
    title: "KYC / KYB / AML Screening",
    description:
      "Document upload, corporate identity verification, and automated OFAC SDN, EU Consolidated, and UN Security Council sanctions screening.",
    href: "/perimeter/verify",
    status: "COMPLIANCE GATE",
  },
  {
    phase: "03",
    title: "Sovereign Asset Catalog",
    description:
      "Post-verification access to the 3-tier asset catalog: LBMA Good Delivery bullion, semi-purified doré bars, and raw geological yield.",
    href: "/marketplace",
    status: "ASSET SELECTION",
  },
  {
    phase: "04",
    title: "Execution Terminal",
    description:
      "Full settlement math with transparent line-item breakdown — spot execution, Brink's transit, insurance, and platform fees. 60-second cryptographic price lock.",
    href: "/checkout",
    status: "PRICE LOCK",
  },
  {
    phase: "05",
    title: "Capital Settlement",
    description:
      "5-step clearing pipeline: Plaid treasury authentication, liquidity verification, Column N.A. Fedwire drawdown, SHA-256 title generation, and Brink's logistics.",
    href: "/settlement",
    status: "CLEARING",
  },
  {
    phase: "06",
    title: "Post-Settlement Treasury",
    description:
      "Post-settlement treasury dashboard. View vaulted collateral, execute fractional liquidations via the Goldwire card network against live spot.",
    href: "/goldwire",
    status: "TREASURY",
  },
] as const;

function BuyerJourneySection() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "#070B16" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            EXECUTION ARCHITECTURE
          </p>
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-3xl">
          The Institutional Buyer Journey
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-400">
          A strictly gated, 6-phase pipeline from identity verification through
          capital settlement and collateral management. Every phase enforces
          compliance, transparency, and cryptographic finality.
        </p>

        {/* Phase Grid */}
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {JOURNEY_PHASES.map((phase) => (
            <Link
              key={phase.phase}
              href={phase.href}
              className="group flex flex-col border border-gray-800 bg-white/2 rounded-md p-6 transition-all duration-200 hover:border-gold/40 hover:bg-gold/3"
            >
              {/* Phase number + status */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-bold text-gold/60">
                  {phase.phase}
                </span>
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-emerald-400/70 border border-emerald-500/20 px-2 py-0.5 rounded-sm bg-emerald-500/5">
                  {phase.status}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gold transition-colors">
                {phase.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-gray-400 flex-1">
                {phase.description}
              </p>

              {/* Link indicator */}
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-gold/50 group-hover:text-gold transition-colors">
                <span>Enter Phase</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
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
            <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white mb-4">
              Infrastructure Access is Strictly Gated.
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
              AurumShield is private clearing infrastructure reserved for
              qualified institutional participants, sovereign entities, and
              tier-1 liquidity providers.
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

          <div className="border-t border-slate-800 bg-white/2 px-6 py-5 text-center">
            <p className="font-mono text-[10px] sm:text-xs text-gold tracking-[0.15em] uppercase font-semibold">
              [ VERIFIED ]: All architectural state transitions are bound by
              comprehensive underwritten indemnification.
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
            <Image
              src="/arum-logo-gold.svg"
              alt="AurumShield"
              width={120}
              height={28}
              className="h-7 w-auto mb-4"
              unoptimized
            />
            <p className="text-sm leading-relaxed text-slate-500">
              Deterministic clearing layer and sovereign custody infrastructure
              for physical bullion.
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
              <li>
                <Link
                  href="/platform-overview"
                  className="hover:text-white transition-colors"
                >
                  Platform Dossier
                </Link>
              </li>
              <li>
                <Link
                  href="/technical-overview"
                  className="hover:text-white transition-colors"
                >
                  System Architecture
                </Link>
              </li>
              <li>
                <a
                  href={`${APP_URL}/login`}
                  className="hover:text-white transition-colors"
                >
                  Client Portal
                </a>
              </li>
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
              <li>
                <Link
                  href="/legal/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/aml-kyc"
                  className="hover:text-white transition-colors"
                >
                  AML &amp; KYC Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/risk-reinsurance"
                  className="hover:text-white transition-colors"
                >
                  Risk &amp; Reinsurance
                </Link>
              </li>
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
              <a
                href="tel:+18652757300"
                className="text-lg font-mono font-bold text-white hover:text-gold transition-colors block mt-1"
              >
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
            &copy; {new Date().getFullYear()} AurumShield Platform. All rights
            reserved.
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

      {/* ── Live Engine Telemetry ── */}
      <section className="py-24 lg:py-32 bg-[#0A1128] border-b border-slate-800/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,168,107,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 w-full relative z-10">
          <div className="mb-12 max-w-3xl text-left items-start">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-8 bg-gold/50" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                LIVE ENGINE TELEMETRY
              </p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Deterministic Settlement. Zero Counterparty Risk.
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Trust is a liability in physical markets. Watch our clearing engine
              in real-time as it locks capital, verifies sovereign vault
              provenance, and executes a flawless Delivery-versus-Payment (DvP)
              swap with absolute finality.
            </p>
          </div>

          <TelemetryTerminal />
        </div>
      </section>

      <ExposureSection />
      <RiskModelSection />
      <VaultDivider />
      <ArchitectureSection />
      <ComplianceSection />
      <ComplianceGate />
      <BuyerJourneySection />
      <SovereignAssetsSection />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
