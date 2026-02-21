"use client";

import { AppLogo } from "@/components/app-logo";

/* ================================================================
   PLATFORM CAPABILITIES — Investor-Grade Technical Overview
   Route: /platform
   Renders outside the app shell (no sidebar/topbar).

   Table of Contents:
   1.  Executive Summary
   2.  The Problem
   3.  The Solution
   4.  Platform Architecture
   5.  Core Clearing Engine
   6.  Capital Adequacy Framework
   7.  Policy & Risk Engine
   8.  Verification & Identity Perimeter
   9.  Marketplace Infrastructure
   10. Certificate Engine
   11. Fee Model & Pricing
   12. Settlement Activation Gate
   13. Security Architecture
   14. Strategic Alignment
   15. Interactive Demo System
   ================================================================ */

export default function PlatformCapabilitiesPage() {
  return (
    <div className="platform-page">
      {/* ─── Embedded Styles ─── */}
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
            <AppLogo className="h-8 w-auto" variant="dark" />
          </div>
          <div className="plat-meta">
            <span className="plat-badge">Confidential</span>
            <div>v1.9.0 · Feb 2026</div>
          </div>
        </div>
      </header>

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
              <li><a href="#verification">8. Verification Perimeter</a></li>
              <li><a href="#marketplace">9. Marketplace Infrastructure</a></li>
              <li><a href="#certificate-engine">10. Certificate Engine</a></li>
              <li><a href="#fee-model">11. Fee Model &amp; Pricing</a></li>
              <li><a href="#activation-gate">12. Activation Gate</a></li>
              <li><a href="#security">13. Security Architecture</a></li>
              <li><a href="#alignment">14. Strategic Alignment</a></li>
              <li><a href="#demo-system">15. Demo System</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main>
          {/* Title Card */}
          <div className="plat-card" id="title-card">
            <h1>AurumShield Platform</h1>
            <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
              Institutional Clearing Infrastructure for Physical Gold Transactions
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
              <strong>AurumShield is clearing infrastructure for institutional physical gold transactions.</strong>
            </p>
            <p>
              For decades, large-value gold trades have settled bilaterally — exposing
              counterparties to principal risk, operational opacity, and fragmented
              verification processes. Unlike financial securities, physical gold lacks
              a standardized clearing authority.
            </p>
            <p style={{ fontSize: "1.05rem", color: "var(--text)" }}>
              <strong>AurumShield closes that structural gap.</strong>
            </p>
            <p>
              By acting as a neutral clearing layer between counterparties, the platform
              replaces trust-dependent settlement with deterministic execution, capital
              constraints, and cryptographic proof of completion.
            </p>

            <h3>The Structural Problem</h3>
            <p>In traditional gold transactions:</p>
            <ul>
              <li>Payment and delivery are separate events.</li>
              <li>Verification is inconsistent across jurisdictions.</li>
              <li>Capital adequacy is not centrally enforced.</li>
              <li>Finality relies on documentation rather than computation.</li>
            </ul>
            <p>This creates exposure — not just operational friction.</p>

            <h3>The AurumShield Model</h3>
            <p>
              AurumShield introduces a central clearing framework purpose-built for physical gold:
            </p>
            <ul>
              <li>
                <strong>Atomic Delivery-versus-Payment (DvP)</strong><br />
                Title and payment transfer simultaneously in a single deterministic operation.
              </li>
              <li>
                <strong>Continuous Capital Adequacy Monitoring</strong><br />
                Real-time exposure tracking with automated breach detection and enforceable hardstop controls.
              </li>
              <li>
                <strong>Deterministic Policy Enforcement</strong><br />
                Transaction risk scoring and approval tiering that cannot be bypassed once frozen into settlement state.
              </li>
              <li>
                <strong>Institutional Verification Perimeter</strong><br />
                Multi-stage KYC/KYB, sanctions screening, and source-of-funds validation required prior to settlement activation.
              </li>
              <li>
                <strong>Cryptographic Settlement Finality</strong><br />
                SHA-256 signed clearing certificates proving that execution occurred under capital-constrained, policy-compliant conditions.
              </li>
            </ul>

            <h3>The Result</h3>
            <p>
              AurumShield transforms physical gold settlement from a bilateral trust exercise
              into a governed clearing process.
            </p>
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
            <p style={{ color: "var(--text)", fontStyle: "italic", marginTop: "1rem" }}>
              This structural gap is not operational — it is systemic.
            </p>
          </section>

          {/* ─── 3. The Solution ─── */}
          <section id="the-solution" className="plat-section">
            <h2>3. The Solution</h2>
            <p>
              AurumShield addresses the structural deficiencies of bilateral gold settlement
              through four interlocking mechanisms:
            </p>
            <div className="plat-engine-grid" style={{ marginTop: "1.5rem" }}>
              <div className="plat-engine-box" style={{ borderTop: "3px solid var(--gold)" }}>
                <strong>Central Clearing Model</strong>
                <span>AurumShield interposes as the central counterparty to every trade. Buyers and sellers face AurumShield, not each other — eliminating bilateral default risk.</span>
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
                <strong>Cryptographic Certification</strong>
                <span>Upon settlement finality, a SHA-256 signed clearing certificate provides independently verifiable proof of execution.</span>
              </div>
            </div>
            <div className="plat-takeaway">
              <strong>Takeaway:</strong> AurumShield transforms physical gold settlement from a trust-based bilateral process into a deterministic, capital-backed, cryptographically verified clearing operation.
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
                    <td>Every operation can be safely retried. Certificate issuance and breach events check for existing artifacts before creating duplicates.</td>
                  </tr>
                  <tr>
                    <td>Zero Trust</td>
                    <td>Every action is gated by role-based access control. All state transitions validated against preconditions before execution.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>4.2 System Architecture</h3>
            <div className="plat-arch">
              <div className="plat-layer">
                <span className="plat-layer-title">Presentation Layer</span>
                Dashboard · Marketplace · Settlements · Capital Controls · Audit Console
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Interface &amp; Orchestration Layer</span>
                Role surfaces · Workflow orchestration · Deterministic state transitions
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Clearing Engines</span>
                Settlement Engine · Fee Engine · Certificate Engine
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Capital &amp; Policy Engines</span>
                Capital Adequacy · Breach Detection · Policy Gating · Risk Scoring
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">Certificate &amp; Audit Layer</span>
                SHA-256 Signing · Append-Only Ledger · Supervisory Dossiers · Immutable Event Stream
              </div>
            </div>
          </section>

          {/* ─── 5. Core Clearing Engine ─── */}
          <section id="clearing-engine" className="plat-section">
            <h2>5. Core Clearing Engine</h2>
            <p>
              The settlement engine implements a <strong>six-stage deterministic lifecycle</strong> for
              every gold transaction:
            </p>
            <div className="plat-flow">
              ESCROW_OPEN → AWAITING_FUNDS → AWAITING_GOLD → AWAITING_VERIFICATION → READY_TO_SETTLE → AUTHORIZED → SETTLED
            </div>

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
              <strong>Takeaway:</strong> Settlement finality is not procedural — it is computational.
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
            <p style={{ color: "var(--text)" }}>
              <strong>No settlement can execute unless sufficient clearing capital exists.</strong>
            </p>

            <h3>Real-Time Capital Snapshot</h3>
            <p>
              At all times, the engine derives capital metrics directly from current
              reservations, pending orders, and open settlements.
            </p>
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
                </tbody>
              </table>
            </div>
            <p style={{ color: "var(--text)", fontStyle: "italic" }}>
              These metrics are not advisory dashboards. They are computational gates.
            </p>

            <h3>Deterministic Breach Enforcement</h3>
            <p>
              When capital utilization exceeds predefined thresholds, the system
              automatically transitions into enforceable control states:
            </p>
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
            <p style={{ color: "var(--text)", fontStyle: "italic" }}>
              These states are not administrative decisions. They are deterministic outcomes of capital calculations.
            </p>

            <h3>Frozen Capital Snapshot at Execution</h3>
            <p>
              At the moment of DvP authorization:
            </p>
            <ul>
              <li>The current capital state is frozen.</li>
              <li>The snapshot is appended to the immutable ledger.</li>
              <li>Settlement proceeds only if solvency conditions are satisfied.</li>
            </ul>
            <p style={{ color: "var(--text)", fontStyle: "italic" }}>
              Capital adequacy is therefore not policy-based. It is mathematically enforced.
            </p>

            <div className="plat-takeaway">
              <strong>Takeaway:</strong> AurumShield prevents overexposure before it can occur. Clearing capacity is constrained by capital reality — not intention.
            </div>
          </section>

          {/* ─── 7. Policy & Risk Engine ─── */}
          <section id="policy-engine" className="plat-section">
            <h2>7. Policy &amp; Risk Engine</h2>
            <p>
              The Transaction Risk Index (TRI) is a weighted composite score used to
              classify transaction risk and determine approval routing.
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
              <strong>Immutable Policy Snapshot:</strong> When a reservation converts to
              an order, the complete risk assessment is frozen and attached to the order.
              This creates an unalterable record of the conditions under which the trade
              was approved — critical for regulatory review and dispute resolution.
            </p>
          </section>

          {/* ─── 8. Verification ─── */}
          <section id="verification" className="plat-section">
            <h2>8. Verification &amp; Identity Perimeter</h2>
            <p>
              Mandatory identity perimeter. No counterparty can access clearing services
              without completing the appropriate verification track.
            </p>
            <ul>
              <li><strong>KYC (Individuals):</strong> ID Capture, Liveness Check, Sanctions Screening.</li>
              <li><strong>KYB (Entities):</strong> Company Registration, UBO Declaration, Source of Funds.</li>
            </ul>
            <p>
              Every verification step produces an evidence stub with a deterministic
              document ID and UTC timestamp. Verification status is checked at multiple
              enforcement points: reservation creation, order conversion, and settlement activation.
            </p>
          </section>

          {/* ─── 9. Marketplace Infrastructure ─── */}
          <section id="marketplace" className="plat-section">
            <h2>9. Marketplace Infrastructure</h2>
            <p>
              The marketplace implements a strict sell-side pipeline. Before publishing,
              sellers must attach a three-part evidence pack:
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>1. Assay Report</strong>
                <span>Laboratory analysis confirming purity and weight.</span>
              </div>
              <div className="plat-engine-box">
                <strong>2. Chain of Custody</strong>
                <span>Documented provenance history from source to vault.</span>
              </div>
              <div className="plat-engine-box">
                <strong>3. Seller Attestation</strong>
                <span>Legal declaration of ownership and authority to sell.</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <strong>Publish Gate:</strong> A deterministic function evaluates seller
              verification status and evidence completeness before allowing a listing
              to go live. Incomplete submissions are blocked at the code level.
            </p>
          </section>

          {/* ─── 10. Certificate Engine ─── */}
          <section id="certificate-engine" className="plat-section">
            <h2>10. Certificate Engine</h2>
            <p>
              When a settlement reaches <span className="plat-code">SETTLED</span> status
              via DvP execution, the engine automatically issues a <strong>Gold Clearing Certificate</strong>.
            </p>
            <div className="plat-callout">
              <span className="plat-callout-title">Cryptographic Finality</span>
              Each certificate contains a <strong>SHA-256 signature hash</strong> of its
              canonically serialized payload. This allows any party to independently verify
              that the certificate contents match the immutable ledger record.
            </div>
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
              <strong>Takeaway:</strong> Immutable clearing certificates provide independently verifiable proof of settlement finality for bilateral reconciliation, regulatory reporting, and custody transfer documentation.
            </div>
          </section>

          {/* ─── 11. Fee Model & Pricing ─── */}
          <section id="fee-model" className="plat-section">
            <h2>11. Fee Model &amp; Pricing</h2>
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
              Subject to configurable minimum and maximum thresholds.
            </div>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Parameter</th>
                    <th>Default Value</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Indemnification Rate</strong></td>
                    <td><span className="plat-code">100 bps (1.00%)</span></td>
                    <td>Core platform fee. Percentage of transaction notional value.</td>
                  </tr>
                  <tr>
                    <td><strong>Minimum Fee</strong></td>
                    <td><span className="plat-code">$250.00</span></td>
                    <td>Floor applied to small transactions.</td>
                  </tr>
                  <tr>
                    <td><strong>Maximum Fee</strong></td>
                    <td><span className="plat-code">$50,000.00</span></td>
                    <td>Cap applied to large transactions.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ color: "var(--text)" }}>
              Fees are <strong>frozen into the settlement record at activation</strong>.
              Active settlements retain their fee snapshot even if rates are subsequently adjusted.
            </p>

            <h3>Optional Add-On Services</h3>
            <p>
              In addition to the core indemnification fee, clearing authorities may configure
              optional service add-ons. These are independently toggled and itemized —
              distinguishing vendor pass-through costs from platform coordination fees:
            </p>
            <ul>
              <li><strong>Expedited Settlement:</strong> Priority processing for time-sensitive transactions.</li>
              <li><strong>Vault Insurance:</strong> Extended storage and transit coverage (vendor pass-through).</li>
              <li><strong>Regulatory Reporting:</strong> Automated compliance report generation.</li>
              <li><strong>Optional Clearing Charge:</strong> Configurable per-transaction processing charge, if applicable.</li>
            </ul>
            <p style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
              The core economics are simple: 1% of notional for indemnification.
              Everything else is optional and itemized.
            </p>
          </section>

          {/* ─── 12. Settlement Activation Gate ─── */}
          <section id="activation-gate" className="plat-section">
            <h2>12. Settlement Activation Gate</h2>
            <p>
              Before any settlement can proceed to DvP execution, it must pass through
              a <strong>five-point activation gate</strong>. This deterministic checklist
              ensures that all preconditions are satisfied before capital is committed.
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Identity Verified</strong>
                <span>Both counterparties have completed KYC/KYB verification.</span>
              </div>
              <div className="plat-engine-box" style={{ borderLeft: "3px solid var(--success)" }}>
                <strong>Evidence Packed</strong>
                <span>Assay report, chain of custody, and seller attestation attached.</span>
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
                <span>Fee breakdown reviewed and accepted by clearing authority.</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <strong>Gate Logic:</strong> All five checks must return{" "}
              <span className="plat-code">PASS</span> before the settlement transitions
              to <span className="plat-code">READY_TO_SETTLE</span>. Any failing check
              blocks activation and surfaces a specific remediation action.
            </p>
          </section>

          {/* ─── 13. Security ─── */}
          <section id="security" className="plat-section">
            <h2>13. Security Architecture</h2>
            <ul>
              <li><strong>No Settlement Gap:</strong> Atomic DvP execution eliminates temporal exposure between payment and delivery.</li>
              <li><strong>Precondition Enforcement:</strong> Code-level validation of funds, gold status, and identity before any state transition.</li>
              <li><strong>Role-Gated Actions:</strong> Deterministic role maps enforce that only authorized actors can perform specific operations.</li>
              <li><strong>Frozen Snapshots:</strong> Capital and policy state recorded at moment of execution, creating an immutable audit trail.</li>
              <li><strong>Append-Only Ledger:</strong> All state transitions produce immutable ledger entries. No record can be modified or deleted.</li>
            </ul>
          </section>

          {/* ─── 14. Strategic Alignment ─── */}
          <section id="alignment" className="plat-section">
            <h2>14. Strategic Alignment</h2>

            <h3>Why This Matters Now</h3>
            <p>
              The physical gold market is at an inflection point. Growing regulatory
              scrutiny of OTC precious metals trading, rising fraud exposure in cross-border
              gold transactions, the ongoing institutionalization of physical commodity
              markets, and the increasing demand for standardized clearing mechanisms
              all point to the same conclusion: bilateral settlement is an institutional
              liability, and the market needs clearing infrastructure.
            </p>

            <p>
              AurumShield operationalizes the high-level business proposition into specific,
              enforceable mechanisms. It translates trust and insurance concepts into
              cryptographic proofs and capital constraints.
            </p>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Business Requirement</th>
                    <th style={{ width: "35%" }}>Technical Implementation</th>
                    <th>Alignment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Eliminate Principal Risk</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>&quot;Non-delivery after payment&quot;</span>
                    </td>
                    <td>
                      <strong>Atomic DvP (Core Clearing Engine)</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Money and title transfer simultaneously in one computational step.</span>
                    </td>
                    <td>
                      <span className="plat-status-success">✓ Mathematically Prevents Fraud</span><br />
                      Eliminates the settlement gap entirely.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Physical Verification</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>&quot;Inspection of mines &amp; purity&quot;</span>
                    </td>
                    <td>
                      <strong>Evidence Packing &amp; Publish Gate</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Listings blocked without digital artifacts (Assay, Chain of Custody).</span>
                    </td>
                    <td>
                      <span className="plat-status-success">✓ Digital Enforcement</span><br />
                      Transforms physical checks into mandatory digital preconditions.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Insurance-Backed</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>&quot;Transaction indemnification&quot;</span>
                    </td>
                    <td>
                      <strong>Capital Adequacy Framework</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Real-time ECR tracking and Hardstop Limits preventing over-underwriting.</span>
                    </td>
                    <td>
                      <span className="plat-status-success">✓ Solvency Guarantee</span><br />
                      Ensures indemnity capital actually exists before trades clear.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Anonymity &amp; Privacy</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>&quot;Anonymous transaction option&quot;</span>
                    </td>
                    <td>
                      <strong>Central Clearing Model</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AurumShield acts as the central counterparty, shielding identities via RBAC.</span>
                    </td>
                    <td>
                      <span className="plat-status-success">✓ Architectural Privacy</span><br />
                      Identities shielded by design, not just policy.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Regulatory Compliance</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>&quot;Compliance-ready documentation&quot;</span>
                    </td>
                    <td>
                      <strong>Append-Only Audit Ledger</strong><br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Immutable event stream and automated Supervisory Case Dossiers.</span>
                    </td>
                    <td>
                      <span className="plat-status-success">✓ Audit Readiness</span><br />
                      Zero-overhead reporting for regulatory scrutiny.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── 15. Interactive Demo System ─── */}
          <section id="demo-system" className="plat-section">
            <h2>15. Interactive Demo System</h2>
            <p>
              AurumShield includes a <strong>role-based guided tour system</strong> for
              stakeholder demonstrations. Each tour walks the viewer through the platform
              from a specific institutional perspective.
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>Buyer Tour</strong>
                <span>Marketplace → Reserve → Order → Verify → Settle → Certificate</span>
              </div>
              <div className="plat-engine-box">
                <strong>Seller Tour</strong>
                <span>Listings → Evidence → Publish → Settlement → Certificate</span>
              </div>
              <div className="plat-engine-box">
                <strong>Admin Tour</strong>
                <span>Dashboard → Pricing → Capital Controls → Settlements → Audit</span>
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
        <p>AurumShield — Institutional Clearing Infrastructure for Physical Gold Transactions</p>
        <p>© 2026 AurumShield. All rights reserved.</p>
      </footer>
    </div>
  );
}
