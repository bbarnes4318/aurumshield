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
  Lock,
  Menu,
  X,
} from "lucide-react";

/* ── Section Imports ── */
import { HeroSection } from "./sections/hero";
import { InstitutionalTrustMarquee } from "./sections/trust-marquee";
import { InstitutionalInfrastructureGrid } from "./sections/infrastructure-grid";
import { InstitutionalBarShowcase } from "./sections/bar-showcase";
import { GoldwireLiquiditySimulator } from "./sections/liquidity-simulator";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

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
            <Link href="/" className="flex items-center flex-shrink-0">
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
          <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0">
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
        className={`fixed inset-0 z-[60] bg-black/80 transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* ── Mobile Menu Panel ── */}
      <div
        ref={menuRef}
        className={`fixed inset-y-0 right-0 z-[60] w-72 max-w-[85vw] bg-[#0A1128] border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
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
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white mb-4">
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

          <div className="border-t border-slate-800 bg-white/[0.02] px-6 py-5 text-center">
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

      {/* #1 — THE HOOK */}
      <HeroSection />
      <InstitutionalTrustMarquee />

      {/* #2 — THE PHILOSOPHY: Own the Asset, Not the Promise */}
      <InstitutionalInfrastructureGrid />

      {/* #3 — THE PROOF: Industrial Scale. Institutional Precision */}
      <InstitutionalBarShowcase />

      {/* #4 — THE UTILITY: Physical-to-Fiat. Zero Extraction Delay */}
      <GoldwireLiquiditySimulator />

      {/* #5 — THE CLOSE */}
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
