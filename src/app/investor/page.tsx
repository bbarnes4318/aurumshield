import Image from "next/image";
import { GoldwireBrandLogo } from "@/components/ui/goldwire-logo";
import { Navigation } from "@/components/marketing/marketing-landing";
import { InvestorContactForm } from "@/components/marketing/investor-contact-form";

/* ================================================================
   GOLDWIRE — Investor One-Sheet
   Route: /investor

   Standalone institutional investor brief. Clean marketing layout
   with centered hero, waterfall chart, and embedded contact form.
   ================================================================ */

export const metadata = {
  title: "Goldwire — Investor Brief",
  description:
    "Confidential investor one-sheet for the Goldwire instant settlement protocol by AurumShield.",
};

export default function InvestorOneSheet() {
  return (
    <div className="inv-page">
      <Navigation />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* ── Investor One-Sheet Design System ── */
        .inv-page {
          --bg: #0A0E1A;
          --surface: #0E1425;
          --surface-2: #131B2E;
          --border: #1E293B;
          --text: #F1F5F9;
          --muted: #94A3B8;
          --faint: #64748B;
          --gold: #C6A86B;
          --gold-light: #E3C888;
          --gold-dark: #9F8A4C;
          --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
          --font-mono: 'Cascadia Code', 'Source Code Pro', Consolas, monospace;
          --font-serif: 'Source Serif 4', Georgia, serif;

          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Hero Banner — Centered ── */
        .inv-hero {
          position: relative;
          padding: 8rem 2rem 5rem;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid var(--border);
          background:
            radial-gradient(ellipse at 50% 0%, rgba(198,168,107,0.08) 0%, transparent 60%),
            var(--bg);
        }
        .inv-hero::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          opacity: 0.3;
        }
        .inv-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(198,168,107,0.25);
          background: rgba(198,168,107,0.06);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--gold);
          margin-bottom: 2rem;
        }
        .inv-hero-badge::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
        }
        .inv-hero h1 {
          font-family: var(--font-serif);
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text);
          margin: 0 0 1.25rem;
          line-height: 1.15;
        }
        .inv-hero h1 span { color: var(--gold); }
        .inv-hero-sub {
          font-size: 1.1rem;
          color: var(--muted);
          max-width: 640px;
          margin: 0 auto 2.5rem;
          line-height: 1.7;
        }
        .inv-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2.5rem;
          background: var(--gold);
          color: #0A0E1A;
          font-weight: 700;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .inv-hero-cta:hover { background: var(--gold-light); }

        /* ── Container ── */
        .inv-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }

        /* ── Card with Goldwire card image ── */
        .inv-card-showcase {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          padding: 3rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 4rem;
        }
        @media (max-width: 768px) {
          .inv-card-showcase { grid-template-columns: 1fr; text-align: center; }
        }
        .inv-card-showcase h2 {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 1rem;
          letter-spacing: -0.02em;
        }
        .inv-card-showcase h2 span { color: var(--gold); }
        .inv-card-showcase p {
          color: var(--muted);
          font-size: 0.925rem;
          line-height: 1.7;
          margin: 0 0 1.5rem;
        }
        .inv-card-image-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .inv-card-image-wrap img {
          filter: drop-shadow(0 20px 40px rgba(198,168,107,0.15));
        }
        .inv-card-glow {
          width: 70%;
          height: 24px;
          margin-top: 12px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(198,168,107,0.3) 0%, transparent 70%);
          filter: blur(8px);
        }

        /* ── Section Titles ── */
        .inv-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-sans);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--gold);
          margin-bottom: 1rem;
        }
        .inv-section-title::before {
          content: '';
          display: inline-block;
          width: 32px;
          height: 1px;
          background: var(--gold);
          opacity: 0.5;
        }
        .inv-h2 {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          margin: 0 0 0.75rem;
        }
        .inv-lead {
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.65;
          max-width: 720px;
          margin-bottom: 2.5rem;
        }

        /* ── Metric Cards ── */
        .inv-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 4rem;
        }
        @media (max-width: 768px) {
          .inv-metrics { grid-template-columns: repeat(2, 1fr); }
        }
        .inv-metric {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 2px solid var(--gold);
          border-radius: 10px;
          padding: 1.25rem;
          text-align: center;
        }
        .inv-metric-value {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--gold-light);
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .inv-metric-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--faint);
        }

        /* ── Pipeline ── */
        .inv-pipeline {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 4rem;
        }
        @media (max-width: 768px) {
          .inv-pipeline { grid-template-columns: 1fr; }
        }
        .inv-pipe-step {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          position: relative;
          transition: border-color 0.2s;
        }
        .inv-pipe-step:hover {
          border-color: rgba(198,168,107,0.3);
        }
        .inv-pipe-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(198,168,107,0.1);
          border: 1px solid rgba(198,168,107,0.2);
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--gold);
          margin-bottom: 1rem;
        }
        .inv-pipe-step h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 0.5rem;
        }
        .inv-pipe-step p {
          font-size: 0.8125rem;
          color: var(--muted);
          line-height: 1.6;
          margin: 0;
        }

        /* ── Revenue Model ── */
        .inv-revenue {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
          margin-bottom: 4rem;
        }
        @media (max-width: 768px) {
          .inv-revenue { grid-template-columns: 1fr; }
        }
        .inv-rev-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
        }
        .inv-rev-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 1rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: var(--font-sans);
        }
        .inv-rev-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.875rem;
        }
        .inv-rev-row:last-child { border-bottom: none; }
        .inv-rev-row span:first-child { color: var(--muted); }
        .inv-rev-row span:last-child {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--gold-light);
        }

        /* ── Waterfall Chart ── */
        .inv-waterfall {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 4rem;
        }
        .inv-waterfall h3 {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 1.5rem;
          text-align: center;
        }
        .inv-bar-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .inv-bar-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .inv-bar-label {
          width: 200px;
          flex-shrink: 0;
          font-size: 0.8125rem;
          color: var(--muted);
          text-align: right;
        }
        @media (max-width: 768px) {
          .inv-bar-label { width: 120px; font-size: 0.75rem; }
        }
        .inv-bar-track {
          flex: 1;
          height: 32px;
          background: rgba(255,255,255,0.03);
          border-radius: 6px;
          position: relative;
          overflow: hidden;
        }
        .inv-bar-fill {
          height: 100%;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          color: #0A0E1A;
        }
        .inv-bar-total .inv-bar-fill {
          background: linear-gradient(90deg, var(--gold-dark), var(--gold-light));
        }

        /* ── Competitive Moat ── */
        .inv-moat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 4rem;
        }
        @media (max-width: 768px) {
          .inv-moat-grid { grid-template-columns: 1fr; }
        }
        .inv-moat-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem;
          transition: border-color 0.2s;
        }
        .inv-moat-item:hover { border-color: rgba(198,168,107,0.2); }
        .inv-moat-bullet {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--gold);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .inv-moat-item h4 {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 0.25rem;
        }
        .inv-moat-item p {
          font-size: 0.8125rem;
          color: var(--muted);
          line-height: 1.5;
          margin: 0;
        }

        /* ── Contact Form ── */
        .inv-form-section {
          background: var(--surface);
          border: 1px solid rgba(198,168,107,0.2);
          border-radius: 16px;
          padding: 3rem;
          position: relative;
          overflow: hidden;
          margin-bottom: 4rem;
        }
        .inv-form-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(198,168,107,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .inv-form-section h2 {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 0.5rem;
          text-align: center;
          position: relative;
        }
        .inv-form-section > p {
          color: var(--muted);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto 2rem;
          line-height: 1.6;
          text-align: center;
          position: relative;
        }
        .inv-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          max-width: 640px;
          margin: 0 auto;
          position: relative;
        }
        @media (max-width: 600px) {
          .inv-form-grid { grid-template-columns: 1fr; }
        }
        .inv-form-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .inv-form-field.full-width {
          grid-column: 1 / -1;
        }
        .inv-form-field label {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--faint);
        }
        .inv-form-field input,
        .inv-form-field select,
        .inv-form-field textarea {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: var(--text);
          font-size: 0.875rem;
          font-family: var(--font-sans);
          outline: none;
          transition: border-color 0.2s;
        }
        .inv-form-field input:focus,
        .inv-form-field select:focus,
        .inv-form-field textarea:focus {
          border-color: var(--gold);
        }
        .inv-form-field textarea {
          min-height: 100px;
          resize: vertical;
        }
        .inv-form-field select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394A3B8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }
        .inv-form-submit {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          margin-top: 0.5rem;
        }

        /* ── Footer ── */
        .inv-footer {
          border-top: 1px solid var(--border);
          padding: 3rem 2rem;
          text-align: center;
        }
        .inv-footer-brand {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }
        .inv-footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .inv-footer-links a {
          font-size: 0.75rem;
          color: var(--faint);
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: color 0.2s;
        }
        .inv-footer-links a:hover { color: var(--gold); }
        .inv-footer p {
          font-size: 0.6875rem;
          color: var(--faint);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin: 0;
        }

        /* ── Divider ── */
        .inv-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
          margin: 4rem 0;
        }

        /* ── Buttons ── */
        .inv-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: var(--gold);
          color: #0A0E1A;
          font-weight: 700;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-radius: 8px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .inv-btn-primary:hover { background: var(--gold-light); }

        /* ── Print ── */
        @media print {
          .inv-page { background: white; color: #1a1a1a; }
          .inv-page * { color: #1a1a1a !important; border-color: #ddd !important; }
          .inv-hero, .inv-metric, .inv-pipe-step, .inv-rev-card, .inv-moat-item, .inv-form-section, .inv-card-showcase, .inv-waterfall {
            background: white !important;
            border: 1px solid #ddd !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .inv-metric { border-top: 2px solid #C6A86B !important; }
          .inv-metric-value { color: #9F8A4C !important; }
          .inv-card-glow { display: none; }
        }
      `,
        }}
      />

      {/* ════════════════════════════════════════════
          HERO — Centered, Institutional
          ════════════════════════════════════════════ */}
      <header className="inv-hero">
        <div className="inv-hero-badge">Confidential — Investor Distribution Only</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <GoldwireBrandLogo />
        </div>
        <h1>
          Bypassing SWIFT.<br />
          <span>Settling Millions in Seconds.</span>
        </h1>
        <p className="inv-hero-sub">
          Goldwire is a high-velocity B2B settlement protocol that uses allocated physical
          gold as a transport layer — bypassing SWIFT, eliminating counterparty risk, and
          settling millions in seconds.
        </p>
        <a href="#contact" className="inv-hero-cta">
          Schedule a Meeting →
        </a>
      </header>

      <div className="inv-container">
        {/* ════════════════════════════════════════════
            THE PROBLEM
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">The Problem</div>
        <h2 className="inv-h2">The Problem: Legacy Banking Friction</h2>
        <p className="inv-lead">
          Moving $5M across borders today bleeds 1% to 3% in hidden FX spreads, counterparty
          risk, and compliance overhead. Settlement takes T+2 to T+5 via SWIFT — a 50-year-old
          messaging system with zero finality guarantees. Physical gold trades bilaterally at
          $13.4T annual volume with no centralized clearing authority.
        </p>

        <div className="inv-metrics">
          <div className="inv-metric">
            <span className="inv-metric-value">$13.4T</span>
            <span className="inv-metric-label">Annual Gold Market</span>
          </div>
          <div className="inv-metric">
            <span className="inv-metric-value">T+0</span>
            <span className="inv-metric-label">Settlement Finality</span>
          </div>
          <div className="inv-metric">
            <span className="inv-metric-value">0%</span>
            <span className="inv-metric-label">Counterparty Risk</span>
          </div>
          <div className="inv-metric">
            <span className="inv-metric-value">&lt;10s</span>
            <span className="inv-metric-label">Title Transfer</span>
          </div>
        </div>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            THE CORE PRODUCT
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">The Core Product</div>
        <h2 className="inv-h2">The Goldwire Settlement Engine</h2>
        <p className="inv-lead">
          AurumShield is an institutional clearinghouse that replaces legacy banking rails with
          the Goldwire Network. We utilize fully allocated, serialized physical gold — stored
          in Tier-1 sovereign vaults (Malca-Amit) — as a high-velocity, deterministic transport
          layer for cross-border corporate settlement.
        </p>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            THE ELITE INTERFACE — Goldwire Corporate Card
            ════════════════════════════════════════════ */}
        <div className="inv-card-showcase">
          <div>
            <div className="inv-section-title">The Elite Interface</div>
            <h2>
              The Goldwire <span>Corporate Card.</span>
            </h2>
            <p>
              While the Goldwire API handles massive corporate treasury flows, we anchor our
              digital network in physical reality for UHNW individuals and executives. The
              heavy-metal Goldwire Card is the ultimate sovereign wealth instrument, allowing
              clients to instantly liquidate their vaulted bullion to local fiat at any point
              of sale globally.
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                fontSize: "0.8125rem",
                color: "var(--gold)",
                fontWeight: 600,
              }}
            >
              <span>✦ Instant Bullion Liquidation</span>
              <span>✦ Global POS Access</span>
              <span>✦ Heavy-Metal Sovereign Tier</span>
            </div>
          </div>
          <div className="inv-card-image-wrap">
            <Image
              src="/gold-wire.png"
              alt="Goldwire Corporate Card — brushed metal sovereign-tier instrument"
              width={480}
              height={305}
              style={{ width: "100%", height: "auto", maxWidth: 480 }}
            />
            <div className="inv-card-glow" />
          </div>
        </div>

        {/* ════════════════════════════════════════════
            HOW IT WORKS — Goldwire Settlement Pipeline
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">How It Works</div>
        <h2 className="inv-h2">The Goldwire Settlement Pipeline</h2>
        <p className="inv-lead">
          A vertically integrated, three-phase process that converts fiat → gold → fiat
          across borders in under 60 seconds. Phase 1 includes stablecoin on-ramp support
          for instant fiat conversion.
        </p>

        <div className="inv-pipeline">
          <div className="inv-pipe-step">
            <div className="inv-pipe-num">01</div>
            <h3>Wholesale Gold Sourcing</h3>
            <p>
              Sender deposits fiat (or stablecoin) to the Goldwire master treasury. We instantly
              purchase allocated physical bullion direct from vetted mine originators at wholesale
              spreads. Custody: Malca-Amit sovereign vaults.
            </p>
          </div>
          <div className="inv-pipe-step">
            <div className="inv-pipe-num">02</div>
            <h3>Deterministic Title Transfer</h3>
            <p>
              The Goldwire Protocol cryptographically reassigns legal title of the physical
              metal inside the vault in under 10 seconds. No physical movement. No transport
              risk. Atomic, auditable, irreversible.
            </p>
          </div>
          <div className="inv-pipe-step">
            <div className="inv-pipe-num">03</div>
            <h3>Local Fiat Liquidation</h3>
            <p>
              Recipient clicks liquidate. Our API sells the gold to regional OTC Liquidity
              Partners (e.g., Dubai, London, Zurich) who instantly wire local fiat to the
              recipient&apos;s corporate account.
            </p>
          </div>
        </div>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            UNIT ECONOMICS + WATERFALL CHART
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">Unit Economics</div>
        <h2 className="inv-h2">{`The "Principal Market Maker" Advantage`}</h2>
        <p className="inv-lead">
          AurumShield does not rely on standard, low-margin SaaS fees. By vertically integrating
          the gold supply chain and acting as the principal dealer, we capture massive,
          multi-layered spreads on every cross-border transaction.
        </p>

        {/* Waterfall Margin Chart */}
        <div className="inv-waterfall">
          <h3>Cumulative Gross Margin Per Transaction</h3>
          <div className="inv-bar-container">
            <div className="inv-bar-row">
              <span className="inv-bar-label">Mine-to-Market Spread</span>
              <div className="inv-bar-track">
                <div className="inv-bar-fill" style={{ width: "75%", background: "rgba(198,168,107,0.7)" }}>
                  ~4.0 – 5.0%
                </div>
              </div>
            </div>
            <div className="inv-bar-row">
              <span className="inv-bar-label">Network Execution Fee</span>
              <div className="inv-bar-track">
                <div className="inv-bar-fill" style={{ width: "16%", background: "rgba(198,168,107,0.5)" }}>
                  1.0%
                </div>
              </div>
            </div>
            <div className="inv-bar-row">
              <span className="inv-bar-label">Off-Ramp Arbitrage</span>
              <div className="inv-bar-track">
                <div className="inv-bar-fill" style={{ width: "14%", background: "rgba(198,168,107,0.4)" }}>
                  ~0.9%
                </div>
              </div>
            </div>
            <div className="inv-bar-row inv-bar-total" style={{ marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--gold)" }}>
              <span className="inv-bar-label" style={{ fontWeight: 700, color: "var(--gold-light)" }}>Total Gross Margin</span>
              <div className="inv-bar-track">
                <div className="inv-bar-fill" style={{ width: "95%" }}>
                  ~6.0%+ per txn
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="inv-revenue">
          <div className="inv-rev-card">
            <h3>Per-Transaction Revenue</h3>
            <div className="inv-rev-row">
              <span>Mine-to-Market Spread (Primary)</span>
              <span>~4.0 – 5.0%</span>
            </div>
            <div className="inv-rev-row">
              <span>Network Execution Fee</span>
              <span style={{ fontWeight: 700 }}>1.0%</span>
            </div>
            <div className="inv-rev-row">
              <span>Off-Ramp Arbitrage (OTC Desks)</span>
              <span>~0.9%</span>
            </div>
            <div className="inv-rev-row" style={{ borderTop: "1px solid var(--gold)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <span style={{ fontWeight: 700 }}>Total Gross Margin</span>
              <span style={{ fontSize: "1.125rem" }}>~6.0%+ per txn</span>
            </div>
          </div>
          <div className="inv-rev-card">
            <h3>Revenue Detail</h3>
            <div className="inv-rev-row">
              <span style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text)" }}>Mine-to-Market Spread:</strong>{" "}
                We source physical supply directly from mine originators at a severe wholesale
                discount and sell to the buyer at institutional spot prices — capturing a
                massive ~4.0% to 5.0% spread on every fiat on-ramp.
              </span>
            </div>
            <div className="inv-rev-row">
              <span style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text)" }}>Network Execution Fee:</strong>{" "}
                A flat <strong>1.0%</strong> routing fee applied to every Goldwire title
                transfer on the platform.
              </span>
            </div>
            <div className="inv-rev-row">
              <span style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text)" }}>Off-Ramp Arbitrage:</strong>{" "}
                An additional ~0.9% spread captured upon automated liquidation to our
                regional OTC refining desks.
              </span>
            </div>
          </div>
        </div>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            COMPETITIVE MOAT
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">Structural Advantages</div>
        <h2 className="inv-h2">Why This Cannot Be Easily Replicated</h2>

        <div className="inv-moat-grid">
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Vertical Supply Chain Integration</h4>
              <p>Direct mine-to-vault pipeline. No third-party sourcing intermediaries. Wholesale pricing locked at the origin.</p>
            </div>
          </div>
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Sovereign Vault Network</h4>
              <p>Exclusive Malca-Amit custody agreements in London, Zurich, Dubai, Singapore, and New York.</p>
            </div>
          </div>
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Regulatory-First Architecture</h4>
              <p>Full biometric KYC/AML perimeter. OFAC, EU, UN sanctions screening on every counterparty. Append-only audit ledger.</p>
            </div>
          </div>
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Deterministic Settlement Engine</h4>
              <p>Custom-built atomic DvP clearing engine with SHA-256 signed certificates. No probabilistic consensus — pure finality.</p>
            </div>
          </div>
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Network Effects</h4>
              <p>Each new institutional participant increases liquidity depth and reduces settlement latency for the entire Goldwire Network.</p>
            </div>
          </div>
          <div className="inv-moat-item">
            <div className="inv-moat-bullet" />
            <div>
              <h4>Physical Asset Backing</h4>
              <p>Unlike crypto or stablecoins, every Goldwire transaction is backed 1:1 by allocated, insured physical gold in sovereign vaults.</p>
            </div>
          </div>
        </div>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            TRACTION & PHASE 1
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">Traction</div>
        <h2 className="inv-h2">Phase 1: Launch Readiness</h2>
        <div style={{ marginBottom: "2rem" }}>
          <div className="inv-moat-grid">
            <div className="inv-moat-item">
              <div className="inv-moat-bullet" />
              <div>
                <h4>Platform Complete</h4>
                <p>Full institutional clearing platform live with biometric KYC/AML, DvP settlement engine, and compliance perimeter.</p>
              </div>
            </div>
            <div className="inv-moat-item">
              <div className="inv-moat-bullet" />
              <div>
                <h4>Dubai Liquidity Partnership</h4>
                <p>Signed terms with a UAE-corridor refining desk providing immediate fiat off-ramps via a stablecoin settlement bridge for instant AED/USD liquidation.</p>
              </div>
            </div>
            <div className="inv-moat-item">
              <div className="inv-moat-bullet" />
              <div>
                <h4>Supply Chain Secured</h4>
                <p>Direct mine originator relationships in West Africa and South America with wholesale pricing locked at source.</p>
              </div>
            </div>
            <div className="inv-moat-item">
              <div className="inv-moat-bullet" />
              <div>
                <h4>Stablecoin On-Ramp Integration</h4>
                <p>Phase 1 includes full stablecoin bridge support (USDC/USDT) for instant fiat-to-gold conversion, eliminating traditional banking wire delays.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="inv-divider" />

        {/* ════════════════════════════════════════════
            CONTACT FORM
            ════════════════════════════════════════════ */}
        <div className="inv-form-section" id="contact">
          <h2>Ready to Discuss?</h2>
          <p>
            The Goldwire Network is currently onboarding strategic investors and institutional
            launch partners for our Series A.
          </p>
          <InvestorContactForm />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="inv-footer">
        <div className="inv-footer-brand">
          <GoldwireBrandLogo />
        </div>
        <div className="inv-footer-links">
          <a href="/platform-overview">Technical Architecture</a>
          <a href="/legal/terms">Terms of Service</a>
          <a href="/legal/privacy">Privacy Policy</a>
          <a href="/legal/aml-kyc">AML/KYC Policy</a>
          <a href="mailto:investors@aurumshield.vip">Investor Relations</a>
        </div>
        <p>
          © {new Date().getFullYear()} AurumShield · Goldwire Protocol · Confidential — Not for Public Distribution
        </p>
      </footer>
    </div>
  );
}
