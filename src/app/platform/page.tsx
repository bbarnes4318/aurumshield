"use client";

/* ================================================================
   PLATFORM CAPABILITIES — Public-facing technical overview
   Route: /platform
   Renders outside the app shell (no sidebar/topbar).
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
          padding: 1.5rem 0;
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arum-logo-white.png"
              alt="AurumShield"
              style={{ height: 44, width: "auto" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="plat-meta">
            <span className="plat-badge">Confidential</span>
            <div>v1.3.0 · Feb 2026</div>
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
              <li>
                <a href="#executive-summary">1. Executive Summary</a>
              </li>
              <li>
                <a href="#problem-statement">2. The Problem</a>
              </li>
              <li>
                <a href="#platform-architecture">3. Platform Architecture</a>
              </li>
              <li>
                <a href="#clearing-engine">4. Core Clearing Engine</a>
              </li>
              <li>
                <a href="#capital-framework">5. Capital Adequacy</a>
              </li>
              <li>
                <a href="#policy-engine">6. Policy &amp; Risk Engine</a>
              </li>
              <li>
                <a href="#verification">7. Verification Perimeter</a>
              </li>
              <li>
                <a href="#marketplace">8. Marketplace Infrastructure</a>
              </li>
              <li>
                <a href="#settlement">9. Certificate Engine</a>
              </li>
              <li>
                <a href="#governance">10. Governance &amp; Audit</a>
              </li>
              <li>
                <a href="#security">12. Security Architecture</a>
              </li>
              <li>
                <a href="#alignment">13. Strategic Alignment</a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main>
          {/* Title Card */}
          <div className="plat-card" id="title-card">
            <h1>AurumShield Platform</h1>
            <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
              Sovereign Clearing Infrastructure for Institutional Precious
              Metals
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
            <p>
              AurumShield is a sovereign clearing platform purpose-built for the
              institutional physical gold market. It addresses the fundamental
              structural risk that has plagued precious metals trading for
              decades:{" "}
              <strong>
                the absence of a central clearing mechanism for physical gold
                transactions
              </strong>
              .
            </p>

            <div className="plat-callout">
              <span className="plat-callout-title">The Value Proposition</span>
              Today, institutional gold trades settle bilaterally, creating{" "}
              <strong>principal risk</strong>. AurumShield eliminates this via
              atomic Delivery-versus-Payment (DvP) and continuous capital
              adequacy monitoring.
            </div>

            <h3>Key Capabilities</h3>
            <ul>
              <li>
                <strong>Atomic Delivery-versus-Payment (DvP):</strong> Title and
                payment transfer simultaneously in a single deterministic
                operation.
              </li>
              <li>
                <strong>Continuous Capital Adequacy Monitoring:</strong>{" "}
                Real-time exposure tracking with deterministic breach detection.
              </li>
              <li>
                <strong>Deterministic Policy Enforcement:</strong> Risk scoring
                and approval tiering that cannot be bypassed.
              </li>
              <li>
                <strong>Cryptographic Settlement Finality:</strong> SHA-256
                signed clearing certificates proving settlement completion.
              </li>
              <li>
                <strong>Institutional Verification Perimeter:</strong>{" "}
                Multi-step KYC/KYB with sanctions screening.
              </li>
            </ul>
          </section>

          {/* ─── 2. The Problem ─── */}
          <section id="problem-statement" className="plat-section">
            <h2>2. The Problem: Systemic Risk</h2>
            <p>
              In traditional bilateral gold transactions, payment and delivery
              occur as separate events. This creates a settlement gap—principal
              risk—where one party delivers while the other defaults.
            </p>
            <div className="plat-engine-grid" style={{ marginTop: "2rem" }}>
              <div className="plat-engine-box">
                <strong>The Settlement Gap</strong>
                <span>
                  Traditional T+2 settlement creates temporal exposure.
                </span>
              </div>
              <div className="plat-engine-box">
                <strong>Counterparty Opacity</strong>
                <span>
                  Limited standardized risk assessment in OTC markets.
                </span>
              </div>
              <div className="plat-engine-box">
                <strong>Inventory Integrity</strong>
                <span>Fragmented paper trails for provenance and assay.</span>
              </div>
              <div className="plat-engine-box">
                <strong>Regulatory Gaps</strong>
                <span>Fragmented records across email, CRM, and banking.</span>
              </div>
            </div>
          </section>

          {/* ─── 3. Platform Architecture ─── */}
          <section id="platform-architecture" className="plat-section">
            <h2>3. Platform Architecture</h2>
            <h3>3.1 Design Principles</h3>
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
                    <td>
                      Every computation produces the same output given the same
                      inputs. No randomness. Time is passed as an explicit
                      parameter.
                    </td>
                  </tr>
                  <tr>
                    <td>Immutability</td>
                    <td>
                      All engine functions return new state objects. Ledger
                      entries are append-only. Frozen snapshots cannot be
                      altered.
                    </td>
                  </tr>
                  <tr>
                    <td>Idempotency</td>
                    <td>
                      Every operation can be safely retried. Certificate
                      issuance and breach events check for existing artifacts.
                    </td>
                  </tr>
                  <tr>
                    <td>Zero Trust</td>
                    <td>
                      Every action is gated by role-based access control. All
                      state transitions validated against preconditions.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>3.2 Engine Architecture</h3>
            <div className="plat-arch">
              <div className="plat-layer">
                <span className="plat-layer-title">Presentation Layer</span>
                Dashboard · Marketplace · Settlements · Capital · Audit
              </div>
              <div className="plat-layer">
                <span className="plat-layer-title">API / Hook Layer</span>
                TanStack Query (React) · Mock Endpoints · LocalStorage
              </div>
              <div className="plat-engine-grid">
                <div className="plat-engine-box">
                  <strong>Settlement Engine</strong>
                  <span>Open → Auth → DvP</span>
                  <span>Append-only Ledger</span>
                </div>
                <div className="plat-engine-box">
                  <strong>Capital Engine</strong>
                  <span>ECR · Hardstop Util</span>
                  <span>Breach Detection</span>
                </div>
                <div className="plat-engine-box">
                  <strong>Policy Engine</strong>
                  <span>TRI Score</span>
                  <span>Capital Validation</span>
                </div>
                <div className="plat-engine-box">
                  <strong>Certificate Engine</strong>
                  <span>SHA-256 Signing</span>
                  <span>Idempotent Issue</span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 4. Core Clearing Engine ─── */}
          <section id="clearing-engine" className="plat-section">
            <h2>4. Core Clearing Engine</h2>
            <p>
              The settlement engine implements a{" "}
              <strong>six-stage deterministic lifecycle</strong> for every gold
              transaction:
            </p>
            <div className="plat-flow">
              ESCROW_OPEN → AWAITING_FUNDS → AWAITING_GOLD →
              AWAITING_VERIFICATION → READY_TO_SETTLE → AUTHORIZED → SETTLED
            </div>

            <h3>Atomic DvP Execution</h3>
            <p>The centerpiece is the two-step DvP mechanism:</p>
            <ol>
              <li>
                <strong>Authorization:</strong> Clearing authority authorizes
                settlement. A capital snapshot is frozen into the ledger.
              </li>
              <li>
                <strong>DvP Execution:</strong> Title and payment transfer
                simultaneously. Status transitions directly to{" "}
                <span className="plat-code">SETTLED</span>.
              </li>
            </ol>
          </section>

          {/* ─── 5. Capital Adequacy ─── */}
          <section id="capital-framework" className="plat-section">
            <h2>5. Capital Adequacy Framework</h2>
            <p>
              AurumShield implements continuous intraday capital monitoring. The
              engine derives a complete snapshot from the current system state.
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
                    <td>
                      <strong>Capital Base</strong>
                    </td>
                    <td>Total available capital for clearing operations.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Gross Exposure</strong>
                    </td>
                    <td>
                      Sum of all active reservations, pending orders, and open
                      settlements.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>ECR (Ratio)</strong>
                    </td>
                    <td>
                      Gross Exposure ÷ Capital Base. Primary adequacy indicator.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Hardstop Util</strong>
                    </td>
                    <td>
                      Gross Exposure ÷ Hardstop Limit. Approaching 95% triggers
                      critical breach.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Capital Controls Enforcement</h3>
            <p>
              The engine translates breach history into enforceable control
              decisions:
            </p>
            <div
              className="plat-engine-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              }}
            >
              <div
                className="plat-engine-box"
                style={{ borderLeft: "3px solid var(--success)" }}
              >
                <strong className="plat-status-success">NORMAL</strong>
                <span>All operations permitted.</span>
              </div>
              <div
                className="plat-engine-box"
                style={{ borderLeft: "3px solid var(--warning)" }}
              >
                <strong className="plat-status-warning">THROTTLE</strong>
                <span>New reservations limited.</span>
              </div>
              <div
                className="plat-engine-box"
                style={{ borderLeft: "3px solid var(--warning)" }}
              >
                <strong className="plat-status-warning">FREEZE</strong>
                <span>Conversions blocked.</span>
              </div>
              <div
                className="plat-engine-box"
                style={{ borderLeft: "3px solid var(--danger)" }}
              >
                <strong className="plat-status-danger">HALT</strong>
                <span>All operations suspended.</span>
              </div>
            </div>
          </section>

          {/* ─── 6. Policy & Risk Engine ─── */}
          <section id="policy-engine" className="plat-section">
            <h2>6. Policy &amp; Risk Engine</h2>
            <p>
              The Transaction Risk Index (TRI) is a weighted composite score
              used to classify transaction risk.
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
                      <span
                        className="plat-badge"
                        style={{
                          background: "rgba(63, 174, 122, 0.2)",
                          color: "var(--success)",
                        }}
                      >
                        Green
                      </span>
                    </td>
                    <td>0 – 3.0</td>
                    <td>Low risk. Auto-approval eligible.</td>
                  </tr>
                  <tr>
                    <td>
                      <span
                        className="plat-badge"
                        style={{
                          background: "rgba(208, 168, 92, 0.2)",
                          color: "var(--warning)",
                        }}
                      >
                        Amber
                      </span>
                    </td>
                    <td>3.0 – 6.0</td>
                    <td>Moderate risk. Senior review required.</td>
                  </tr>
                  <tr>
                    <td>
                      <span
                        className="plat-badge"
                        style={{
                          background: "rgba(209, 106, 93, 0.2)",
                          color: "var(--danger)",
                        }}
                      >
                        Red
                      </span>
                    </td>
                    <td>6.0 – 10.0</td>
                    <td>High risk. Committee approval required.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Immutable Policy Snapshot:</strong> When a reservation
              converts to an order, a{" "}
              <span className="plat-code">MarketplacePolicySnapshot</span> is
              frozen and attached to the order. This creates an unalterable
              record of the risk conditions under which the trade was approved.
            </p>
          </section>

          {/* ─── 7. Verification ─── */}
          <section id="verification" className="plat-section">
            <h2>7. Verification &amp; Identity Perimeter</h2>
            <p>
              Mandatory identity perimeter. No counterparty trades without
              completing the appropriate track.
            </p>
            <ul>
              <li>
                <strong>KYC (Individuals):</strong> ID Capture, Liveness Check,
                Sanctions Screening.
              </li>
              <li>
                <strong>KYB (Entities):</strong> Company Registration, UBO
                Declaration, Source of Funds.
              </li>
            </ul>
            <p>
              Every verification step produces an evidence stub with a
              deterministic document ID and timestamp.
            </p>
          </section>

          {/* ─── 8. Marketplace Infrastructure ─── */}
          <section id="marketplace" className="plat-section">
            <h2>8. Marketplace Infrastructure</h2>
            <p>
              The marketplace implements a strict sell-side pipeline. Before
              publishing, sellers must attach a three-part evidence pack:
            </p>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>1. Assay Report</strong>
                <span>Laboratory analysis confirming purity.</span>
              </div>
              <div className="plat-engine-box">
                <strong>2. Chain of Custody</strong>
                <span>Documented provenance history.</span>
              </div>
              <div className="plat-engine-box">
                <strong>3. Seller Attestation</strong>
                <span>Legal declaration of ownership.</span>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <strong>Publish Gate:</strong> A deterministic function evaluates
              Seller Verification and Evidence Completeness before allowing a
              listing to go live.
            </p>
          </section>

          {/* ─── 9. Certificate Engine ─── */}
          <section id="settlement" className="plat-section">
            <h2>9. Certificate Engine</h2>
            <p>
              When a settlement reaches{" "}
              <span className="plat-code">SETTLED</span> status via DvP
              execution, the engine automatically issues a{" "}
              <strong>Gold Clearing Certificate</strong>.
            </p>
            <div className="plat-callout">
              <span className="plat-callout-title">Cryptographic Finality</span>
              Each certificate contains a{" "}
              <strong>SHA-256 signature hash</strong> of its canonically
              serialized payload. This allows any party to independently verify
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
                    <td>
                      <span className="plat-code">
                        AS-GC-YYYYMMDD-&lt;HEX&gt;-&lt;SEQ&gt;
                      </span>{" "}
                      (Deterministic generation)
                    </td>
                  </tr>
                  <tr>
                    <td>Signature Hash</td>
                    <td>SHA-256 of canonical payload.</td>
                  </tr>
                  <tr>
                    <td>DvP Ledger ID</td>
                    <td>Reference to the specific execution ledger entry.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── 10. Governance ─── */}
          <section id="governance" className="plat-section">
            <h2>10. Governance &amp; Audit</h2>
            <p>
              Every significant system action generates an append-only audit
              event. The <strong>Supervisory Console</strong> presents these
              events as regulator-ready case dossiers.
            </p>
            <pre className="plat-pre">
              {`{
  "occurredAt": "2026-02-18T14:30:00Z",
  "actorRole": "admin",
  "action": "EXECUTE_DVP",
  "resourceType": "settlement",
  "resourceId": "stl-001",
  "result": "SUCCESS",
  "hash": "a1b2c3d4..."
}`}
            </pre>
          </section>

          {/* ─── 12. Security ─── */}
          <section id="security" className="plat-section">
            <h2>12. Security Architecture</h2>
            <ul>
              <li>
                <strong>No Settlement Gap:</strong> Atomic DvP execution.
              </li>
              <li>
                <strong>Precondition Enforcement:</strong> Code-level validation
                of funds/gold status.
              </li>
              <li>
                <strong>Role-Gated Actions:</strong> Deterministic role maps
                defined in source code.
              </li>
              <li>
                <strong>Frozen Snapshots:</strong> Capital and policy state
                recorded at moment of execution.
              </li>
            </ul>
          </section>

          {/* ─── 13. Strategic Alignment ─── */}
          <section id="alignment" className="plat-section">
            <h2>13. Strategic Alignment Analysis</h2>
            <p>
              This platform architecture operationalizes the high-level promises
              of the Business Plan into specific, enforceable software
              mechanisms. It translates trust and insurance concepts into
              cryptographic proofs and capital constraints.
            </p>
            <div className="plat-callout">
              <span className="plat-callout-title">
                Architectural Realization
              </span>
              The platform is the technical &quot;How&quot; to the Business
              Plan&apos;s &quot;What&quot;. It moves beyond intent to provide
              mathematical guarantees for the proposed business value.
            </div>
            <div className="plat-table-wrap">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Business Requirement</th>
                    <th style={{ width: "35%" }}>Technical Implementation</th>
                    <th>Strategic Alignment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Eliminate Principal Risk</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-faint)",
                        }}
                      >
                        &quot;Non-delivery after payment&quot;
                      </span>
                    </td>
                    <td>
                      <strong>Atomic DvP (Core Clearing Engine)</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Money and title transfer simultaneously in one
                        computational step.
                      </span>
                    </td>
                    <td>
                      <span className="plat-status-success">
                        ✓ Mathematically Prevents Fraud
                      </span>
                      <br />
                      Eliminates the settlement gap entirely.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Physical Verification</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-faint)",
                        }}
                      >
                        &quot;Inspection of mines &amp; purity&quot;
                      </span>
                    </td>
                    <td>
                      <strong>Evidence Packing &amp; Publish Gate</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Listings blocked without digital artifacts (Assay, Chain
                        of Custody).
                      </span>
                    </td>
                    <td>
                      <span className="plat-status-success">
                        ✓ Digital Enforcement
                      </span>
                      <br />
                      Transforms physical checks into mandatory digital
                      preconditions.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Insurance-Backed</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-faint)",
                        }}
                      >
                        &quot;Transaction insurance&quot;
                      </span>
                    </td>
                    <td>
                      <strong>Capital Adequacy Framework</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Real-time ECR tracking and Hardstop Limits preventing
                        over-underwriting.
                      </span>
                    </td>
                    <td>
                      <span className="plat-status-success">
                        ✓ Solvency Guarantee
                      </span>
                      <br />
                      Ensures indemnity capital actually exists before trades
                      clear.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Anonymity &amp; Privacy</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-faint)",
                        }}
                      >
                        &quot;Anonymous transaction option&quot;
                      </span>
                    </td>
                    <td>
                      <strong>Central Clearing Model</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        AurumShield acts as the central counterparty, shielding
                        identities via RBAC.
                      </span>
                    </td>
                    <td>
                      <span className="plat-status-success">
                        ✓ Architectural Privacy
                      </span>
                      <br />
                      Identities shielded by design, not just policy.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Regulatory Compliance</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-faint)",
                        }}
                      >
                        &quot;Compliance-ready documentation&quot;
                      </span>
                    </td>
                    <td>
                      <strong>Append-Only Audit Ledger</strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Immutable event stream and automated Supervisory Case
                        Dossiers.
                      </span>
                    </td>
                    <td>
                      <span className="plat-status-success">
                        ✓ Audit Readiness
                      </span>
                      <br />
                      Zero-overhead reporting for regulatory scrutiny.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── API Stats ─── */}
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--border)",
              margin: "4rem 0",
            }}
          />
          <section id="api-stats" className="plat-section">
            <h3>System API Surface</h3>
            <div className="plat-engine-grid">
              <div className="plat-engine-box">
                <strong>Marketplace</strong>
                <span>14 Endpoints</span>
              </div>
              <div className="plat-engine-box">
                <strong>Settlements</strong>
                <span>5 Endpoints</span>
              </div>
              <div className="plat-engine-box">
                <strong>Capital &amp; Risk</strong>
                <span>8 Endpoints</span>
              </div>
              <div className="plat-engine-box">
                <strong>Audit &amp; Certs</strong>
                <span>5 Endpoints</span>
              </div>
            </div>
            <p
              style={{
                textAlign: "right",
                marginTop: "1rem",
                fontSize: "0.875rem",
              }}
            >
              <strong>Total: 33 API Endpoints</strong>
            </p>
          </section>
        </main>
      </div>

      {/* ─── Footer ─── */}
      <footer className="plat-footer">
        <p>
          AurumShield — Sovereign Clearing Infrastructure for Institutional
          Precious Metals
        </p>
        <p>© 2026 AurumShield. All rights reserved.</p>
      </footer>
    </div>
  );
}
