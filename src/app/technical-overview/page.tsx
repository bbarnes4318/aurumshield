import Image from "next/image";
import { headers } from "next/headers";

/* ================================================================
   TECHNICAL OVERVIEW — Investor Due-Diligence Document
   Route: /technical-overview
   Renders OUTSIDE the app shell (no sidebar/topbar).

   Sections:
   1. Executive Summary & Technical Overview
   2. Transaction Lifecycle
   3. Security Architecture & Compliance Mapping
   4. Technical Stack & Infrastructure
   ================================================================ */

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

export default async function TechnicalOverviewPage() {
  const back = await getBackCta();

  return (
    <div className="tech-overview-page">
      {/* ─── Embedded Styles — aligned to platform-overview structure ─── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .tech-overview-page {
          --bg: #0A1128;
          --surface-1: rgba(255, 255, 255, 0.02);
          --surface-2: rgba(255, 255, 255, 0.04);
          --surface-3: rgba(255, 255, 255, 0.06);
          --border: #1e293b;
          --text: #cbd5e1;
          --text-muted: #94a3b8;
          --text-faint: #64748b;
          --gold: #c6a86b;
          --gold-hover: #d3b77d;
          --success: #3fae7a;
          --warning: #c6a86b;
          --danger: #d16a5d;
          --info: #5a8ccb;
          --radius: 6px;
          --radius-sm: 4px;
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

        .tech-overview-page a { color: var(--gold); text-decoration: none; transition: color 0.2s; }
        .tech-overview-page a:hover { color: var(--gold-hover); }

        .tech-overview-page h1,
        .tech-overview-page h2,
        .tech-overview-page h3,
        .tech-overview-page h4 {
          font-family: var(--font-serif);
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        /* Header — matches plat-header */
        .to-header {
          background: var(--surface-1);
          border-bottom: 1px solid var(--border);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .to-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .to-badge {
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
        .to-meta { text-align: right; font-size: 0.875rem; color: var(--text-faint); }

        /* Container — matches plat-container (single-column for technical overview) */
        .to-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Title card — matches plat-card */
        .to-card {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .to-card h1 { font-size: 2.25rem; letter-spacing: -0.02em; border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-top: 0; }

        /* Section — matches plat-section */
        .to-section h2 { font-size: 1.6rem; letter-spacing: -0.01em; color: var(--gold); margin-top: 2.5rem; margin-bottom: 1rem; }
        .to-section h3 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.75rem; font-family: var(--font-sans); }
        .to-section p { margin-bottom: 1rem; color: var(--text-muted); font-size: 0.925rem; }
        .to-section strong { color: var(--text); font-weight: 600; }
        .to-section ul, .to-section ol { color: var(--text-muted); margin-bottom: 1rem; padding-left: 1.25rem; }
        .to-section li { margin-bottom: 0.35rem; font-size: 0.925rem; }
        .to-section code { font-family: var(--font-mono); background: var(--surface-3); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.85em; color: var(--gold); }

        /* Table — matches plat-table */
        .to-table-wrap { overflow-x: auto; margin-bottom: 2rem; border-radius: var(--radius); border: 1px solid var(--border); }
        .to-table { width: 100%; border-collapse: collapse; background: var(--surface-1); font-size: 0.875rem; }
        .to-table th { text-align: left; background: var(--surface-2); color: var(--text-faint); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
        .to-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-muted); vertical-align: top; }
        .to-table tr:last-child td { border-bottom: none; }
        .to-table tr:hover td { background: rgba(255,255,255,0.02); }

        /* KPI Row */
        .to-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
        .to-kpi { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; text-align: center; }
        .to-kpi .to-val { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; color: var(--gold); }
        .to-kpi .to-lbl { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-faint); margin-top: 0.25rem; }

        /* Pipeline */
        .to-pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
        .to-step { background: var(--surface-1); border: 1px solid var(--border); border-left: 2px solid var(--gold); border-radius: 0; padding: 1.25rem; position: relative; overflow: hidden; }
        .to-step::before { content: ""; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--gold); }
        .to-step .to-num { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 700; color: var(--gold); opacity: 0.35; position: absolute; top: 0.5rem; right: 0.75rem; }
        .to-step h4 { font-family: var(--font-sans); font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .to-step p { font-size: 0.8125rem; line-height: 1.45; color: var(--text-muted); margin: 0; }
        .to-step .to-tag { display: inline-block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; margin-top: 0.5rem; }
        .to-tag-auth { background: rgba(90,140,203,0.15); color: var(--info); }
        .to-tag-kyc { background: rgba(63,174,122,0.15); color: var(--success); }
        .to-tag-engine { background: rgba(208,168,92,0.15); color: var(--warning); }
        .to-tag-settle { background: rgba(198,168,107,0.15); color: var(--gold); }
        .to-tag-ship { background: rgba(209,106,93,0.15); color: var(--danger); }

        /* Engine grid — matches plat-engine-grid */
        .to-engine-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .to-engine-box {
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 1rem;
          border-radius: 4px;
        }
        .to-engine-box strong { display: block; color: var(--text); margin-bottom: 0.5rem; font-size: 0.9rem; }
        .to-engine-box span { display: block; font-size: 0.75rem; color: var(--text-faint); margin-bottom: 0.25rem; }

        /* Callout — matches plat-callout */
        .to-callout {
          border-left: 4px solid var(--gold);
          background: rgba(198, 168, 107, 0.05);
          padding: 1.5rem;
          border-radius: 0 var(--radius) var(--radius) 0;
          margin: 2rem 0;
        }
        .to-callout-title { font-weight: bold; color: var(--gold); display: block; margin-bottom: 0.5rem; font-family: var(--font-sans); }

        /* Two-column grid */
        .to-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 768px) { .to-g2, .to-pipeline { grid-template-columns: 1fr; } }

        /* Divider */
        .to-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); margin: 3rem 0; opacity: 0.4; }

        /* Back link */
        .to-back-link { color: var(--text-faint); font-size: 0.8125rem; text-decoration: none; display: flex; align-items: center; gap: 0.25rem; transition: color 0.2s; }
        .to-back-link:hover { color: var(--gold); }

        .to-gold { color: var(--gold); }
        .to-chk { color: var(--success); }

        /* Footer — matches plat-footer */
        .to-footer {
          text-align: center;
          padding: 4rem 0 2rem;
          color: var(--text-faint);
          font-size: 0.875rem;
          border-top: 1px solid var(--border);
          margin-top: 4rem;
        }

        /* Print */
        @media print {
          .tech-overview-page { background: white; color: black; }
          .to-back-link, .to-header { display: none; }
          .to-container { padding: 0; }
          .to-card, .to-step, .to-kpi, .to-engine-box { border-color: #ddd; background: white; color: black; }
          .to-table th { background: #f5f5f5; color: #333; }
          .to-table td { color: #444; }
        }
      `,
        }}
      />

      {/* ─── Header ─── */}
      <header className="to-header">
        <div className="to-header-inner">
          <div>
            <Image
              src="/arum-logo-gold.svg"
              alt="AurumShield"
              width={180}
              height={48}
              priority
            />
          </div>
          <div className="to-meta">
            <span className="to-badge">Confidential</span>
            <div>v3.0.0 · Feb 2026</div>
          </div>
        </div>
      </header>

      {/* ─── Container ─── */}
      <div className="to-container">

        {/* Back link */}
        <a href={back.href} className="to-back-link" style={{ marginBottom: "1.5rem" }}>
          ← {back.label}
        </a>

        {/* Title Card */}
        <div className="to-card">
          <h1>AurumShield<span className="to-gold">.</span></h1>
          <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
            Sovereign Financial Infrastructure for Institutional Gold Trading —
            End-to-End Platform Technical Overview
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
              Investor Due Diligence
            </p>
            <p style={{ margin: 0 }}>
              <strong>Prepared by:</strong> AurumShield Engineering
            </p>
          </div>
        </div>

        {/* ═══════════════ SECTION 1 — EXECUTIVE SUMMARY ═══════════════ */}
        <section className="to-section">
          <h2>1. Executive Summary &amp; Technical Overview</h2>

          <p>
            AurumShield is a{" "}
            <strong>sovereign financial infrastructure platform</strong>{" "}
            purpose-built for secure, compliant institutional gold trading. The
            platform delivers a fully integrated digital experience — from
            counterparty onboarding and identity verification through real-time
            marketplace operations, settlement execution, and physical delivery
            logistics — within a single, auditable system.
          </p>

          <p>
            The platform implements{" "}
            <strong>clearinghouse-grade trade lifecycle management</strong> with
            formalized state machines governing every order and settlement
            transition. All operations are enforced through a deterministic policy
            engine that evaluates counterparty risk, capital adequacy, and
            compliance posture in real time before any transaction is authorized.
          </p>

          <p>
            AurumShield&apos;s architecture is designed around three core principles:{" "}
            <strong>fail-closed security</strong> (every protected operation
            requires DB-verified compliance approval and valid LEI/role),{" "}
            <strong>dual-rail settlement resilience</strong> (automatic failover
            between Modern Treasury Fedwire and Moov wallet-to-wallet rails), and{" "}
            <strong>forensic auditability</strong> (every state transition produces
            tamper-evident, SHA-256 hashed audit events with maker-checker
            cryptographic binding via WebAuthn signatures).
          </p>

          <div className="to-kpi-row">
            <div className="to-kpi">
              <div className="to-val">25+</div>
              <div className="to-lbl">Core Engine Modules</div>
            </div>
            <div className="to-kpi">
              <div className="to-val">10</div>
              <div className="to-lbl">Database Migrations</div>
            </div>
            <div className="to-kpi">
              <div className="to-val">2</div>
              <div className="to-lbl">Settlement Rails</div>
            </div>
            <div className="to-kpi">
              <div className="to-val">5-Layer</div>
              <div className="to-lbl">RBAC Capability Ladder</div>
            </div>
            <div className="to-kpi">
              <div className="to-val">3-Tier</div>
              <div className="to-lbl">AWS Network Isolation</div>
            </div>
            <div className="to-kpi">
              <div className="to-val">SHA-256</div>
              <div className="to-lbl">Audit Hash Chain</div>
            </div>
          </div>
        </section>

        <div className="to-divider" />

        {/* ═══════════════ SECTION 2 — TRANSACTION LIFECYCLE ═══════════════ */}
        <section className="to-section">
          <h2>2. The Lifecycle of a Transaction</h2>

          <p>
            Every gold transaction on AurumShield follows a strict, auditable
            pipeline from initial user registration through final delivery
            confirmation. Each stage is governed by formalized state machines
            (<code>state-machine.ts</code>), role-based access controls
            (<code>authz.ts</code>), and capital adequacy checks
            (<code>capital-controls.ts</code>) — ensuring no step can be bypassed or
            executed out of order. This deterministic escrow mechanism
            mathematically eliminates Herstatt Risk (asynchronous settlement
            exposure), ensuring neither counterparty holds unrecovered notional
            value during transit.
          </p>

          <div className="to-pipeline">
            <div className="to-step">
              <div className="to-num">01</div>
              <h4>Entity &amp; Account Creation</h4>
              <p>
                Organizations register with a strictly required Legal Entity
                Identifier (LEI), validated against the <strong>Global LEI
                Foundation (GLEIF) API</strong> for deterministic entity resolution.
                Authentication is enforced via <strong>Hardware Key/WebAuthn</strong>{" "}
                and <strong>Enterprise SSO (SAML/OIDC via Okta/Entra ID)</strong>.
                SMS OTP has been fully removed. Device fingerprinting
                via <strong>Fingerprint.com</strong> establishes a trust baseline.
              </p>
              <span className="to-tag to-tag-auth">GLEIF · WebAuthn · Okta/Entra</span>
            </div>

            <div className="to-step">
              <div className="to-num">02</div>
              <h4>Know-Your-Business (KYB) Verification</h4>
              <p>
                The verification engine (<code>verification-engine.ts</code>)
                orchestrates a headless <strong>Persona KYB</strong> integration
                accepting LEI/EIN to fetch registry data and map Ultimate Beneficial
                Owners (UBOs). <strong>OpenSanctions</strong> screens against
                OFAC, EU, UN, HMT, and DFAT watchlists. Retail KYC selfie-check
                components have been removed — all counterparties are Corporate Entities.
              </p>
              <span className="to-tag to-tag-kyc">Persona KYB · GLEIF LEI · OpenSanctions</span>
            </div>

            <div className="to-step">
              <div className="to-num">03</div>
              <h4>Compliance Case Approval</h4>
              <p>
                The compliance case model (<code>compliance/models.ts</code>)
                creates a formal case that progresses through a confined state
                machine: OPEN → PENDING_USER → PENDING_PROVIDER → UNDER_REVIEW →
                APPROVED. Only APPROVED cases unlock protected capabilities. The{" "}
                <strong>capability ladder</strong> gates access progressively:
                BROWSE → QUOTE → LOCK_PRICE → EXECUTE_PURCHASE → SETTLE.
              </p>
              <span className="to-tag to-tag-kyc">Fail-Closed Enforcement</span>
            </div>

            <div className="to-step">
              <div className="to-num">04</div>
              <h4>Marketplace &amp; Price Discovery</h4>
              <p>
                The marketplace engine (<code>marketplace-engine.ts</code>) lists
                LBMA Good Delivery-verified gold from validated sellers. Every
                listing requires three evidence types:{" "}
                <strong>Assay Report</strong>, <strong>Chain of Custody</strong>,
                and <strong>Seller Attestation</strong>. The refiner is verified
                against the LBMA Good Delivery List (<code>lbma-service.ts</code>)
                containing 34+ accredited refiners worldwide.
              </p>
              <span className="to-tag to-tag-engine">LBMA Verification · Evidence Gate</span>
            </div>

            <div className="to-step">
              <div className="to-num">05</div>
              <h4>Collateral Lock &amp; Price Lock</h4>
              <p>
                The policy engine (<code>policy-engine.ts</code>) computes a{" "}
                <strong>Transaction Risk Index (TRI)</strong>. Before price lock,
                the buyer{`'`}s firm must post <strong>5% collateral</strong> from their
                CorporateWallet via <code>capital-engine.ts</code>. Multi-oracle
                medianized pricing (Bloomberg B-PIPE, Refinitiv, OANDA) with a
                <strong> 15 bps circuit breaker</strong> that triggers FREEZE on divergence.
                LOCK_PRICE transitions to PENDING_COLLATERAL then PENDING_CHECKER_APPROVAL.
                This fractional collateral requirement replaces legacy 100%
                pre-funding models, drastically unlocking capital efficiency and
                Return on Equity (ROE) for participating trading desks without
                compromising the escrow&apos;s integrity.
              </p>
              <span className="to-tag to-tag-engine">Collateral Lock · Multi-Oracle · Circuit Breaker</span>
            </div>

            <div className="to-step">
              <div className="to-num">06</div>
              <h4>Maker-Checker Approval &amp; DvP Execution</h4>
              <p>
                The TRADER (Maker) submits the order. The TREASURY (Checker)
                reviews via the maker-checker workflow and clicks {`"`}Approve &amp; Execute
                DvP{`"`}, triggering a JIT <strong>WebAuthn/Passkey</strong> signature
                (<code>navigator.credentials.get()</code>) cryptographically bound
                to the canonicalized SHA-256 payload. The{" "}
                <strong>DocuSign CLM</strong> generates the Master Bill of Sale
                natively. Dual-rail router selects between{" "}
                <strong>Modern Treasury</strong> and <strong>Moov</strong> with
                automatic fallback. Each payout carries a deterministic{" "}
                <strong>SHA-256 idempotency key</strong>. Approval stored in{" "}
                <code>order_approvals</code> table.
              </p>
              <span className="to-tag to-tag-settle">Maker-Checker · WebAuthn · DocuSign CLM</span>
            </div>

            <div className="to-step">
              <div className="to-num">07</div>
              <h4>Sovereign Armored Logistics</h4>
              <p>
                All standard mail and USPS shipping has been removed. Gold is
                transported exclusively via sovereign-grade armored carriers:{" "}
                <strong>Malca-Amit</strong> (primary) and{" "}
                <strong>Brink&apos;s</strong> (secondary/failover).
                Full vault-to-vault chain-of-custody tracking.
                Carrier assignment is deterministic based on notional value,
                corridor, and availability.
              </p>
              <span className="to-tag to-tag-ship">Malca-Amit · Brink&apos;s Armored</span>
            </div>

            <div className="to-step">
              <div className="to-num">08</div>
              <h4>Delivery Confirmation &amp; Certificate</h4>
              <p>
                Upon confirmed delivery, the certificate engine
                (<code>certificate-engine.ts</code>) issues a{" "}
                <strong>Gold Clearing Certificate</strong> (format:
                AS-GC-YYYYMMDD-&lt;8HEX&gt;-&lt;SEQ&gt;). The certificate payload is
                canonically serialized and signed with{" "}
                <strong>SHA-256</strong> (with AWS KMS ECDSA signing in production).
                Certificates are idempotent — one per settlement — and include full
                economic context: buyer/seller LEIs, asset details, fee breakdown,
                and settlement rail used.
              </p>
              <span className="to-tag to-tag-settle">SHA-256 Signed · KMS ECDSA</span>
            </div>
          </div>

          <h3>Trade State Machine</h3>
          <p>
            Every order transitions through a strict state machine defined in{" "}
            <code>state-machine.ts</code>. Only authorized roles can trigger each
            transition, and illegal transitions throw forensic{" "}
            <code>IllegalStateTransitionError</code> events with full actor/entity
            context.
          </p>

          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Allowed Transitions</th>
                  <th>Authorized Roles</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>DRAFT</code></td>
                  <td>→ PENDING_COLLATERAL, CANCELLED</td>
                  <td>TRADER (Maker)</td>
                </tr>
                <tr>
                  <td><code>PENDING_COLLATERAL</code></td>
                  <td>→ PENDING_CHECKER_APPROVAL, CANCELLED</td>
                  <td>system</td>
                </tr>
                <tr>
                  <td><code>PENDING_CHECKER_APPROVAL</code></td>
                  <td>→ APPROVED_UNSETTLED, REJECTED_COMPLIANCE, CANCELLED</td>
                  <td>TREASURY (Checker)</td>
                </tr>
                <tr>
                  <td><code>APPROVED_UNSETTLED</code></td>
                  <td>→ SETTLEMENT_PENDING</td>
                  <td>system</td>
                </tr>
                <tr>
                  <td><code>SETTLEMENT_PENDING</code></td>
                  <td>→ SETTLED, SLASH_COLLATERAL, FAILED</td>
                  <td>system, TREASURY</td>
                </tr>
                <tr>
                  <td><code>SETTLED</code></td>
                  <td>— (terminal)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><code>SLASH_COLLATERAL</code></td>
                  <td>— (terminal, T+1 wire failure)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><code>REJECTED_COMPLIANCE</code></td>
                  <td>— (terminal)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><code>CANCELLED</code></td>
                  <td>— (terminal)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><code>FAILED</code></td>
                  <td>— (terminal)</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="to-divider" />

        {/* ═══════════════ SECTION 3 — SECURITY ARCHITECTURE ═══════════════ */}
        <section className="to-section">
          <h2>3. Fortified Security Architecture &amp; Compliance Mapping</h2>

          <p>
            AurumShield implements a <strong>defense-in-depth</strong> security
            architecture where every layer — from network topology to application
            logic — enforces the principle of least privilege. The platform operates
            under a <strong>fail-closed</strong> security model: any ambiguity in
            authorization state results in denial, never approval.
          </p>

          <div className="to-g2">
            <div className="to-card">
              <h3>🔐 Role-Based Access Control</h3>
              <p>
                Implemented in <code>authz.ts</code>, the authorization system
                defines a <strong>maker-checker RBAC model</strong> with strict
                role separation:
              </p>
              <p>
                <strong>TRADER (Maker):</strong> Can initiate orders and lock prices.
                <br />
                <strong>TREASURY (Checker/Approver):</strong> Reviews, approves, and
                executes DvP via JIT WebAuthn signature.
              </p>
              <p>
                <strong>Capability Ladder:</strong>{" "}
                BROWSE → QUOTE → LOCK_PRICE → EXECUTE_PURCHASE → SETTLE
              </p>
              <p>
                Protected capabilities (LOCK_PRICE+){" "}
                <strong>
                  require a database-verified APPROVED compliance case, valid LEI,
                  and correct organizational role
                </strong>
                . If roles or LEIs are missing, access is denied by default.
                Authentication enforced via <strong>Hardware Key/WebAuthn</strong>{" "}
                and <strong>Enterprise SSO (SAML/OIDC)</strong>. SMS OTP removed.
              </p>
            </div>

            <div className="to-card">
              <h3>🛡️ JIT Biometric Execution Binding</h3>
              <p>
                When the TREASURY (Checker) clicks {`"`}Approve &amp; Execute DvP{`"`},
                a native <strong>WebAuthn/Passkey</strong> signature prompt
                (<code>navigator.credentials.get()</code>) is triggered.
                This signature is cryptographically bound to the canonicalized
                SHA-256 payload of the settlement document and stored in the{" "}
                <code>order_approvals</code> table with checker_user_id, signature_hash,
                and timestamp.
              </p>
            </div>

            <div className="to-card">
              <h3>📋 Forensic Audit Logging</h3>
              <p>
                The audit logger (<code>audit-logger.ts</code>) produces{" "}
                <strong>append-only, structured JSON events</strong> written to
                stdout for CloudWatch/Datadog capture. Each event carries a{" "}
                <strong>deterministic SHA-256 event ID</strong> computed from
                timestamp + event name + payload — ensuring the same event cannot be
                emitted twice and providing tamper-evident verification. Policy
                snapshots are SHA-256 hashed at order creation — any later tampering
                is detectable.
              </p>
            </div>

            <div className="to-card">
              <h3>🔑 Encryption Protocols</h3>
              <p>
                <strong>At Rest:</strong> RDS PostgreSQL 15 with{" "}
                <code>storage_encrypted = true</code> (AES-256 via AWS KMS).
                Database credentials auto-managed by RDS and stored in AWS Secrets
                Manager — never in Terraform state or environment variables. S3
                document storage uses server-side encryption.
              </p>
              <p>
                <strong>In Transit:</strong> All external traffic terminates at AWS
                ALB with ACM-provisioned TLS certificates. Webhook payloads from
                Modern Treasury are verified using{" "}
                <strong>HMAC-SHA256 with timing-safe comparison</strong> (
                <code>webhook-verify.ts</code>) to prevent timing attacks. Clearing
                certificates signed with <strong>AWS KMS ECDSA</strong> for
                non-repudiation.
              </p>
            </div>

            <div className="to-card">
              <h3>🌐 Network Security</h3>
              <p>
                The infrastructure implements{" "}
                <strong>three-tier Security Group isolation</strong> defined in
                Terraform:
              </p>
              <p>
                <strong>ALB SG:</strong> 80/443 inbound from 0.0.0.0/0 (public
                internet)
                <br />
                <strong>App SG:</strong> Port 3000 inbound{" "}
                <em>from ALB SG only</em>
                <br />
                <strong>DB SG:</strong> Port 5432 inbound{" "}
                <em>from App SG only</em>
              </p>
              <p>
                ECS tasks run in <strong>private subnets with no public IP</strong>.
                Outbound routes through NAT Gateway. Database is{" "}
                <strong>not publicly accessible</strong>. This ensures{" "}
                <strong>zero direct public access</strong> to containers or
                database.
              </p>
            </div>

            <div className="to-card">
              <h3>⚡ Capital Controls &amp; Breach Monitoring</h3>
              <p>
                The capital controls engine evaluates real-time capital snapshots,
                pre-funded <strong>5% collateral locks</strong> from CorporateWallets,
                and enforces <strong>5 escalating control modes</strong>:
              </p>
              <p>
                <strong>
                  NORMAL → THROTTLE_RESERVATIONS → FREEZE_CONVERSIONS →
                  FREEZE_MARKETPLACE → EMERGENCY_HALT
                </strong>
              </p>
              <p>
                Failed T+1 wires transition to <strong>SLASH_COLLATERAL</strong>,
                penalizing the defaulting organization. The multi-oracle
                circuit breaker triggers FREEZE if pricing feed divergence
                exceeds 15 bps. All financial values stored as BIGINT (cents/basis points)
                — no floating-point math.
              </p>
            </div>
          </div>

          <h3>Compliance Framework Cross-Reference</h3>
          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Requirement</th>
                  <th>Implementation</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={3}><strong>KYC / AML</strong></td>
                  <td>Identity Verification</td>
                  <td>Persona: government ID, biometric liveness, multi-step workflow</td>
                  <td><code>kyc-adapters.ts</code></td>
                </tr>
                <tr>
                  <td>Sanctions Screening</td>
                  <td>OpenSanctions: OFAC SDN, EU, UN, UK HMT, DFAT watchlists</td>
                  <td><code>kyc-adapters.ts</code></td>
                </tr>
                <tr>
                  <td>UBO Declaration</td>
                  <td>Company/individual bifurcation, source of funds analysis</td>
                  <td><code>verification-engine.ts</code></td>
                </tr>
                <tr>
                  <td rowSpan={3}><strong>SOC 2</strong></td>
                  <td>Audit Trail</td>
                  <td>Append-only SHA-256 hashed events, deterministic IDs, SIEM-ready JSON</td>
                  <td><code>audit-logger.ts</code></td>
                </tr>
                <tr>
                  <td>Access Control</td>
                  <td>5-level RBAC, 6 roles, fail-closed enforcement, step-up re-verification</td>
                  <td><code>authz.ts</code></td>
                </tr>
                <tr>
                  <td>Change Management</td>
                  <td>Formalized state machines, illegal transition forensic logging</td>
                  <td><code>state-machine.ts</code></td>
                </tr>
                <tr>
                  <td rowSpan={3}><strong>PCI-DSS</strong></td>
                  <td>Payment Routing</td>
                  <td>Dual-rail via PCI-compliant processors (Modern Treasury, Moov) — no raw card data</td>
                  <td><code>settlement-rail.ts</code></td>
                </tr>
                <tr>
                  <td>Idempotent Txns</td>
                  <td>SHA-256 idempotency keys, ON CONFLICT dedup, transfer status polling</td>
                  <td><code>settlement-rail.ts</code></td>
                </tr>
                <tr>
                  <td>Webhook Integrity</td>
                  <td>HMAC-SHA256 + timing-safe comparison for all inbound webhooks</td>
                  <td><code>webhook-verify.ts</code></td>
                </tr>
                <tr>
                  <td rowSpan={2}><strong>GDPR / CCPA</strong></td>
                  <td>Data Minimization</td>
                  <td>PII managed by Clerk; app stores only opaque user IDs, not raw PII</td>
                  <td><code>middleware.ts</code></td>
                </tr>
                <tr>
                  <td>At-Rest Protection</td>
                  <td>RDS AES-256, Secrets Manager for credentials, S3 server-side encryption</td>
                  <td><code>rds.tf</code></td>
                </tr>
                <tr>
                  <td rowSpan={2}><strong>LBMA</strong></td>
                  <td>Refiner Verification</td>
                  <td>Deterministic LEI resolution via GLEIF API, unique LEI constraint</td>
                  <td><code>entity-validation.ts</code></td>
                </tr>
                <tr>
                  <td>Evidence Gate</td>
                  <td>3 mandatory evidence types per listing: Assay, Chain of Custody, Attestation (DocuSign CLM)</td>
                  <td><code>marketplace-engine.ts</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="to-divider" />

        {/* ═══════════════ SECTION 4 — TECHNICAL STACK ═══════════════ */}
        <section className="to-section">
          <h2>4. Technical Stack &amp; Infrastructure</h2>

          <div className="to-g2">
            <div className="to-card">
              <h3>Frontend</h3>
              <div className="to-table-wrap">
                <table className="to-table">
                  <tbody>
                    <tr><td><strong>Framework</strong></td><td>Next.js 16.1.6 (App Router)</td></tr>
                    <tr><td><strong>Runtime</strong></td><td>React 19.2.3 with Server Components</td></tr>
                    <tr><td><strong>Styling</strong></td><td>Tailwind CSS v4, custom design tokens</td></tr>
                    <tr><td><strong>UI Primitives</strong></td><td>Radix UI (Dialog, Dropdown, Tooltip, Popover, Switch)</td></tr>
                    <tr><td><strong>Forms</strong></td><td>React Hook Form + Zod v4 schema validation</td></tr>
                    <tr><td><strong>Data Fetching</strong></td><td>TanStack React Query v5</td></tr>
                    <tr><td><strong>Animation</strong></td><td>Framer Motion v12</td></tr>
                    <tr><td><strong>Typography</strong></td><td>IBM Plex Sans + Source Serif 4</td></tr>
                    <tr><td><strong>Auth UI</strong></td><td>WebAuthn/Hardware Keys + Enterprise SSO (Okta/Entra)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="to-card">
              <h3>Backend &amp; Data</h3>
              <div className="to-table-wrap">
                <table className="to-table">
                  <tbody>
                    <tr><td><strong>Server Logic</strong></td><td>Next.js Server Actions + API Routes</td></tr>
                    <tr><td><strong>Database</strong></td><td>PostgreSQL 15 (RDS, gp3, encrypted)</td></tr>
                    <tr><td><strong>DB Client</strong></td><td>node-postgres (pg v8), raw SQL migrations</td></tr>
                    <tr><td><strong>Schema</strong></td><td>10 sequential migrations (buyer_journey → risk_parameters)</td></tr>
                    <tr><td><strong>Auth</strong></td><td>WebAuthn/Hardware Keys + Enterprise SSO (SAML/OIDC)</td></tr>
                    <tr><td><strong>KYB</strong></td><td>Persona KYB + GLEIF LEI (deterministic entity resolution)</td></tr>
                    <tr><td><strong>AML</strong></td><td>OpenSanctions (OFAC, EU, UN, UK, AU)</td></tr>
                    <tr><td><strong>Device Trust</strong></td><td>Fingerprint.com Pro (bot detection, velocity)</td></tr>
                    <tr><td><strong>Docs</strong></td><td>AWS Textract (OCR verification)</td></tr>
                    <tr><td><strong>Email</strong></td><td>Resend (transactional email)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="to-card">
              <h3>Settlement &amp; Payments</h3>
              <div className="to-table-wrap">
                <table className="to-table">
                  <tbody>
                    <tr><td><strong>Primary Rail</strong></td><td>Modern Treasury v3 (Fedwire / RTGS)</td></tr>
                    <tr><td><strong>Secondary Rail</strong></td><td>Moov (wallet-to-wallet, OAuth2)</td></tr>
                    <tr><td><strong>Rail Selection</strong></td><td>Auto: Moov default, MT for ≥$250K</td></tr>
                    <tr><td><strong>Fallback</strong></td><td>Automatic with finality check</td></tr>
                    <tr><td><strong>Idempotency</strong></td><td>SHA-256: settlement_id|payee_id|amount|action</td></tr>
                    <tr><td><strong>Clearing</strong></td><td>Double-entry balanced debit/credit journals</td></tr>
                    <tr><td><strong>Certificates</strong></td><td>SHA-256 + optional KMS ECDSA signing</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="to-card">
              <h3>Logistics</h3>
              <div className="to-table-wrap">
                <table className="to-table">
                  <tbody>
                    <tr><td><strong>Primary</strong></td><td>Malca-Amit armored transport (vault-to-vault)</td></tr>
                    <tr><td><strong>Secondary</strong></td><td>Brink&apos;s armored transport (global failover)</td></tr>
                    <tr><td><strong>Routing</strong></td><td>Deterministic: notional value + corridor + availability</td></tr>
                    <tr><td><strong>Origin</strong></td><td>AurumShield Vault, 1 Federal Reserve Plz, NY</td></tr>
                    <tr><td><strong>Tracking</strong></td><td>Real-time events → settlement lifecycle</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h3>Infrastructure Architecture (AWS)</h3>
          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Service</th>
                  <th>Configuration</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Compute</strong></td><td>ECS Fargate</td><td>2 tasks (512 CPU / 1024 MB), private subnets, rolling deploys</td></tr>
                <tr><td><strong>Registry</strong></td><td>ECR</td><td>Multi-stage Docker (Node 20 Alpine), non-root user</td></tr>
                <tr><td><strong>Load Balancer</strong></td><td>ALB</td><td>HTTPS with ACM TLS, HTTP→HTTPS redirect</td></tr>
                <tr><td><strong>Database</strong></td><td>RDS PostgreSQL 15</td><td>db.t3.micro, gp3 encrypted, private, 7-day backups</td></tr>
                <tr><td><strong>Secrets</strong></td><td>Secrets Manager</td><td>RDS auto-managed password — never in tfstate</td></tr>
                <tr><td><strong>Storage</strong></td><td>S3</td><td>Document storage with server-side encryption</td></tr>
                <tr><td><strong>Networking</strong></td><td>VPC 10.0.0.0/16</td><td>2 AZs, 2 public + 2 private subnets, NAT Gateway</td></tr>
                <tr><td><strong>Monitoring</strong></td><td>CloudWatch</td><td>Structured JSON audit ingestion</td></tr>
                <tr><td><strong>DNS</strong></td><td>Route 53</td><td>Hosted zone with ALB alias</td></tr>
                <tr><td><strong>CI/CD</strong></td><td>GitHub Actions</td><td>Build → ECR push → ECS blue-green deploy</td></tr>
              </tbody>
            </table>
          </div>

          <h3>API &amp; Webhook Security</h3>
          <div className="to-callout">
            <span className="to-callout-title">Webhook Verification</span>
            All API routes are protected by Clerk middleware. Webhook endpoints (
            <code>/api/webhooks/*</code>) are exempted from session auth but
            enforce{" "}
            <strong>payload-level cryptographic verification</strong>:
            <br /><br />
            <strong>Modern Treasury:</strong> HMAC-SHA256 in{" "}
            <code>X-Signature</code> header, timing-safe comparison via{" "}
            <code>timingSafeEqual()</code>.
            <br />
            <strong>Persona:</strong> Idempotent processing via{" "}
            <code>webhookId</code> tracking — duplicates safely ignored.
            <br />
            <strong>Clerk:</strong> Svix-signed payloads verified by the
            Clerk SDK&apos;s built-in webhook verification.
          </div>
        </section>

        <div className="to-divider" />

        {/* Footer */}
        <footer className="to-footer">
          <p>AurumShield — Sovereign Financial Infrastructure for Institutional Gold Trading</p>
          <p>Document generated from codebase analysis — February 2026. Confidential.</p>
        </footer>
      </div>
    </div>
  );
}
