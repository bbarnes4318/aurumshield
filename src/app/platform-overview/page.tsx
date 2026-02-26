import Image from "next/image";
import { headers } from "next/headers";

/* ─── Context-aware back CTA ─── */
async function getBackCta() {
  const hdrs = await headers();
  const ref = hdrs.get("referer") ?? "";

  const fromApp =
    ref.includes("app.aurumshield.vip") ||
    ref.includes("/login") ||
    ref.includes("/platform");

  if (fromApp) {
    return {
      label: "Back to Platform",
      href: "/login",
    };
  }

  return {
    label: "Back to Home",
    href: "/",
  };
}

/* ================================================================
   PLATFORM CAPABILITIES — v2.0.0 Investor-Grade Technical Overview
   Route: /platform-overview
   Renders outside the app shell (no sidebar/topbar).

   Table of Contents:
   1.  Executive Summary
   2.  The Problem
   3.  The Solution
   4.  Platform Architecture
   5.  Core Clearing Engine
   6.  Capital Adequacy Framework
   7.  Policy & Risk Engine
   8.  Onboarding & Identity Perimeter
   9.  Passkey Authentication & Authorization
   10. Marketplace Infrastructure
   11. Checkout & Price-Lock Flow
   12. Dual-Rail Settlement
   13. Transit Insurance & Logistics
   14. Document Verification & eSignature
   15. Certificate Engine
   16. Fee Model & Pricing
   17. Settlement Activation Gate
   18. Security Architecture
   19. Strategic Alignment
   20. Interactive Demo System
   ================================================================ */

export default async function PlatformCapabilitiesPage() {
  const back = await getBackCta();

  return (
    <div className="platform-page">
      {/* ─── Embedded Styles (unchanged brand system) ─── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .platform-page {
          --bg: #0b1220;
          --surface-1: #0f1a2b;
          --surface-2: #13233a;
          --surface-3: #182b46;
          --border: #243653;
          --text: #e7ecf4;
          --text-muted: #aab6c8;
          --text-faint: #7f8ca3;
          --gold: #c6a86b;
          --gold-hover: #d3b77d;
          --success: #3fae7a;
          --warning: #d0a85c;
          --danger: #d16a5d;
          --info: #5a8ccb;
          --radius: 12px;
          --radius-sm: 8px;
          --font-sans: 'IBM Plex Sans', var(--font-ibm-plex-sans), system-ui, sans-serif;
          --font-serif: 'Source Serif 4', var(--font-source-serif), Georgia, serif;
          --font-mono: 'Cascadia Code', 'Source Code Pro', Consolas, monospace;

          background-color: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          line-height: 1.6;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .platform-page a { color: var(--gold); text-decoration: none; transition: color 0.2s; }
        .platform-page a:hover { color: var(--gold-hover); }

        .platform-page h1,
        .platform-page h2,
        .platform-page h3,
        .platform-page h4 {
          font-family: var(--font-serif);
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .plat-header {
          background: var(--surface-1);
          border-bottom: 1px solid var(--border);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .plat-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .plat-logo { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
        .plat-back-link { color: var(--text-faint); font-size: 0.8125rem; text-decoration: none; display: flex; align-items: center; gap: 0.25rem; transition: color 0.2s; }
        .plat-back-link:hover { color: var(--gold); }
        .plat-badge {
          display: inline-block;
          padding: 0.25em 0.75em;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(208, 168, 92, 0.1);
          color: var(--warning);
          border: 1px solid rgba(208, 168, 92, 0.2);
        }
        .plat-meta { text-align: right; font-size: 0.875rem; color: var(--text-faint); }

        .plat-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 4rem;
        }
        @media (max-width: 1024px) {
          .plat-container { grid-template-columns: 1fr; }
          .plat-sidebar { display: none; }
        }

        .plat-sidebar { position: sticky; top: 5rem; height: fit-content; }
        .plat-toc {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.5rem;
        }
        .plat-toc-title {
          margin: 0 0 0.75rem;
          font-family: var(--font-sans) !important;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-faint);
        }
        .plat-toc ul { list-style: none; padding: 0; margin: 0; }
        .plat-toc li { margin-bottom: 0.4rem; }
        .plat-toc a {
          color: var(--text-muted);
          font-size: 0.825rem;
          display: block;
          padding: 0.2rem 0;
          transition: color 0.2s, transform 0.2s;
        }
        .plat-toc a:hover { color: var(--gold); transform: translateX(4px); }

        .plat-card {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .plat-card h1 { font-size: 2.25rem; letter-spacing: -0.02em; border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-top: 0; }
        .plat-section h2 { font-size: 1.6rem; letter-spacing: -0.01em; color: var(--gold); margin-top: 2.5rem; margin-bottom: 1rem; }
        .plat-section h3 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .plat-section p { margin-bottom: 1rem; color: var(--text-muted); font-size: 0.925rem; }
        .plat-section strong { color: var(--text); font-weight: 600; }
        .plat-section ul, .plat-section ol { color: var(--text-muted); margin-bottom: 1rem; padding-left: 1.25rem; }
        .plat-section li { margin-bottom: 0.35rem; font-size: 0.925rem; }

        .plat-code {
          font-family: var(--font-mono);
          background: var(--surface-3);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.85em;
          color: var(--gold);
        }
        .plat-pre {
          background: var(--surface-1);
          padding: 1.5rem;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          overflow-x: auto;
          margin-bottom: 1.5rem;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .plat-table-wrap { overflow-x: auto; margin-bottom: 2rem; border-radius: var(--radius); border: 1px solid var(--border); }
        .plat-table { width: 100%; border-collapse: collapse; background: var(--surface-1); font-size: 0.875rem; }
        .plat-table th { text-align: left; background: var(--surface-2); color: var(--text-faint); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
        .plat-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-muted); vertical-align: top; }
        .plat-table tr:last-child td { border-bottom: none; }
        .plat-table tr:hover td { background: rgba(255,255,255,0.02); }

        .plat-arch {
          display: grid;
          gap: 1rem;
          background: var(--surface-2);
          padding: 2rem;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          margin: 2rem 0;
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }
        .plat-layer { border: 1px solid var(--border); background: var(--surface-1); padding: 1rem; border-radius: var(--radius-sm); text-align: center; }
        .plat-layer-title { color: var(--gold); font-weight: bold; margin-bottom: 0.5rem; display: block; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem; }

        .plat-engine-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .plat-engine-box {
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 1rem;
          border-radius: 4px;
        }
        .plat-engine-box strong { display: block; color: var(--text); margin-bottom: 0.5rem; font-size: 0.9rem; }
        .plat-engine-box span { display: block; font-size: 0.75rem; color: var(--text-faint); margin-bottom: 0.25rem; }

        .plat-callout {
          border-left: 4px solid var(--gold);
          background: rgba(198, 168, 107, 0.05);
          padding: 1.5rem;
          border-radius: 0 var(--radius) var(--radius) 0;
          margin: 2rem 0;
        }
        .plat-callout-title { font-weight: bold; color: var(--gold); display: block; margin-bottom: 0.5rem; font-family: var(--font-sans); }

        .plat-takeaway {
          border-left: 4px solid var(--gold);
          background: rgba(198, 168, 107, 0.08);
          padding: 1rem 1.5rem;
          border-radius: 0 var(--radius) var(--radius) 0;
          margin: 2rem 0;
          font-size: 0.925rem;
        }
        .plat-takeaway strong { color: var(--gold); font-family: var(--font-sans); }

        .plat-guarantee-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 2rem 0;
        }
        .plat-guarantee-box {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-top: 3px solid var(--gold);
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          text-align: center;
        }
        .plat-guarantee-box strong { display: block; color: var(--text); margin-bottom: 0.5rem; font-size: 0.95rem; }
        .plat-guarantee-box span { display: block; font-size: 0.8rem; color: var(--text-muted); }

        .plat-footer {
          text-align: center;
          padding: 4rem 0 2rem;
          color: var(--text-faint);
          font-size: 0.875rem;
          border-top: 1px solid var(--border);
          margin-top: 4rem;
        }

        .plat-status-success { color: var(--success); }
        .plat-status-warning { color: var(--warning); }
        .plat-status-danger { color: var(--danger); }

        .plat-flow {
          background: var(--surface-2);
          padding: 1rem;
          border-radius: var(--radius);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--gold);
          border: 1px solid var(--border);
          overflow-x: auto;
          text-align: center;
          letter-spacing: 0.02em;
        }

        @media print {
          .platform-page { background: white; color: black; }
          .plat-header, .plat-sidebar { display: none; }
          .plat-container { display: block; padding: 0; }
          .plat-card, .plat-arch, .plat-layer, .plat-engine-box { border-color: #ddd; background: white; color: black; }
        }
      `,
        }}
      />

      {/* ─── Header ─── */}
      <header className="plat-header">
        <div className="plat-header-inner">
          <div className="plat-logo">
            <Image
              src="/arum-logo-gold.svg"
              alt="AurumShield"
              width={180}
              height={48}
              priority
            />
          </div>
          <div className="plat-meta">
            <span className="plat-badge">Confidential</span>
            <div>v2.0.0 · Feb 2026</div>
          </div>
        </div>
      </header>

      {/* ─── Context-aware Back Link ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem 2rem 0" }}>
        <a href={back.href} className="plat-back-link">
          ← {back.label}
        </a>
      </div>

      {/* ─── Container ─── */}
      <div className="plat-container">
        {/* Sidebar TOC */}
        <aside className="plat-sidebar">
          <nav className="plat-toc">
            <h3 className="plat-toc-title">Contents</h3>
            <ul>
              <li><a href="#executive-summary">1. Executive Summary</a></li>
              <li><a href="#problem-statement">2. The Problem</a></li>
              <li><a href="#the-solution">3. The Solution</a></li>
              <li><a href="#platform-architecture">4. Platform Architecture</a></li>
              <li><a href="#clearing-engine">5. Core Clearing Engine</a></li>
              <li><a href="#capital-framework">6. Capital Adequacy</a></li>
              <li><a href="#policy-engine">7. Policy &amp; Risk Engine</a></li>
              <li><a href="#onboarding">8. Onboarding &amp; Identity</a></li>
              <li><a href="#auth">9. Authentication &amp; Authorization</a></li>
              <li><a href="#marketplace">10. Marketplace Infrastructure</a></li>
              <li><a href="#checkout">11. Checkout &amp; Price-Lock</a></li>
              <li><a href="#dual-rail">12. Dual-Rail Settlement</a></li>
              <li><a href="#insurance-logistics">13. Insurance &amp; Logistics</a></li>
              <li><a href="#document-esign">14. Document &amp; eSignature</a></li>
              <li><a href="#certificate-engine">15. Certificate Engine</a></li>
              <li><a href="#fee-model">16. Fee Model &amp; Pricing</a></li>
              <li><a href="#activation-gate">17. Activation Gate</a></li>
              <li><a href="#security">18. Security Architecture</a></li>
              <li><a href="#alignment">19. Strategic Alignment</a></li>
              <li><a href="#demo-system">20. Demo System</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main>
          {/* Title Card */}
          <div className="plat-card" id="title-card">
            <h1>AurumShield Platform</h1>
            <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
              Sovereign Clearing Infrastructure for Institutional Physical Gold Transactions
            </p>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
                fontSize: "0.875rem",
                color: "var(--text-faint)",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Document Classification:</strong> Confidential —
                Investor &amp; Partner Distribution Only
              </p>
              <p style={{ margin: 0 }}>
                <strong>Prepared by:</strong> AurumShield Engineering
              </p>
            </div>
          </div>

          {/* ─── 1. Executive Summary ─── */}
          <section id="executive-summary" className="plat-section">
            <h2>1. Executive Summary</h2>
            <p style={{ fontSize: "1.1rem", color: "var(--text)" }}>
              <strong>AurumShield is sovereign clearing infrastructure for institutional physical gold transactions.</strong>
            </p>
            <p>
              For decades, large-value gold trades have settled bilaterally — exposing
              counterparties to principal risk, operational opacity, and fragmented
              verification processes. Unlike financial securities, physical gold lacks
              a standardized clearing authority.
            </p>
            <p style={{ fontSize: "1.05rem", color: "var(--text)" }}>
              <strong>AurumShield closes that structural gap — and now extends far beyond it.</strong>
            </p>
            <p>
              What began as a clearing engine has matured into a full-spectrum institutional
              platform: identity verification powered by Persona, dual-rail settlement
              through Moov and Modern Treasury, actuarial transit insurance, real-time
              gold pricing from OANDA and LBMA, passkey-based authentication via Clerk,
              and document verification through AWS Textract — all governed by a
              deterministic policy engine and append-only audit ledger.
            </p>

            <h3>Platform Capabilities</h3>
            <ul>
              <li>
                <strong>Atomic Delivery-versus-Payment (DvP)</strong><br />
                Title and payment transfer simultaneously in a single deterministic operation.
              </li>
              <li>
                <strong>Dual-Rail Settlement</strong><br />
                Moov for instant payouts with automatic failover to Modern Treasury wire/RTGS — both with cryptographic idempotency.
              </li>
              <li>
                <strong>Persona-Powered Identity Verification</strong><br />
                Production KYC via Persona with OpenSanctions AML screening, biometric liveness, and UBO disclosure.
              </li>
              <li>
                <strong>Passkey Authentication &amp; Step-Up Reverification</strong><br />
                Clerk-based passkey auth with a compliance capability ladder and 5-minute step-up windows for high-value operations.
              </li>
              <li>
                <strong>Actuarial Transit Insurance</strong><br />
                Zone-based risk pricing with Standard, Enhanced, and All-Risk coverage tiers powered by a deterministic insurance engine.
              </li>
              <li>
                <strong>Real-Time Gold Pricing</strong><br />
                Live XAU/USD spot from OANDA with LBMA AM/PM reference price feeds for institutional-grade price discovery.
              </li>
              <li>
                <strong>Cryptographic Settlement Finality</strong><br />
                SHA-256 signed clearing certificates with canonical serialization and independent verification.
              </li>
            </ul>

            <h3>The Result</h3>
            <div className="plat-guarantee-grid">
              <div className="plat-guarantee-box">
                <strong>Principal Risk Eliminated</strong>
                <span>Structurally removed through atomic DvP execution.</span>
              </div>
              <div className="plat-guarantee-box">
                <strong>Capital Adequacy Enforced</strong>
                <span>Computationally constrained — not advisory.</span>
              </div>
              <div className="plat-guarantee-box">
                <strong>Identity Verified at Scale</strong>
                <span>Persona KYC + OpenSanctions AML in production.</span>
              </div>
              <div className="plat-guarantee-box">
                <strong>Settlement Finality Verifiable</strong>
                <span>Independently provable via cryptographic certification.</span>
              </div>
            </div>
            <p style={{ color: "var(--text)", fontStyle: "italic" }}>
              This is clearing infrastructure — not escrow, not brokerage, and not marketplace software.
            </p>
          </section>

          {/* ─── 2. The Problem ─── */}
          <section id="problem-statement" className="plat-section">
            <h2>2. The Problem: Structural Risk in Physical Gold</h2>
            <p style={{ color: "var(--text)", fontSize: "1rem" }}>
              Physical gold settlement operates without centralized clearing. Payment and
              delivery are separate acts, creating principal risk and structural exposure.
            </p>
            <p>
              In traditional bilateral gold transactions, payment and delivery occur as
              separate events. This creates a settlement gap — <strong>principal risk</strong> — where
              one party delivers while the other defaults. There is no institutional
              mechanism equivalent to what equities and derivatives markets have had for
              decades.
            </p>
            <div className="plat-engine-grid" style={{ marginTop: "2rem" }}>
              <div className="plat-engine-box">
                <strong>The Settlement Gap</strong>
                <span>Traditional T+2 settlement creates temporal exposure. Full notional value at risk until both legs complete.</span>
              </div>
              <div className="plat-engine-box">
                <strong>Counterparty Opacity</strong>
                <span>No standardized risk assessment in OTC precious metals. Limited visibility into counterparty solvency.</span>
              </div>
              <div className="plat-engine-box">
                <strong>Inventory Integrity</strong>
                <span>Fragmented paper trails for provenance, assay certification, and chain of custody documentation.</span>
              </div>
              <div className="plat-engine-box">
                <strong>Regulatory Deficiency</strong>
                <span>No centralized audit trail. Compliance records spread across email, CRM, and banking systems.</span>
              </div>
            </div>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> The physical gold market has no clearing infrastructure. Every bilateral settlement carries full principal risk with no institutional backstop.
            </div>
          </section>

          {/* ─── 3. The Solution ─── */}
          <section id="the-solution" className="plat-section">
            <h2>3. The Solution</h2>
            <p>
              AurumShield addresses the structural deficiencies of bilateral gold settlement
              through six interlocking mechanisms:
            </p>
            <div className="plat-engine-grid" style={{ marginTop: "1.5rem" }}>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Central Clearing Model</strong>
                <span>AurumShield interposes as the central counterparty. Buyers and sellers face AurumShield, not each other — eliminating bilateral default risk.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Deterministic Controls</strong>
                <span>Every state transition is governed by precondition logic. Settlements cannot advance without verified identity, packed evidence, and policy approval.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Capital-Constrained Execution</strong>
                <span>Real-time exposure monitoring prevents AurumShield from clearing more than its capital base supports. Hardstop limits enforce systemic solvency.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Dual-Rail Settlement</strong>
                <span>Moov for instant payouts and Modern Treasury for wire/RTGS execution — with automatic failover and deterministic idempotency.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Insured Transit &amp; Logistics</strong>
                <span>Actuarial insurance pricing, multi-carrier shipping via EasyPost, and tiered Brink{`'`}s armored logistics for high-value consignments.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Cryptographic Certification</strong>
                <span>Upon settlement finality, a SHA-256 signed clearing certificate provides independently verifiable proof of execution.</span>
              </div>
            </div>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> AurumShield transforms physical gold settlement from a trust-based bilateral process into a deterministic, capital-backed, insured, and cryptographically verified clearing operation.
            </div>
          </section>

          {/* ─── 4. Platform Architecture ─── */}
          <section id="platform-architecture" className="plat-section">
            <h2>4. Platform Architecture</h2>
            <h3>4.1 Design Principles</h3>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Principle</th>
                    <th>Implementation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Determinism</td>
                    <td>Every computation produces the same output given the same inputs. No randomness. Time is passed as an explicit parameter.</td>
                  </tr>
                  <tr>
                    <td>Immutability</td>
                    <td>All engine functions return new state objects. Ledger entries are append-only. Frozen snapshots cannot be altered.</td>
                  </tr>
                  <tr>
                    <td>Idempotency</td>
                    <td>Every operation — including payout execution and certificate issuance — can be safely retried via deterministic idempotency keys (SHA-256 of settlement parameters).</td>
                  </tr>
                  <tr>
                    <td>Fail-Closed</td>
                    <td>Protected capabilities require database-verified compliance status. If the compliance database is unreachable, high-value operations are blocked — never permitted by default.</td>
                  </tr>
                  <tr>
                    <td>Zero Trust</td>
                    <td>Every action is gated by Clerk-authenticated sessions, role-based access control, and compliance capability checks before execution.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>4.2 System Architecture</h3>
            <div className="plat-arch">
              <div className="plat-layer">
                <span className="plat-layer-title">Presentation Layer</span>
                Dashboard · Marketplace · Checkout · Settlements · Capital Controls · Audit Console
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Authentication &amp; Authorization</span>
                Clerk Passkey Auth · Capability Ladder · Step-Up Reverification · RBAC
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Clearing Engines</span>
                Settlement Engine · State Machine · Fee Engine · Certificate Engine
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Capital &amp; Policy Engines</span>
                Capital Adequacy · Breach Detection · Policy Gating · TRI Risk Scoring · Server-Side Risk Config
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Settlement Rails</span>
                Moov (Instant Payout) · Modern Treasury (Wire/RTGS) · Idempotency Guard · Finality Persistence
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Identity &amp; Verification</span>
                Persona KYC · OpenSanctions AML · Textract Document OCR · Dropbox Sign eSignature · Device Fingerprinting
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">External Integrations</span>
                OANDA XAU/USD Spot · LBMA Reference Price · EasyPost Shipping · Brink{`'`}s Armored · PostHog Analytics
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Audit &amp; Governance</span>
                SHA-256 Signing · Append-Only Ledger · Supervisory Dossiers · Immutable Event Stream
              </div>
            </div>
          </section>

          {/* ─── 5. Core Clearing Engine ─── */}
          <section id="clearing-engine" className="plat-section">
            <h2>5. Core Clearing Engine</h2>
            <p>
              The settlement engine implements a <strong>formalized state machine</strong> governing
              every gold transaction through a deterministic lifecycle:
            </p>
            <div className="plat-flow">
              ESCROW_OPEN → AWAITING_FUNDS → AWAITING_GOLD → AWAITING_VERIFICATION → READY_TO_SETTLE → AUTHORIZED → SETTLED
            </div>

            <h3>Formalized State Machine</h3>
            <p>
              All lifecycle transitions are governed by a strict state machine with role-restricted
              transition maps. Illegal transitions throw an <span className="plat-code">IllegalStateTransitionError</span> containing
              full forensic context — previous state, attempted state, entity ID, actor ID, and role — which is
              automatically emitted to the audit log for governance review.
            </p>

            <h3>Atomic DvP Execution</h3>
            <p>The centerpiece is the two-step DvP mechanism:</p>
            <ol>
              <li>
                <strong>Authorization:</strong> Clearing authority authorizes settlement.
                A capital snapshot is frozen into the ledger, recording the exact exposure
                and adequacy state at the moment of decision.
              </li>
              <li>
                <strong>DvP Execution:</strong> Title and payment transfer simultaneously.
                Status transitions directly to <span className="plat-code">SETTLED</span>.
                No intermediate state exists where value is exposed.
              </li>
            </ol>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> Settlement finality is not procedural — it is computational. Every transition is audited, role-gated, and irreversible.
            </div>
          </section>

          {/* ─── 6. Capital Adequacy Framework ─── */}
          <section id="capital-framework" className="plat-section">
            <h2>6. Capital Adequacy Framework</h2>
            <p style={{ color: "var(--text)", fontSize: "1rem" }}>
              Clearing without capital constraints introduces systemic fragility.<br />
              AurumShield enforces solvency before execution.
            </p>
            <p>
              Unlike bilateral gold settlement — where exposure accumulates invisibly —
              AurumShield maintains a continuous, deterministic capital snapshot derived
              from the complete system state at any given moment.
            </p>

            <h3>Real-Time Capital Snapshot</h3>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Capital Base</strong></td>
                    <td>Total capital allocated to clearing operations.</td>
                  </tr>
                  <tr>
                    <td><strong>Gross Exposure</strong></td>
                    <td>Sum of all active reservations, pending orders, and open settlements.</td>
                  </tr>
                  <tr>
                    <td><strong>ECR (Exposure Coverage Ratio)</strong></td>
                    <td>Gross Exposure ÷ Capital Base. Primary solvency indicator.</td>
                  </tr>
                  <tr>
                    <td><strong>Hardstop Utilization</strong></td>
                    <td>Gross Exposure ÷ Hardstop Limit. Approaching 95% triggers critical breach logic.</td>
                  </tr>
                  <tr>
                    <td><strong>TVaR₉₉ Buffer</strong></td>
                    <td>Capital Base − (Gross Exposure × stress addon). Negative indicates insufficient tail-risk buffer.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Deterministic Breach Enforcement</h3>
            <div
              className="plat-engine-grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
            >
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong className="plat-status-success">NORMAL</strong>
                <span>All operations permitted.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--warning)" }}>
                <strong className="plat-status-warning">THROTTLE</strong>
                <span>New reservations limited.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--warning)" }}>
                <strong className="plat-status-warning">FREEZE</strong>
                <span>Order conversions blocked.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--danger)" }}>
                <strong className="plat-status-danger">HALT</strong>
                <span>All new settlement activity suspended.</span>
              </div>
            </div>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> AurumShield prevents overexposure before it can occur. Clearing capacity is constrained by capital reality — not intention.
            </div>
          </section>

          {/* ─── 7. Policy & Risk Engine ─── */}
          <section id="policy-engine" className="plat-section">
            <h2>7. Policy &amp; Risk Engine</h2>
            <p>
              The Transaction Risk Index (TRI) is a weighted composite score computed
              from counterparty risk, corridor risk, amount concentration, and counterparty
              status. Weights are configurable via server-side risk parameters without code deployment.
            </p>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Band</th>
                    <th>TRI Range</th>
                    <th>Implication</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="plat-badge" style={{ background: "rgba(63, 174, 122, 0.2)", color: "var(--success)" }}>Green</span>
                    </td>
                    <td>0 – 3.0</td>
                    <td>Low risk. Auto-approval eligible.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="plat-badge" style={{ background: "rgba(208, 168, 92, 0.2)", color: "var(--warning)" }}>Amber</span>
                    </td>
                    <td>3.0 – 6.0</td>
                    <td>Moderate risk. Senior review required.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="plat-badge" style={{ background: "rgba(209, 106, 93, 0.2)", color: "var(--danger)" }}>Red</span>
                    </td>
                    <td>6.0 – 10.0</td>
                    <td>High risk. Committee approval required.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Server-Side Risk Configuration:</strong> TRI component weights, approval
              thresholds, and concentration limits are managed through a dedicated risk configuration
              module — enabling dynamic policy adjustment without code changes or redeployment.
            </p>
            <p>
              <strong>Immutable Policy Snapshot:</strong> When a reservation converts to
              an order, the complete risk assessment is frozen and attached to the order.
              This creates an unalterable record of the conditions under which the trade
              was approved — critical for regulatory review and dispute resolution.
            </p>
          </section>

          {/* ─── 8. Onboarding & Identity Perimeter ─── */}
          <section id="onboarding" className="plat-section">
            <h2>8. Onboarding &amp; Identity Perimeter</h2>
            <p>
              AurumShield enforces a mandatory identity perimeter. No counterparty can access
              clearing services without completing a structured verification track — powered
              in production by <strong>Persona</strong> for KYC and <strong>OpenSanctions</strong> for
              AML screening.
            </p>

            <h3>Progressive Disclosure Onboarding Wizard</h3>
            <p>
              New counterparties are guided through a three-step onboarding wizard with
              Zod-validated forms, automatic state persistence, and a resume-later affordance
              for multi-session completion:
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Step 1: Entity Profile</strong>
                <span>Organization type, legal name, jurisdiction, contact details. Zod-validated with real-time feedback.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Step 2: Document Upload</strong>
                <span>Government ID, company registration, UBO declarations. Documents verified via AWS Textract OCR.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Step 3: Biometric &amp; Screening</strong>
                <span>Persona-powered liveness check and OpenSanctions screening against OFAC, EU, UN, HMT, and DFAT lists.</span>
              </div>
            </div>

            <h3>Verification Tracks</h3>
            <ul>
              <li><strong>KYC (Individuals):</strong> Government ID capture via Persona, biometric liveness verification, sanctions &amp; PEP screening via OpenSanctions.</li>
              <li><strong>KYB (Entities):</strong> Company registration, UBO declaration (25%+ ownership threshold), proof of registered address, source of funds documentation.</li>
            </ul>
            <p>
              Every verification step produces an evidence stub with a deterministic
              document ID and UTC timestamp. Verification status is enforced at reservation
              creation, order conversion, and settlement activation.
            </p>

            <h3>Onboarding State Persistence</h3>
            <p>
              Onboarding progress is persisted server-side, allowing counterparties to
              close their browser and resume from any device. State recovery rules handle
              edge cases where a provider inquiry completes while the user is away,
              automatically reconciling provider status with platform state.
            </p>
          </section>

          {/* ─── 9. Authentication & Authorization ─── */}
          <section id="auth" className="plat-section">
            <h2>9. Passkey Authentication &amp; Authorization</h2>
            <p>
              AurumShield implements a production-grade authentication and authorization
              layer built on <strong>Clerk</strong> with passkey-based authentication as the
              default credential mechanism.
            </p>

            <h3>Compliance Capability Ladder</h3>
            <p>
              The authorization system implements a progressive capability model where each
              capability implies all previous capabilities:
            </p>
            <div className="plat-flow">
              BROWSE → QUOTE → LOCK_PRICE → EXECUTE_PURCHASE → SETTLE
            </div>
            <p>
              Capabilities are mapped to KYC status — counterparties with incomplete
              verification can browse and quote but cannot lock prices or execute purchases.
            </p>

            <h3>Step-Up Reverification</h3>
            <p>
              High-value, irreversible operations (<span className="plat-code">LOCK_PRICE</span>,{" "}
              <span className="plat-code">EXECUTE_PURCHASE</span>,{" "}
              <span className="plat-code">SETTLE</span>) require step-up authentication.
              Sessions older than 5 minutes must re-verify before proceeding — preventing
              stale session exploitation.
            </p>

            <h3>Fail-Closed Database Enforcement</h3>
            <div className="plat-callout">
              <span className="plat-callout-title">RSK-012: Fail-Closed Authorization</span>
              Protected capabilities require a database-verified <span className="plat-code">APPROVED</span> compliance
              case. If the compliance database is unreachable, high-value operations are
              blocked with a 500 error — never permitted by default. This prevents a database
              outage from silently granting unauthorized access to settlement functions.
            </div>
          </section>

          {/* ─── 10. Marketplace Infrastructure ─── */}
          <section id="marketplace" className="plat-section">
            <h2>10. Marketplace Infrastructure</h2>
            <p>
              The marketplace implements a strict sell-side pipeline with guided listing
              creation, automated document verification, and deterministic publish gating.
            </p>

            <h3>Listing Readiness Rail</h3>
            <p>
              Sellers are guided through a readiness dashboard that surfaces every prerequisite
              for publication — verification status, evidence completeness, and capital control
              status — with clear remediation actions for any failing check. Draft listings
              auto-save to prevent data loss.
            </p>

            <h3>Evidence Packing</h3>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>1. Assay Report</strong>
                <span>Laboratory analysis confirming purity and weight. Verified via AWS Textract OCR extraction.</span>
              </div>
              <div className="plat-engine-box">
                <strong>2. Chain of Custody</strong>
                <span>Documented provenance history from source to vault. Textract validates document structure.</span>
              </div>
              <div className="plat-engine-box">
                <strong>3. Seller Attestation</strong>
                <span>Legal declaration of ownership and authority to sell. Executed via Dropbox Sign eSignature.</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <strong>Publish Gate:</strong> A deterministic function evaluates seller
              verification status, evidence completeness, and capital control mode before
              allowing a listing to go live. Incomplete submissions are blocked at the code level.
            </p>

            <h3>Responsive Marketplace UI</h3>
            <p>
              The buyer-facing marketplace features a responsive asset grid with advanced
              filtering (form, purity, weight range, vault location), real-time search,
              and WCAG-compliant accessibility semantics throughout.
            </p>
          </section>

          {/* ─── 11. Checkout & Price-Lock Flow ─── */}
          <section id="checkout" className="plat-section">
            <h2>11. Checkout &amp; Price-Lock Flow</h2>
            <p>
              The buyer checkout implements a two-step flow designed for trust-building
              and operational clarity, instrumented with PostHog analytics for funnel
              optimization:
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Step 1: Price Lock</strong>
                <span>Live XAU/USD spot from OANDA is displayed alongside LBMA reference pricing. Buyer locks the price for a configurable window (default: 15 minutes). An urgency countdown timer ensures decision velocity.</span>
              </div>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Step 2: Settlement Routing</strong>
                <span>Fee summary, insurance options, and logistics preferences are confirmed. Settlement is routed to the dual-rail infrastructure. Upon confirmation, the order transitions to SETTLEMENT_PENDING.</span>
              </div>
            </div>
            <p>
              <strong>Real-Time Pricing:</strong> Gold spot prices are sourced from the
              OANDA FX API with LBMA AM/PM reference prices as institutional benchmarks.
              Price data is refreshed at configurable intervals and displayed with full
              bid/ask transparency.
            </p>
            <p>
              <strong>Analytics Instrumentation:</strong> Each checkout step emits structured
              events to PostHog — enabling funnel analysis, abandonment tracking, and
              conversion optimization without ever blocking user interactions.
            </p>
          </section>

          {/* ─── 12. Dual-Rail Settlement ─── */}
          <section id="dual-rail" className="plat-section">
            <h2>12. Dual-Rail Settlement</h2>
            <p>
              AurumShield routes settlement execution through a <strong>dual-rail architecture</strong> with
              deterministic idempotency and automatic failover — ensuring payout finality regardless
              of individual rail availability.
            </p>

            <h3>Primary &amp; Fallback Rails</h3>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Rail</th>
                    <th style={{ width: "25%" }}>Provider</th>
                    <th>Use Case</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Primary</strong></td>
                    <td>Moov Financial</td>
                    <td>Instant payouts, ACH transfers, and fee sweeps for standard-value transactions.</td>
                  </tr>
                  <tr>
                    <td><strong>Fallback</strong></td>
                    <td>Modern Treasury</td>
                    <td>Wire/RTGS execution for enterprise-threshold transactions (&gt;$250K) or when the primary rail is unavailable.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Rail Selection Logic</h3>
            <p>
              Rail mode is configurable via environment: <span className="plat-code">auto</span> (intelligent routing
              based on amount thresholds), <span className="plat-code">moov_only</span>, or{" "}
              <span className="plat-code">modern_treasury_only</span>. In auto mode, transactions exceeding
              the enterprise threshold are routed to Modern Treasury for wire execution.
            </p>

            <h3>Idempotency &amp; Finality</h3>
            <div className="plat-callout">
              <span className="plat-callout-title">Deterministic Idempotency Keys</span>
              Every payout generates a SHA-256 idempotency key from{" "}
              <span className="plat-code">settlement_id | payee_id | amount_cents | action_type</span>.
              This key is passed to both Moov and Modern Treasury, persisted in the payouts
              table, and checked before every execution attempt. Prior payouts with
              SUBMITTED or COMPLETED status trigger an{" "}
              <span className="plat-code">IDEMPOTENCY_CONFLICT</span> response — never re-execution.
            </div>
            <p>
              <strong>Finality Persistence:</strong> Settlement finality from external rail confirmation
              is recorded with rail identity, external transfer ID, finality status, and
              leg classification (seller_payout or fee_sweep). Fallback execution is gated
              by confirmed primary rail failure.
            </p>
          </section>

          {/* ─── 13. Transit Insurance & Logistics ─── */}
          <section id="insurance-logistics" className="plat-section">
            <h2>13. Transit Insurance &amp; Logistics</h2>
            <p>
              Physical gold settlement requires insured transit. AurumShield implements
              an actuarial insurance engine and a multi-tier logistics pipeline.
            </p>

            <h3>Actuarial Insurance Engine</h3>
            <p>
              The insurance engine computes transit premiums using zone-based risk rates,
              notional value (from OANDA spot × weight), and configurable coverage tiers:
            </p>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>Coverage Tier</th>
                    <th>Deductible</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Standard</strong></td>
                    <td>1.0% of notional</td>
                    <td>Theft, damage, loss during transit.</td>
                  </tr>
                  <tr>
                    <td><strong>Enhanced</strong></td>
                    <td>0.5% of notional</td>
                    <td>Standard + extended storage coverage.</td>
                  </tr>
                  <tr>
                    <td><strong>All-Risk</strong></td>
                    <td>0.25% of notional</td>
                    <td>Enhanced + force-majeure rider (0.05% surcharge).</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Shipping zones (Domestic, Regional, International, Conflict) are resolved
              from ISO 3166-1 alpha-2 country codes. The engine enforces a $25 minimum premium floor.
            </p>

            <h3>Logistics Infrastructure</h3>
            <ul>
              <li><strong>EasyPost Integration:</strong> Multi-carrier shipping for standard-value consignments with rate comparison and tracking.</li>
              <li><strong>Brink{`'`}s Armored Transit:</strong> High-value shipments are automatically routed to Brink{`'`}s for armored, insured logistics.</li>
              <li><strong>Deterministic Routing:</strong> Tier assignment is computed from notional value thresholds — no manual carrier selection.</li>
            </ul>
          </section>

          {/* ─── 14. Document Verification & eSignature ─── */}
          <section id="document-esign" className="plat-section">
            <h2>14. Document Verification &amp; eSignature</h2>
            <p>
              AurumShield integrates automated document verification and legally binding
              electronic signatures into the evidence pipeline.
            </p>

            <h3>AWS Textract — Document OCR</h3>
            <p>
              Uploaded assay reports and chain-of-custody certificates are processed through
              AWS Textract for structured data extraction. The system validates document
              completeness, extracts key fields (purity percentage, weight, lab identifier),
              and flags mismatches for manual review — reducing evidence review latency
              from days to seconds.
            </p>

            <h3>Dropbox Sign — eSignature</h3>
            <p>
              Seller attestations and counterparty agreements are executed through Dropbox
              Sign, producing legally binding electronic signatures with full audit trails.
              Signed documents are permanently linked to the settlement record.
            </p>

            <h3>Device Fingerprinting</h3>
            <p>
              Session integrity is reinforced through device fingerprinting. Each authenticated
              session is associated with a device fingerprint, enabling detection of session
              hijacking, credential sharing, and anomalous access patterns.
            </p>
          </section>

          {/* ─── 15. Certificate Engine ─── */}
          <section id="certificate-engine" className="plat-section">
            <h2>15. Certificate Engine</h2>
            <p>
              Upon settlement finality, a SHA-256 signed clearing certificate is issued from a
              canonically serialized payload. This allows any party to independently verify
              that the certificate contents match the immutable ledger record.
            </p>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Field</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Certificate Number</td>
                    <td><span className="plat-code">AS-GC-YYYYMMDD-&lt;HEX&gt;-&lt;SEQ&gt;</span> (Deterministic generation)</td>
                  </tr>
                  <tr>
                    <td>Signature Hash</td>
                    <td>SHA-256 of canonical payload serialization.</td>
                  </tr>
                  <tr>
                    <td>DvP Ledger ID</td>
                    <td>Reference to the specific atomic execution ledger entry.</td>
                  </tr>
                  <tr>
                    <td>Issuance Timestamp</td>
                    <td>UTC timestamp of certificate generation, immutably recorded.</td>
                  </tr>
                  <tr>
                    <td>Fee Summary</td>
                    <td>Frozen fee breakdown at settlement activation — indemnification, add-ons, total.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> Immutable clearing certificates provide independently
              verifiable proof of settlement finality for bilateral reconciliation, regulatory
              reporting, and custody transfer documentation.
            </div>
          </section>

          {/* ─── 16. Fee Model & Pricing ─── */}
          <section id="fee-model" className="plat-section">
            <h2>16. Fee Model &amp; Pricing</h2>
            <p>
              AurumShield{`'`}s revenue model is anchored by a single, transparent core fee:
              the <strong>indemnification fee</strong>. This is the price counterparties pay
              for fraud-indemnified, capital-backed clearing.
            </p>

            <h3>Core Indemnification Fee: 1% of Notional</h3>
            <div className="plat-callout">
              <span className="plat-callout-title">Core Fee: 1% of Transaction Notional Value</span>
              Applied to every cleared transaction. This fee activates AurumShield{`'`}s
              fraud indemnification guarantee — backed by the platform{`'`}s clearing capital reserve.
              Subject to configurable minimum ($250) and maximum ($50,000) thresholds.
            </div>
            <p>
              Fees are <strong>frozen into the settlement record at activation</strong>.
              Active settlements retain their fee snapshot even if rates are subsequently adjusted.
            </p>
            <p>
              <strong>Real-Time Pricing Basis:</strong> Notional values are computed from
              OANDA XAU/USD spot prices with LBMA AM/PM reference prices available as
              institutional benchmarks. Price feeds update at configurable intervals for
              transparent, market-aligned fee computation.
            </p>

            <h3>Optional Add-On Services</h3>
            <ul>
              <li><strong>Expedited Settlement:</strong> Priority processing for time-sensitive transactions.</li>
              <li><strong>Transit Insurance:</strong> Actuarial-priced coverage (Standard / Enhanced / All-Risk) computed by the insurance engine.</li>
              <li><strong>Regulatory Reporting:</strong> Automated compliance report generation.</li>
              <li><strong>Optional Clearing Charge:</strong> Configurable per-transaction processing charge, if applicable.</li>
            </ul>
          </section>

          {/* ─── 17. Settlement Activation Gate ─── */}
          <section id="activation-gate" className="plat-section">
            <h2>17. Settlement Activation Gate</h2>
            <p>
              Before any settlement can proceed to DvP execution, it must pass through
              a <strong>five-point activation gate</strong>. This deterministic checklist
              ensures that all preconditions are satisfied before capital is committed.
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Identity Verified</strong>
                <span>Both counterparties have completed KYC/KYB verification via Persona.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Evidence Packed</strong>
                <span>Assay report (Textract-verified), chain of custody, and seller attestation (Dropbox Sign) attached.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Policy Passed</strong>
                <span>TRI score within acceptable band, no active blockers.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Capital Adequate</strong>
                <span>ECR below threshold, no active breach or HALT status.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--gold)" }}>
                <strong>Fees Confirmed</strong>
                <span>Fee breakdown (indemnification + insurance + add-ons) reviewed and accepted.</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <strong>Gate Logic:</strong> All five checks must return{" "}
              <span className="plat-code">PASS</span> before the settlement transitions
              to <span className="plat-code">READY_TO_SETTLE</span>. Any failing check
              blocks activation and surfaces a specific remediation action.
            </p>
          </section>

          {/* ─── 18. Security Architecture ─── */}
          <section id="security" className="plat-section">
            <h2>18. Security Architecture</h2>
            <ul>
              <li><strong>Passkey Authentication:</strong> Clerk-based passkey auth eliminates password-based attack vectors (phishing, credential stuffing, brute force).</li>
              <li><strong>Step-Up Reverification:</strong> High-value operations require re-authentication within a 5-minute window, preventing stale session exploitation.</li>
              <li><strong>Fail-Closed Authorization:</strong> Database-backed compliance checks. If the compliance DB is unreachable, protected operations are blocked — not permitted by default.</li>
              <li><strong>No Settlement Gap:</strong> Atomic DvP execution eliminates temporal exposure between payment and delivery.</li>
              <li><strong>Precondition Enforcement:</strong> Code-level validation of funds, gold status, and identity before any state transition.</li>
              <li><strong>Role-Gated Actions:</strong> Deterministic role maps enforce that only authorized actors can perform specific operations.</li>
              <li><strong>Frozen Snapshots:</strong> Capital and policy state recorded at moment of execution, creating an immutable audit trail.</li>
              <li><strong>Append-Only Ledger:</strong> All state transitions produce immutable ledger entries. No record can be modified or deleted.</li>
              <li><strong>Device Fingerprinting:</strong> Session integrity reinforced through device fingerprint association, detecting session hijacking and anomalous access.</li>
              <li><strong>Idempotent Payouts:</strong> SHA-256 deterministic idempotency keys prevent duplicate payout execution across both settlement rails.</li>
            </ul>
          </section>

          {/* ─── 19. Strategic Alignment ─── */}
          <section id="alignment" className="plat-section">
            <h2>19. Strategic Alignment</h2>
            <h3>Why This Matters Now</h3>
            <p>
              The physical gold market is at an inflection point. Growing regulatory
              scrutiny of OTC precious metals trading, rising fraud exposure in cross-border
              gold transactions, and increasing demand for standardized clearing mechanisms
              all point to the same conclusion: bilateral settlement is an institutional
              liability.
            </p>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Business Requirement</th>
                    <th style={{ width: "33%" }}>Technical Implementation</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Eliminate Principal Risk</strong></td>
                    <td>Atomic DvP (Core Clearing Engine)</td>
                    <td><span className="plat-status-success">✓ Mathematically Prevents Fraud</span></td>
                  </tr>
                  <tr>
                    <td><strong>Physical Verification</strong></td>
                    <td>Textract OCR + Evidence Packing + Publish Gate</td>
                    <td><span className="plat-status-success">✓ Automated Digital Enforcement</span></td>
                  </tr>
                  <tr>
                    <td><strong>Insurance-Backed</strong></td>
                    <td>Capital Adequacy + Actuarial Transit Insurance</td>
                    <td><span className="plat-status-success">✓ Dual-Layer Solvency</span></td>
                  </tr>
                  <tr>
                    <td><strong>Identity Assurance</strong></td>
                    <td>Persona KYC + OpenSanctions AML + Passkey Auth</td>
                    <td><span className="plat-status-success">✓ Production-Grade Identity</span></td>
                  </tr>
                  <tr>
                    <td><strong>Anonymity &amp; Privacy</strong></td>
                    <td>Central Clearing Model + RBAC + Device Fingerprinting</td>
                    <td><span className="plat-status-success">✓ Architectural Privacy</span></td>
                  </tr>
                  <tr>
                    <td><strong>Regulatory Compliance</strong></td>
                    <td>Append-Only Ledger + Supervisory Dossiers + SHA-256 Certificates</td>
                    <td><span className="plat-status-success">✓ Zero-Overhead Audit Readiness</span></td>
                  </tr>
                  <tr>
                    <td><strong>Settlement Resilience</strong></td>
                    <td>Dual-Rail (Moov + Modern Treasury) + Idempotency Guard</td>
                    <td><span className="plat-status-success">✓ No Single Point of Failure</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── 20. Interactive Demo System ─── */}
          <section id="demo-system" className="plat-section">
            <h2>20. Interactive Demo System</h2>
            <p>
              AurumShield includes a <strong>role-based guided tour system</strong> for
              stakeholder demonstrations. Each tour walks the viewer through the platform
              from a specific institutional perspective.
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>Buyer Tour</strong>
                <span>Marketplace → Price-Lock → Checkout → Verify → Settle → Certificate → Delivery</span>
              </div>
              <div className="plat-engine-box">
                <strong>Seller Tour</strong>
                <span>Readiness Rail → Listing Wizard → Evidence Upload → eSign → Publish → Settlement → Certificate</span>
              </div>
              <div className="plat-engine-box">
                <strong>Admin Tour</strong>
                <span>Dashboard → Pricing → Capital Controls → Dual-Rail Monitor → Settlements → Audit Console</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              Tours are powered by a state machine with step-level route navigation,
              UI element highlighting, and structured narrative content. Each tour
              enforces a minimum 60% click-gating ratio to ensure active engagement
              rather than passive viewing.
            </p>
          </section>

        </main>
      </div>

      {/* ─── Footer ─── */}
      <footer className="plat-footer">
        <p>AurumShield — Sovereign Clearing Infrastructure for Institutional Physical Gold Transactions</p>
        <p>© 2026 AurumShield. All rights reserved.</p>
      </footer>
    </div>
  );
}
