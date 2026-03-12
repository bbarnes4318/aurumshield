"use client";

/* ================================================================
   SECURITY ARCHITECTURE — Investor-facing security overview page
   Route: /demo/security

   Renders outside the app shell (no sidebar/topbar).
   Uses the wt-* design system identical to /demo/walkthrough.
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { AppLogo } from "@/components/app-logo";

/* ---------- Section metadata for sidebar nav ---------- */
interface Section {
  id: string;
  label: string;
  group: string;
}

const SECTIONS: Section[] = [
  { id: "executive-summary", label: "Executive Summary", group: "Overview" },
  { id: "authentication", label: "1. Authentication & Identity", group: "Application Security" },
  { id: "rbac", label: "2. Role-Based Access Control", group: "Application Security" },
  { id: "network", label: "3. Network Architecture", group: "Infrastructure" },
  { id: "encryption", label: "4. Encryption", group: "Infrastructure" },
  { id: "secrets", label: "5. Secrets Management", group: "Infrastructure" },
  { id: "cicd", label: "6. CI/CD Pipeline", group: "Infrastructure" },
  { id: "banking", label: "7. Payment Security", group: "Financial Controls" },
  { id: "settlement", label: "8. Settlement State Machine", group: "Financial Controls" },
  { id: "ledger", label: "9. Double-Entry Ledger", group: "Financial Controls" },
  { id: "kms", label: "10. Cryptographic Signing", group: "Financial Controls" },
  { id: "webhooks", label: "11. Webhook Security", group: "Data Protection" },
  { id: "compliance", label: "12. Compliance", group: "Data Protection" },
  { id: "checklist", label: "Security Checklist", group: "Summary" },
];

export default function SecurityArchitecturePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState("");

  /* ── Scrollspy ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const sections = el!.querySelectorAll<HTMLElement>("section[id]");
      let current = "";
      sections.forEach((s) => {
        if (el!.scrollTop >= s.offsetTop - 160) {
          current = s.id;
        }
      });
      setActiveId(current);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Group sections for sidebar ── */
  const groups = SECTIONS.reduce<Record<string, Section[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="wt-root">
      {/* ─── Inline Styles (shared wt-* design system) ─── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .wt-root {
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
          --warning: #c6a86b;
          --danger: #d16a5d;
          --info: #5a8ccb;
          --radius: 14px;
          --radius-sm: 10px;
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-ibm-plex-sans, 'IBM Plex Sans', system-ui, sans-serif);
          -webkit-font-smoothing: antialiased;
        }
        .wt-root ::-webkit-scrollbar { width: 8px; height: 8px; }
        .wt-root ::-webkit-scrollbar-track { background: var(--surface-1); }
        .wt-root ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .wt-root ::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }
        .wt-sidebar { width: 280px; flex-shrink: 0; border-right: 1px solid var(--border); background: var(--surface-1); display: flex; flex-direction: column; height: 100%; }
        .wt-sidebar-brand { display: flex; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .wt-sidebar-nav { flex: 1; overflow-y: auto; padding: 1rem; }
        .wt-nav-group { margin-bottom: 1.5rem; }
        .wt-nav-group-label { font-size: 0.6875rem; line-height: 1rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); padding: 0 0.75rem; margin-bottom: 0.4rem; }
        .wt-nav-link { display: block; padding: 0.4rem 0.75rem; font-size: 0.85rem; color: var(--text-muted); border-radius: 6px; text-decoration: none; transition: color 0.15s, background 0.15s, border-left-color 0.15s; border-left: 3px solid transparent; margin-bottom: 2px; }
        .wt-nav-link:hover { color: var(--text); }
        .wt-nav-link.active { background: rgba(198, 168, 107, 0.1); color: var(--gold); border-left-color: var(--gold); }
        .wt-sidebar-footer { padding: 1rem; border-top: 1px solid var(--border); flex-shrink: 0; display: flex; align-items: center; gap: 0.6rem; }
        .wt-sidebar-footer-icon { height: 32px; width: 32px; border-radius: 50%; background: var(--surface-3); display: flex; align-items: center; justify-content: center; color: var(--text-faint); font-size: 0.75rem; }
        .wt-sidebar-footer-text { font-size: 0.75rem; font-weight: 500; color: var(--text); }
        .wt-sidebar-footer-sub { font-size: 0.625rem; color: var(--text-faint); }
        .wt-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .wt-topbar { height: 64px; border-bottom: 1px solid var(--border); background: var(--surface-1); display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; flex-shrink: 0; z-index: 10; }
        .wt-breadcrumb { font-size: 0.875rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; }
        .wt-breadcrumb-active { font-weight: 500; color: var(--gold); }
        .wt-scroll { flex: 1; overflow-y: auto; padding: 2rem; scroll-behavior: smooth; }
        .wt-content { max-width: 56rem; margin: 0 auto; }
        .wt-content > * + * { margin-top: 2rem; }
        .wt-h1 { font-family: var(--font-source-serif, 'Source Serif 4', Georgia, serif); font-size: 1.75rem; font-weight: 700; color: var(--text); margin-bottom: 1rem; }
        .wt-h2 { font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .wt-h3 { font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: 0.5rem; }
        .wt-p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.65; margin-bottom: 0.75rem; }
        .wt-label { font-size: 0.6875rem; line-height: 1rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); }
        .wt-label-gold { color: var(--gold); }
        .wt-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .wt-card-padded { padding: 1.5rem; }
        .wt-card-padded > * + * { margin-top: 1.25rem; }
        .wt-info { background: var(--surface-2); border-left: 4px solid var(--gold); padding: 1rem; border-radius: 0 8px 8px 0; font-size: 0.875rem; color: var(--text-muted); line-height: 1.6; }
        .wt-info strong { color: var(--text); }
        .wt-code { color: var(--gold); background: rgba(198, 168, 107, 0.1); padding: 0.1em 0.3em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; }
        .wt-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .wt-table th { text-transform: uppercase; font-size: 0.6875rem; letter-spacing: 0.08em; color: var(--text-faint); font-weight: 600; text-align: left; padding: 0.75rem 1rem; background: var(--surface-2); border-bottom: 1px solid var(--border); }
        .wt-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .wt-table tr:last-child td { border-bottom: none; }
        .wt-table tbody tr:hover { background: rgba(19, 35, 58, 0.5); }
        .wt-key-point { background: rgba(198, 168, 107, 0.08); border: 1px solid rgba(198, 168, 107, 0.25); padding: 1rem; border-radius: 8px; }
        .wt-talking-point-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.25rem; }
        .wt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media (max-width: 640px) { .wt-grid-2 { grid-template-columns: 1fr; } }
        .wt-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
        @media (max-width: 768px) { .wt-grid-3 { grid-template-columns: 1fr; } }
        .wt-stat-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem; text-align: center; }
        .wt-stat-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 1.5rem; font-weight: 700; color: var(--gold); }
        .wt-stat-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); margin-top: 0.25rem; }
        .wt-check { color: var(--success); font-weight: 600; }
        .wt-pre { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.8rem; color: var(--text-muted); overflow-x: auto; white-space: pre; }
        .wt-timeline { position: relative; padding-left: 1.5rem; border-left: 1px solid var(--border); }
        .wt-timeline > * + * { margin-top: 1.25rem; }
        .wt-timeline-step { position: relative; }
        .wt-timeline-icon { position: absolute; left: calc(-1.5rem - 14px); background: var(--surface-1); border: 1px solid var(--border); padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; }
        .wt-timeline-dot { width: 12px; height: 12px; border-radius: 50%; }
        .wt-timeline-title { font-size: 0.875rem; font-weight: 500; color: var(--text); }
        .wt-timeline-desc { font-size: 0.75rem; color: var(--text-muted); }
        @media (max-width: 768px) { .wt-sidebar { display: none; } }
      `,
        }}
      />

      {/* ─── Sidebar ─── */}
      <aside className="wt-sidebar">
        <div className="wt-sidebar-brand">
          <AppLogo className="h-14 w-auto" variant="dark" />
        </div>
        <nav className="wt-sidebar-nav">
          {Object.entries(groups).map(([group, items]) => (
            <div className="wt-nav-group" key={group}>
              <p className="wt-nav-group-label">{group}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`wt-nav-link${activeId === s.id ? " active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollRef.current
                          ?.querySelector(`#${s.id}`)
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="wt-sidebar-footer">
          <div className="wt-sidebar-footer-icon">🔒</div>
          <div>
            <div className="wt-sidebar-footer-text">Security Report</div>
            <div className="wt-sidebar-footer-sub">v1.0 — March 2026</div>
          </div>
        </div>
      </aside>

      {/* ─── Main Panel ─── */}
      <main className="wt-main">
        <header className="wt-topbar">
          <div className="wt-breadcrumb">
            <span>Documentation</span>
            <span style={{ color: "var(--text-faint)" }}>›</span>
            <span className="wt-breadcrumb-active">Security Architecture</span>
          </div>
          <a
            href="/demo/walkthrough"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.75rem",
              borderRadius: 6,
              background: "var(--gold)",
              color: "var(--bg)",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            Demo Walkthrough ↗
          </a>
        </header>

        <div className="wt-scroll" ref={scrollRef}>
          <div className="wt-content">
            {/* ─── Header ─── */}
            <div>
              <h1 className="wt-h1">
                AurumShield — Security Architecture Report
              </h1>
              <div className="wt-info">
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>Classification:</strong> Confidential — Investor Review
                </p>
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>Infrastructure Region:</strong> AWS <span className="wt-code">us-east-2</span> (Ohio)
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Last Audit:</strong> March 12, 2026
                </p>
              </div>
            </div>

            {/* ─── KPI Cards ─── */}
            <div className="wt-grid-3">
              <div className="wt-stat-card">
                <div className="wt-stat-value">24</div>
                <div className="wt-stat-label">Security Controls</div>
              </div>
              <div className="wt-stat-card">
                <div className="wt-stat-value">25+</div>
                <div className="wt-stat-label">Managed Secrets</div>
              </div>
              <div className="wt-stat-card">
                <div className="wt-stat-value">0</div>
                <div className="wt-stat-label">Plaintext Credentials</div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── Executive Summary ─── */}
            <section id="executive-summary" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">Executive Summary</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  AurumShield is a sovereign-grade physical gold settlement platform built with institutional security controls at every layer of the stack — from TLS termination to cryptographic certificate signing, from three-tier network isolation to immutable double-entry financial ledgers.
                </p>
                <p className="wt-p">
                  The platform handles high-value physical gold transactions where a single settlement can exceed <strong>$500,000</strong>. Every architectural decision reflects this fiduciary obligation: <strong>zero</strong> API keys in source code, <strong>zero</strong> public access to databases or containers, <strong>zero</strong> plaintext credentials in deployment pipelines, and mathematically enforced financial integrity through balanced double-entry clearing journals.
                </p>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 1. Authentication ─── */}
            <section id="authentication" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🔐 1. Authentication & Identity Perimeter</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35%" }}>Control</th>
                      <th>Implementation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Provider</td>
                      <td>Clerk — SOC 2 Type II certified identity platform</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Session Management</td>
                      <td>Server-side session tokens, cryptographically signed JWTs</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>MFA Support</td>
                      <td>TOTP, SMS, and WebAuthn (passkey) via Clerk&apos;s built-in MFA</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>SSO Ready</td>
                      <td>SAML 2.0 and OIDC enterprise SSO via Clerk Organizations</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Domain Isolation</td>
                      <td>Host-based split: <span className="wt-code">aurumshield.vip</span> (marketing) vs <span className="wt-code">app.aurumshield.vip</span> (authenticated)</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Middleware Enforcement</td>
                      <td>Every non-public route calls <span className="wt-code">auth.protect()</span> before rendering</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── 2. RBAC ─── */}
            <section id="rbac" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">👤 2. Role-Based Access Control</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Capabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Admin</td>
                      <td>Full platform administration, settlement authorization, DvP execution</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Buyer / Trader</td>
                      <td>Place orders, view portfolio, initiate settlements</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Seller / Producer</td>
                      <td>List inventory, receive settlements</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Treasury</td>
                      <td>Confirm funds, resolve ambiguous states</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Compliance</td>
                      <td>Clear verification, reverse settlements</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Vault Ops</td>
                      <td>Allocate physical gold from custody</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="wt-key-point" style={{ marginTop: "1rem" }}>
                <div className="wt-talking-point-label">Enforcement</div>
                <p style={{ fontSize: "0.875rem", color: "var(--text)", margin: 0 }}>
                  Every settlement action is checked against the deterministic <span className="wt-code">ACTION_ROLE_MAP</span>. Unauthorized roles receive a structured <span className="wt-code">FORBIDDEN_ROLE</span> error with zero state mutation.
                </p>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 3. Network ─── */}
            <section id="network" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🏗️ 3. Network Architecture — Three-Tier Isolation</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  The entire infrastructure is deployed within a dedicated AWS VPC (<span className="wt-code">10.0.0.0/16</span>) across two Availability Zones with strict network segmentation:
                </p>
                <div className="wt-card" style={{ overflow: "hidden" }}>
                  <table className="wt-table">
                    <thead>
                      <tr>
                        <th>Security Group</th>
                        <th>Inbound Rule</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 500 }}>ALB SG</td>
                        <td>TCP 80/443</td>
                        <td>0.0.0.0/0 (public)</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>App SG</td>
                        <td>TCP 3000</td>
                        <td><strong>ALB SG only</strong></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>DB SG</td>
                        <td>TCP 5432</td>
                        <td><strong>App SG only</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="wt-key-point">
                  <div className="wt-talking-point-label">Zero Public Access</div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text)", margin: 0 }}>
                    Containers and the database are in <strong>private subnets</strong> with no public IP addresses. Outbound connectivity routes through a NAT Gateway.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── 4. Encryption ─── */}
            <section id="encryption" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🔒 4. Encryption — In Transit & At Rest</h2>
              <div className="wt-grid-2">
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">In Transit</h3>
                  <table className="wt-table">
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 500 }}>TLS Policy</td>
                        <td><span className="wt-code">TLS 1.3</span> with 1.2 fallback</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>Certificate</td>
                        <td>ACM wildcard, auto-renewed</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>HTTP→HTTPS</td>
                        <td>301 permanent redirect</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">At Rest</h3>
                  <table className="wt-table">
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 500 }}>Database</td>
                        <td>AES-256 via KMS</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>S3 Storage</td>
                        <td>SSE-S3 encryption</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 500 }}>Secrets</td>
                        <td>AES-256 envelope encryption</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ─── 5. Secrets ─── */}
            <section id="secrets" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🗝️ 5. Secrets Management</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  All <strong>25+ sensitive credentials</strong> are stored in AWS Secrets Manager and injected into ECS containers at runtime. No secrets exist in source code, Terraform state, Docker images, or environment files.
                </p>
                <div className="wt-grid-3">
                  {[
                    { cat: "Authentication", items: "Clerk secret key, webhook signing" },
                    { cat: "Banking", items: "Column API, Modern Treasury, Turnkey MPC" },
                    { cat: "KYC/KYB", items: "Veriff, Persona, OpenSanctions" },
                    { cat: "Escrow", items: "Moov public/secret keys" },
                    { cat: "E-Signature", items: "DocuSign, Dropbox Sign" },
                    { cat: "Cryptography", items: "KMS certificate key ID (RSA-2048)" },
                  ].map((g) => (
                    <div key={g.cat} className="wt-stat-card" style={{ textAlign: "left" }}>
                      <div className="wt-stat-label" style={{ marginBottom: "0.25rem" }}>{g.cat}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{g.items}</div>
                    </div>
                  ))}
                </div>
                <pre className="wt-pre">{`Secrets Manager → ECS Task Definition (ARN refs) → Container env vars at runtime
No wildcard Resource: "*" — every secret is individually enumerated in IAM policy`}</pre>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 6. CI/CD ─── */}
            <section id="cicd" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🚀 6. CI/CD Pipeline — Zero Static AWS Keys</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  The deployment pipeline uses <strong>OpenID Connect (OIDC) federation</strong> between GitHub Actions and AWS IAM. No long-lived AWS access keys exist anywhere.
                </p>
                <div className="wt-timeline">
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--info)" }} />
                    </div>
                    <p className="wt-timeline-title">GitHub Actions requests OIDC JWT</p>
                    <p className="wt-timeline-desc">Short-lived token, scoped to specific repo</p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--gold)" }} />
                    </div>
                    <p className="wt-timeline-title">AWS STS issues temporary credentials</p>
                    <p className="wt-timeline-desc">15-minute TTL, no static keys</p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--success)" }} />
                    </div>
                    <p className="wt-timeline-title">Docker image built, SHA-tagged, pushed to ECR</p>
                    <p className="wt-timeline-desc">Immutable image tags for full auditability</p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--text)" }} />
                    </div>
                    <p className="wt-timeline-title">ECS rolling deployment with health checks</p>
                    <p className="wt-timeline-desc">15-minute stabilization window, auto-rollback</p>
                  </div>
                </div>
                <div className="wt-key-point" style={{ marginTop: "1rem" }}>
                  <div className="wt-talking-point-label">Repo-Scoped Deployment</div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text)", margin: 0 }}>
                    Only <span className="wt-code">bbarnes4318/aurumshield</span> can assume the deployment role. No other repo, user, or service can trigger deployments.
                  </p>
                </div>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 7. Banking ─── */}
            <section id="banking" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🏦 7. Payment & Settlement Security</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th>Rail</th>
                      <th>Provider</th>
                      <th>Function</th>
                      <th>Security Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500, color: "var(--gold)" }}>Fedwire (Primary)</td>
                      <td>Column Bank</td>
                      <td>Direct Fedwire, virtual FBO accounts</td>
                      <td>Bearer token, HMAC-SHA256 webhooks</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500, color: "var(--info)" }}>RTGS (Secondary)</td>
                      <td>Modern Treasury</td>
                      <td>Payment orders, book transfers</td>
                      <td>API key + Org ID</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500, color: "var(--success)" }}>Digital (Bridge)</td>
                      <td>Turnkey</td>
                      <td>MPC wallets for USDC/USDT</td>
                      <td>X-Stamp cryptographic signing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="wt-grid-2" style={{ marginTop: "1rem" }}>
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Per-Settlement Isolation</h3>
                  <p className="wt-p">Each settlement receives a unique virtual FBO account (Column) and dedicated MPC sub-organization (Turnkey). Zero fund commingling.</p>
                </div>
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Idempotency</h3>
                  <p className="wt-p">Every payment enforces idempotency at the DB level (<span className="wt-code">UNIQUE idempotency_key</span>), the API level, and the webhook processing level.</p>
                </div>
              </div>
            </section>

            {/* ─── 8. Settlement ─── */}
            <section id="settlement" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">⚙️ 8. Settlement State Machine — Deterministic Governance</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  The settlement engine is a <strong>pure, deterministic state machine</strong> — 886 lines of immutable functions that never mutate input, always return new state, and enforce every invariant programmatically.
                </p>
                <h3 className="wt-h3">Two-Step Delivery vs. Payment (DvP)</h3>
                <p className="wt-p">Settlement <strong>never</strong> releases funds in a single step:</p>
                <div className="wt-timeline">
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--info)" }} />
                    </div>
                    <p className="wt-timeline-title">AUTHORIZE_SETTLEMENT</p>
                    <p className="wt-timeline-desc">Requires: fundsConfirmedFinal + goldAllocated + verificationCleared</p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--gold)" }} />
                    </div>
                    <p className="wt-timeline-title">EXECUTE_DVP</p>
                    <p className="wt-timeline-desc">Atomic title/payment transfer → PROCESSING_RAIL → SETTLED</p>
                  </div>
                </div>
                <div className="wt-key-point" style={{ marginTop: "1rem" }}>
                  <div className="wt-talking-point-label">Dual Control</div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text)", margin: 0 }}>
                    No single actor can authorize AND execute. Terminal states (<span className="wt-code">SETTLED</span>, <span className="wt-code">FAILED</span>, <span className="wt-code">CANCELLED</span>, <span className="wt-code">REVERSED</span>) are irreversible.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── 9. Ledger ─── */}
            <section id="ledger" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">📒 9. Immutable Double-Entry Clearing Ledger</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  Every fund movement produces a <strong>balanced clearing journal</strong> where total debits must exactly equal total credits. This is enforced at both the application layer and the database layer.
                </p>
                <div className="wt-grid-2">
                  <div>
                    <h3 className="wt-h3">Application Layer</h3>
                    <pre className="wt-pre">{`assertJournalBalanced(journal)
// Throws UnbalancedJournalError
// if debits ≠ credits`}</pre>
                  </div>
                  <div>
                    <h3 className="wt-h3">Database Layer</h3>
                    <pre className="wt-pre">{`fn_assert_journal_balanced(id)
-- RAISE EXCEPTION if unbalanced
-- PostgreSQL trigger-enforced`}</pre>
                  </div>
                </div>
                <div className="wt-key-point" style={{ marginTop: "1rem" }}>
                  <div className="wt-talking-point-label">Immutability</div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text)", margin: 0 }}>
                    Database triggers <strong>prevent any UPDATE or DELETE</strong> on journal entries. Any attempt raises <span className="wt-code">IMMUTABLE_LEDGER_VIOLATION</span>.
                  </p>
                </div>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 10. KMS ─── */}
            <section id="kms" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">✍️ 10. Cryptographic Certificate Signing</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Algorithm</td>
                      <td><span className="wt-code">RSASSA_PKCS1_V1_5_SHA_256</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Key Type</td>
                      <td>RSA_2048</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Key Storage</td>
                      <td>AWS KMS HSM (FIPS 140-2 Level 3)</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Key Exposure</td>
                      <td>Private key <strong>never</strong> leaves the HSM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── 11. Webhooks ─── */}
            <section id="webhooks" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">🔗 11. Webhook Security</h2>
              <div className="wt-grid-2">
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Clerk (Identity Sync)</h3>
                  <p className="wt-p">Svix HMAC-SHA256. Missing headers → 400. Invalid signature → 400. Parameterized SQL only.</p>
                </div>
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Column (Fedwire Settlement)</h3>
                  <p className="wt-p">HMAC-SHA256 with <span className="wt-code">timingSafeEqual()</span> — prevents timing side-channel attacks. Atomic DB transactions.</p>
                </div>
              </div>
            </section>

            {/* ─── 12. Compliance ─── */}
            <section id="compliance" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">📋 12. Compliance Infrastructure</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Function</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Veriff</td>
                      <td>Biometric identity verification (KYB)</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Persona</td>
                      <td>Know Your Customer (KYC) questionnaire</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>DIRO</td>
                      <td>Document verification</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>OpenSanctions</td>
                      <td>AML & sanctions list screening</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Fingerprint.com</td>
                      <td>Device fraud detection (browser fingerprinting)</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>DocuSign / Dropbox Sign</td>
                      <td>Legally binding e-signature</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── Security Checklist ─── */}
            <section id="checklist" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">✅ Security Checklist</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th>Control</th>
                      <th style={{ width: "15%", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      "TLS 1.3 enforced on all endpoints",
                      "HTTP to HTTPS automatic redirect",
                      "Database encryption at rest (AES-256)",
                      "Database in private subnets only",
                      "Zero public access to containers",
                      "Auto-managed database passwords",
                      "All secrets in Secrets Manager (25+)",
                      "No static AWS keys in CI/CD (OIDC)",
                      "HMAC-SHA256 webhook verification",
                      "Timing-safe signature comparison",
                      "Parameterized SQL (zero interpolation)",
                      "Zod schema validation on all inputs",
                      "Integer-only monetary arithmetic (BIGINT cents)",
                      "Immutable double-entry clearing ledger",
                      "Role-based settlement action gating",
                      "Two-step DvP (Authorize → Execute)",
                      "Idempotent payment operations (all 3 rails)",
                      "Per-settlement key isolation (MPC)",
                      "Cryptographic certificate signing (FIPS 140-2 L3)",
                      "Multi-provider KYC/KYB verification",
                      "AML/Sanctions screening",
                      "Device fraud detection",
                      "Append-only audit trail",
                      "7-day automated database backups",
                    ].map((item) => (
                      <tr key={item}>
                        <td>{item}</td>
                        <td style={{ textAlign: "center" }}><span className="wt-check">✅</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── Footer ─── */}
            <div style={{ textAlign: "center", padding: "2rem 0 3rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                AurumShield — Sovereign Financial Infrastructure — Confidential
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
