import Image from "next/image";

/* ================================================================
   GOLDWIRE — Investor One-Sheet
   Route: /investor
   
   A single-page, print-ready investor brief designed for 
   in-person presentations. Goldwire-branded. No navigation chrome.
   ================================================================ */

export const metadata = {
  title: "Goldwire — Investor Brief",
  description:
    "Confidential investor one-sheet for the Goldwire instant settlement protocol by AurumShield.",
};

export default function InvestorOneSheet() {
  return (
    <div className="inv-page">
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

        /* ── Hero Banner ── */
        .inv-hero {
          position: relative;
          padding: 5rem 2rem 4rem;
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
          left: 10%;
          right: 10%;
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
          margin: 0 0 1rem;
          line-height: 1.15;
        }
        .inv-hero h1 span { color: var(--gold); }
        .inv-hero-sub {
          font-size: 1.1rem;
          color: var(--muted);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* ── Container ── */
        .inv-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 3rem 2rem;
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
          margin-bottom: 3rem;
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

        /* ── The Opportunity section ── */
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
          margin-bottom: 2rem;
        }

        /* ── Metric Cards ── */
        .inv-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 3rem;
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

        /* ── How It Works / Pipeline ── */
        .inv-pipeline {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 3rem;
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
          margin-bottom: 3rem;
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
          color: var(--gold);
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

        /* ── Competitive Moat ── */
        .inv-moat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 3rem;
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
        }
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

        /* ── CTA Banner ── */
        .inv-cta {
          background: var(--surface);
          border: 1px solid rgba(198,168,107,0.2);
          border-radius: 16px;
          padding: 3rem;
          text-align: center;
          position: relative;
          overflow: hidden;
          margin-bottom: 2rem;
        }
        .inv-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(198,168,107,0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .inv-cta h2 {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 0.75rem;
          position: relative;
        }
        .inv-cta p {
          color: var(--muted);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto 2rem;
          line-height: 1.6;
          position: relative;
        }
        .inv-cta-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          position: relative;
          flex-wrap: wrap;
        }
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
          transition: background 0.2s;
        }
        .inv-btn-primary:hover { background: var(--gold-light); }
        .inv-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: transparent;
          color: var(--gold);
          font-weight: 600;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: 1px solid rgba(198,168,107,0.4);
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .inv-btn-secondary:hover { border-color: var(--gold); background: rgba(198,168,107,0.06); }

        /* ── Footer ── */
        .inv-footer {
          border-top: 1px solid var(--border);
          padding: 2rem;
          text-align: center;
        }
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
          margin: 3rem 0;
        }

        /* ── Print ── */
        @media print {
          .inv-page { background: white; color: #1a1a1a; }
          .inv-page * { color: #1a1a1a !important; border-color: #ddd !important; }
          .inv-hero, .inv-metric, .inv-pipe-step, .inv-rev-card, .inv-moat-item, .inv-cta, .inv-card-showcase {
            background: white !important;
            border: 1px solid #ddd !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .inv-metric { border-top: 2px solid #C6A86B !important; }
          .inv-metric-value, .inv-gold-text { color: #9F8A4C !important; }
          .inv-card-glow { display: none; }
        }
      `,
        }}
      />

      {/* ════════════════════════════════════════════
          HERO — Logo + One-liner
          ════════════════════════════════════════════ */}
      <header className="inv-hero">
        <div className="inv-hero-badge">Confidential — Investor Distribution Only</div>
        <Image
          src="/goldwire-logo.svg"
          alt="Goldwire"
          width={280}
          height={86}
          priority
          style={{ marginBottom: "1.5rem" }}
          unoptimized
        />
        <h1>
          Instant Cross-Border Settlement<br />
          <span>Powered by Physical Gold.</span>
        </h1>
        <p className="inv-hero-sub">
          Goldwire is a high-velocity B2B settlement protocol that uses allocated physical
          gold as a transport layer — bypassing SWIFT, eliminating counterparty risk, and
          settling millions in seconds.
        </p>
      </header>

      <div className="inv-container">
        {/* ════════════════════════════════════════════
            THE OPPORTUNITY
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">Market Opportunity</div>
        <h2 className="inv-h2">A $13.4 Trillion Market with No Clearing Layer</h2>
        <p className="inv-lead">
          Cross-border B2B payments total over $150 trillion annually, yet settlement still
          relies on SWIFT — a 50-year-old messaging system with T+2 delays, 3–5% FX spreads,
          and zero finality guarantees. Physical gold trades bilaterally at $13.4T annual
          volume with no centralized clearing authority.
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
            CARD SHOWCASE — Goldwire Card + Value Prop
            ════════════════════════════════════════════ */}
        <div className="inv-card-showcase">
          <div>
            <div className="inv-section-title">The Product</div>
            <h2>
              The Goldwire <span>Sovereign Settlement Card.</span>
            </h2>
            <p>
              Every Goldwire participant receives sovereign-tier infrastructure access. The
              physical card represents membership in a closed network of institutional
              counterparties who settle in real-time via allocated bullion — no banks, no
              SWIFT, no delays.
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
              <span>✦ T+0 Finality</span>
              <span>✦ No FX Exposure</span>
              <span>✦ No Intermediaries</span>
            </div>
          </div>
          <div className="inv-card-image-wrap">
            <Image
              src="/gold-wire.png"
              alt="Goldwire Sovereign Settlement Card — brushed metal corporate charge card"
              width={480}
              height={305}
              style={{ width: "100%", height: "auto", maxWidth: 480 }}
            />
            <div className="inv-card-glow" />
          </div>
        </div>

        {/* ════════════════════════════════════════════
            HOW IT WORKS — 3-Step Pipeline
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">How It Works</div>
        <h2 className="inv-h2">The Goldwire Settlement Pipeline</h2>
        <p className="inv-lead">
          A vertically integrated, three-phase process that converts fiat → gold → fiat
          across borders in under 60 seconds.
        </p>

        <div className="inv-pipeline">
          <div className="inv-pipe-step">
            <div className="inv-pipe-num">01</div>
            <h3>Wholesale Gold Sourcing</h3>
            <p>
              Sender deposits fiat to the Goldwire master treasury. We instantly purchase
              allocated physical bullion direct from vetted mine originators at wholesale
              spreads. Custody: Malca-Amit sovereign vaults.
            </p>
          </div>
          <div className="inv-pipe-step">
            <div className="inv-pipe-num">02</div>
            <h3>Deterministic Title Transfer</h3>
            <p>
              The Goldwire protocol cryptographically reassigns legal title of the physical
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
            REVENUE MODEL
            ════════════════════════════════════════════ */}
        <div className="inv-section-title">Revenue Architecture</div>
        <h2 className="inv-h2">Multi-Layer Fee Extraction on Every Transaction</h2>
        <p className="inv-lead">
          Goldwire earns on every leg of the settlement lifecycle — from wholesale sourcing
          spreads to clearing fees to liquidation commissions.
        </p>

        <div className="inv-revenue">
          <div className="inv-rev-card">
            <h3>Per-Transaction Revenue</h3>
            <div className="inv-rev-row">
              <span>Wholesale Sourcing Spread</span>
              <span>0.25 – 0.50%</span>
            </div>
            <div className="inv-rev-row">
              <span>Clearing & Settlement Fee</span>
              <span>0.15 – 0.30%</span>
            </div>
            <div className="inv-rev-row">
              <span>Liquidation Commission</span>
              <span>0.10 – 0.25%</span>
            </div>
            <div className="inv-rev-row">
              <span>Transit Insurance (actuarial)</span>
              <span>0.05 – 0.08%</span>
            </div>
            <div className="inv-rev-row" style={{ borderTop: "1px solid var(--gold)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <span style={{ fontWeight: 700 }}>Total Blended Take</span>
              <span style={{ fontSize: "1.125rem" }}>0.55 – 1.13%</span>
            </div>
          </div>
          <div className="inv-rev-card">
            <h3>Recurring Revenue</h3>
            <div className="inv-rev-row">
              <span>Platform Access (Annual)</span>
              <span>$25K–$100K</span>
            </div>
            <div className="inv-rev-row">
              <span>Sovereign Vaulting Custody</span>
              <span>15 – 25 bps / yr</span>
            </div>
            <div className="inv-rev-row">
              <span>Compliance & KYB Screening</span>
              <span>Per Entity</span>
            </div>
            <div className="inv-rev-row">
              <span>API Integration (Enterprise)</span>
              <span>Custom</span>
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
              <h4>Vertically Integrated Supply Chain</h4>
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
              <p>Each new institutional participant increases liquidity depth and reduces settlement latency for the entire network.</p>
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
            CTA BANNER
            ════════════════════════════════════════════ */}
        <div className="inv-cta">
          <h2>Ready to Discuss?</h2>
          <p>
            Goldwire is currently onboarding strategic investors and institutional launch
            partners for our Series A.
          </p>
          <div className="inv-cta-actions">
            <a href="mailto:investors@aurumshield.vip" className="inv-btn-primary">
              Contact Investor Relations →
            </a>
            <a href="/platform-overview" className="inv-btn-secondary">
              View Technical Architecture →
            </a>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="inv-footer">
        <p>
          © {new Date().getFullYear()} AurumShield · Goldwire Protocol · Confidential — Not for Public Distribution
        </p>
      </footer>
    </div>
  );
}
