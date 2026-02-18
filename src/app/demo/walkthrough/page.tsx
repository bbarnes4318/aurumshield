"use client";

/* ================================================================
   DEMO WALKTHROUGH — Pre-demo briefing document
   Route: /demo/walkthrough

   Users read through this structured guide, then click
   "Begin Demo" at the bottom to enter the live demo at
   /demo/login?demo=true.

   Renders outside the app shell (no sidebar/topbar).
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------- Section metadata for sidebar nav ---------- */
interface Section {
  id: string;
  label: string;
  group: string;
}

const SECTIONS: Section[] = [
  { id: "prerequisites", label: "Prerequisites", group: "Preparation" },
  { id: "entering-demo", label: "1. Entering Demo Mode", group: "Preparation" },
  { id: "dashboard", label: "2. Dashboard Overview", group: "Core Modules" },
  {
    id: "marketplace",
    label: "3. Marketplace & Reservation",
    group: "Core Modules",
  },
  {
    id: "settlement",
    label: "4. Settlement Lifecycle",
    group: "Core Modules",
  },
  { id: "capital", label: "5. Capital Adequacy", group: "Core Modules" },
  {
    id: "verification",
    label: "6. Verification & Identity",
    group: "Core Modules",
  },
  { id: "audit", label: "7. Audit & Supervisory", group: "Oversight" },
  { id: "seller", label: "8. Seller Supply Controls", group: "Oversight" },
  {
    id: "presentation",
    label: "9. Presentation Mode",
    group: "Tools & Reference",
  },
  { id: "notes", label: "10. Presenter Notes", group: "Tools & Reference" },
  {
    id: "reference",
    label: "Role Permissions",
    group: "Tools & Reference",
  },
];

export default function DemoWalkthroughPage() {
  const router = useRouter();
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
      {/* ─── Inline Styles ─── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* === Walkthrough Design System === */
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
          --warning: #d0a85c;
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

        /* Scrollbar */
        .wt-root ::-webkit-scrollbar { width: 8px; height: 8px; }
        .wt-root ::-webkit-scrollbar-track { background: var(--surface-1); }
        .wt-root ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .wt-root ::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }

        /* ─── Sidebar ─── */
        .wt-sidebar {
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: var(--surface-1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .wt-sidebar-brand {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 1.5rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .wt-sidebar-brand img { height: 24px; width: auto; }
        .wt-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        .wt-nav-group { margin-bottom: 1.5rem; }
        .wt-nav-group-label {
          font-size: 0.6875rem;
          line-height: 1rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-faint);
          padding: 0 0.75rem;
          margin-bottom: 0.4rem;
        }
        .wt-nav-link {
          display: block;
          padding: 0.4rem 0.75rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          border-radius: 6px;
          text-decoration: none;
          transition: color 0.15s, background 0.15s, border-left-color 0.15s;
          border-left: 3px solid transparent;
          margin-bottom: 2px;
        }
        .wt-nav-link:hover { color: var(--text); }
        .wt-nav-link.active {
          background: rgba(198, 168, 107, 0.1);
          color: var(--gold);
          border-left-color: var(--gold);
        }
        .wt-sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .wt-sidebar-footer-icon {
          height: 32px;
          width: 32px;
          border-radius: 50%;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-faint);
          font-size: 0.75rem;
        }
        .wt-sidebar-footer-text { font-size: 0.75rem; font-weight: 500; color: var(--text); }
        .wt-sidebar-footer-sub { font-size: 0.625rem; color: var(--text-faint); }

        /* ─── Main ─── */
        .wt-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .wt-topbar {
          height: 64px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          flex-shrink: 0;
          z-index: 10;
        }
        .wt-breadcrumb { font-size: 0.875rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; }
        .wt-breadcrumb-active { font-weight: 500; color: var(--gold); }

        .wt-scroll { flex: 1; overflow-y: auto; padding: 2rem; scroll-behavior: smooth; }
        .wt-content { max-width: 56rem; margin: 0 auto; }
        .wt-content > * + * { margin-top: 2rem; }

        /* ─── Typography ─── */
        .wt-h1 { font-family: var(--font-source-serif, 'Source Serif 4', Georgia, serif); font-size: 1.75rem; font-weight: 700; color: var(--text); margin-bottom: 1rem; }
        .wt-h2 { font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .wt-h3 { font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: 0.5rem; }
        .wt-p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.65; margin-bottom: 0.75rem; }
        .wt-label { font-size: 0.6875rem; line-height: 1rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); }
        .wt-label-gold { color: var(--gold); }

        /* ─── Cards ─── */
        .wt-card {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .wt-card-padded { padding: 1.5rem; }
        .wt-card-padded > * + * { margin-top: 1.25rem; }

        /* ─── Info Block ─── */
        .wt-info {
          background: var(--surface-2);
          border-left: 4px solid var(--gold);
          padding: 1rem;
          border-radius: 0 8px 8px 0;
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .wt-info strong { color: var(--text); }

        /* ─── Warning ─── */
        .wt-warning {
          background: rgba(208, 168, 92, 0.08);
          border: 1px solid rgba(208, 168, 92, 0.2);
          padding: 0.75rem;
          border-radius: 8px;
          display: flex;
          gap: 0.6rem;
          font-size: 0.75rem;
          color: var(--warning);
          align-items: flex-start;
        }
        .wt-warning strong { color: inherit; }

        /* ─── Code ─── */
        .wt-pre {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
          color: var(--text-muted);
          overflow-x: auto;
        }
        .wt-code {
          color: var(--gold);
          background: rgba(198, 168, 107, 0.1);
          padding: 0.1em 0.3em;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85em;
        }

        /* ─── Table ─── */
        .wt-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .wt-table th {
          text-transform: uppercase;
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          color: var(--text-faint);
          font-weight: 600;
          text-align: left;
          padding: 0.75rem 1rem;
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
        }
        .wt-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .wt-table tr:last-child td { border-bottom: none; }
        .wt-table tbody tr:hover { background: rgba(19, 35, 58, 0.5); }

        /* ─── Note Block ─── */
        .wt-note {
          background: var(--surface-2);
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--text-faint);
          border: 1px solid var(--border);
        }
        .wt-note strong { color: var(--text); }

        /* ─── Talking Point ─── */
        .wt-talking-point {
          background: var(--surface-2);
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid var(--gold);
        }
        .wt-talking-point-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.25rem; }
        .wt-talking-point p { font-size: 0.875rem; font-style: italic; color: var(--text); margin: 0; }

        /* ─── Key Talking Point ─── */
        .wt-key-point {
          background: rgba(198, 168, 107, 0.08);
          border: 1px solid rgba(198, 168, 107, 0.25);
          padding: 1rem;
          border-radius: 8px;
        }

        /* ─── Timeline ─── */
        .wt-timeline { position: relative; padding-left: 1.5rem; border-left: 1px solid var(--border); }
        .wt-timeline > * + * { margin-top: 1.25rem; }
        .wt-timeline-step { position: relative; }
        .wt-timeline-icon {
          position: absolute;
          left: calc(-1.5rem - 14px);
          background: var(--surface-1);
          border: 1px solid var(--border);
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }
        .wt-timeline-icon.gold { background: var(--gold); border-color: var(--gold); }
        .wt-timeline-dot { width: 12px; height: 12px; border-radius: 50%; }
        .wt-timeline-title { font-size: 0.875rem; font-weight: 500; color: var(--text); }
        .wt-timeline-title.gold { color: var(--gold); }
        .wt-timeline-desc { font-size: 0.75rem; color: var(--text-muted); }

        /* ─── Grid ─── */
        .wt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media (max-width: 640px) { .wt-grid-2 { grid-template-columns: 1fr; } }

        /* ─── Troubleshooting ─── */
        .wt-trouble {
          background: var(--surface-2);
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
        }
        .wt-trouble-icon { color: var(--info); flex-shrink: 0; font-size: 1.1rem; }
        .wt-trouble-title { font-size: 0.875rem; font-weight: 500; color: var(--text); }
        .wt-trouble-desc { font-size: 0.75rem; color: var(--text-muted); }

        /* ─── KYC / KYB ─── */
        .wt-kycb {
          background: var(--surface-2);
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .wt-kycb ul { list-style: none; padding: 0; margin: 0.5rem 0 0; }
        .wt-kycb li { color: var(--text-faint); font-size: 0.75rem; margin-bottom: 0.2rem; }

        /* ─── Evidence Flow ─── */
        .wt-evidence {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: var(--text);
        }
        .wt-evidence-item {
          flex: 1;
          background: var(--surface-2);
          padding: 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border);
          text-align: center;
        }
        .wt-evidence-plus { color: var(--text-faint); font-size: 1.2rem; flex-shrink: 0; }

        /* ─── CTA ─── */
        .wt-cta-section {
          text-align: center;
          padding: 3rem 2rem;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .wt-cta-title {
          font-family: var(--font-source-serif, 'Source Serif 4', Georgia, serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.75rem;
        }
        .wt-cta-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 30rem; margin-left: auto; margin-right: auto; }
        .wt-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2.5rem;
          background: var(--gold);
          color: var(--bg);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .wt-cta-btn:hover { background: var(--gold-hover); transform: translateY(-1px); }
        .wt-cta-btn:active { transform: translateY(0); }
        .wt-cta-footer {
          margin-top: 1.5rem;
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-faint);
        }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
          .wt-sidebar { display: none; }
        }
      `,
        }}
      />

      {/* ─── Sidebar ─── */}
      <aside className="wt-sidebar">
        <div className="wt-sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arum-logo-white.png" alt="AurumShield" />
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
          <div className="wt-sidebar-footer-icon">📖</div>
          <div>
            <div className="wt-sidebar-footer-text">Demo Guide</div>
            <div className="wt-sidebar-footer-sub">v2.4 Internal</div>
          </div>
        </div>
      </aside>

      {/* ─── Main Panel ─── */}
      <main className="wt-main">
        {/* Top Bar */}
        <header className="wt-topbar">
          <div className="wt-breadcrumb">
            <span>Documentation</span>
            <span style={{ color: "var(--text-faint)" }}>›</span>
            <span className="wt-breadcrumb-active">
              Institutional Demo Walkthrough
            </span>
          </div>
          <a
            href="/demo/login?demo=true"
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
            Launch Platform ↗
          </a>
        </header>

        {/* Scrollable Content */}
        <div className="wt-scroll" ref={scrollRef}>
          <div className="wt-content">
            {/* ─── Header ─── */}
            <div>
              <h1 className="wt-h1">
                AurumShield — Institutional Demo Walkthrough
              </h1>
              <div className="wt-info">
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>Audience:</strong> Investor, partner, or executive
                  being presented a guided demonstration.
                </p>
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>Live URL:</strong>{" "}
                  <a
                    href="https://aurumshield.vip"
                    style={{ color: "var(--gold)", textDecoration: "none" }}
                  >
                    https://aurumshield.vip
                  </a>
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Duration:</strong> 20–30 minutes.
                </p>
              </div>
            </div>

            {/* ─── Prerequisites ─── */}
            <section id="prerequisites" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">☑ Prerequisites</h2>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "1.25rem",
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                }}
              >
                <li style={{ marginBottom: "0.4rem" }}>
                  A modern web browser (Chrome, Edge, Safari, Firefox).
                </li>
                <li style={{ marginBottom: "0.4rem" }}>
                  Internet connection to{" "}
                  <span className="wt-code">aurumshield.vip</span>.
                </li>
                <li>
                  No login credentials needed — uses one-click role selection.
                </li>
              </ul>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 1. Entering Demo Mode ─── */}
            <section id="entering-demo" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">1. Entering Demo Mode</h2>
              <div className="wt-card wt-card-padded">
                <div>
                  <h3 className="wt-h3">Step 1.1 — Navigate to demo login</h3>
                  <pre className="wt-pre">
                    <code>
                      https://aurumshield.vip/demo/login?demo=true
                    </code>
                  </pre>
                  <div className="wt-warning">
                    <span>⚠️</span>
                    <p>
                      <strong>Important:</strong> The{" "}
                      <span className="wt-code">?demo=true</span> parameter is
                      required to activate the environment.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="wt-h3">
                    Step 1.2 — Select &quot;Clearing Authority&quot;
                  </h3>
                  <p className="wt-p">
                    Click the card labeled{" "}
                    <strong>&quot;Clearing Authority&quot;</strong>. This role
                    provides full visibility across all modules.
                  </p>
                  <div className="wt-note">
                    <strong>System Action:</strong> Seeds a deterministic
                    scenario (listing, reservation, order, settlement) and
                    redirects to Dashboard.
                  </div>
                </div>
              </div>
            </section>

            {/* ─── 2. Dashboard ─── */}
            <section id="dashboard" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">2. Dashboard Overview</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table">
                  <thead>
                    <tr>
                      <th style={{ width: "33%" }}>Section</th>
                      <th>Talking Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Capital Summary</td>
                      <td style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                        &quot;All capital metrics are derived in real time from
                        actual settlement state — not static mock numbers.&quot;
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Settlement Queue</td>
                      <td style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                        &quot;Every settlement in the pipeline is tracked with
                        deterministic status transitions.&quot;
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Breach Card</td>
                      <td style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                        &quot;Breach events are generated deterministically when
                        capital thresholds are exceeded.&quot;
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── 3. Marketplace ─── */}
            <section id="marketplace" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">3. Marketplace &amp; Reservation Flow</h2>
              <div className="wt-card wt-card-padded">
                <div className="wt-grid-2">
                  <div>
                    <h3 className="wt-h3">Step 3.1 — View</h3>
                    <p className="wt-p">
                      Navigate to <strong>Marketplace</strong>. Show the listing
                      details: Form, Purity, Weight, Vault Location.
                    </p>
                  </div>
                  <div>
                    <h3 className="wt-h3">Step 3.2 — Reserve</h3>
                    <p className="wt-p">
                      Click <strong>Reserve</strong>. Enter weight. Show the
                      pre-trade policy check (TRI Score, ECR Impact).
                    </p>
                  </div>
                </div>

                <div className="wt-talking-point">
                  <div className="wt-talking-point-label">Talking Point</div>
                  <p>
                    &quot;No exposure is created without passing the capital
                    adequacy perimeter. The reservation locks bilateral exposure
                    into the risk management system before any commercial
                    commitment is made.&quot;
                  </p>
                </div>

                <div>
                  <h3 className="wt-h3">Step 3.3 — Convert</h3>
                  <p className="wt-p">
                    Go to <strong>Reservations</strong>. Click{" "}
                    <strong>Convert to Order</strong>. Explain the frozen{" "}
                    <span className="wt-code">MarketplacePolicySnapshot</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── 4. Settlement ─── */}
            <section id="settlement" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">4. Settlement Lifecycle</h2>
              <p className="wt-p">
                Core demonstration. Uses pre-seeded{" "}
                <span className="wt-code">ESCROW_OPEN</span> case.
              </p>

              <div className="wt-card wt-card-padded">
                <h3 className="wt-h3">Step 4.2 — Execution Sequence</h3>

                <div className="wt-timeline">
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--info)" }} />
                    </div>
                    <p className="wt-timeline-title">1. Confirm Funds Final</p>
                    <p className="wt-timeline-desc">
                      Treasury confirms fiat receipt.
                    </p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--gold)" }} />
                    </div>
                    <p className="wt-timeline-title">2. Allocate Gold</p>
                    <p className="wt-timeline-desc">
                      Vault ops confirms physical allocation.
                    </p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--success)" }} />
                    </div>
                    <p className="wt-timeline-title">3. Clear Verification</p>
                    <p className="wt-timeline-desc">
                      Compliance confirms KYC/KYB pass.
                    </p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon">
                      <div className="wt-timeline-dot" style={{ background: "var(--text)" }} />
                    </div>
                    <p className="wt-timeline-title">
                      4. Authorize Settlement
                    </p>
                    <p className="wt-timeline-desc">
                      Clearing Authority reviews &amp; authorizes. Freezes
                      capital snapshot.
                    </p>
                  </div>
                  <div className="wt-timeline-step">
                    <div className="wt-timeline-icon gold">
                      <div className="wt-timeline-dot" style={{ background: "var(--bg)" }} />
                    </div>
                    <p className="wt-timeline-title gold">5. Execute DvP</p>
                    <p className="wt-timeline-desc">
                      Atomic title/payment transfer. Status →{" "}
                      <span className="wt-code">SETTLED</span>.
                    </p>
                  </div>
                </div>

                <div className="wt-key-point">
                  <div className="wt-talking-point-label">
                    Key Talking Point
                  </div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontStyle: "italic",
                      color: "var(--text)",
                      margin: 0,
                    }}
                  >
                    &quot;This is the atomic settlement moment. Title transfer
                    and payment transfer occur simultaneously in a single
                    deterministic operation. There is no window where one party
                    has delivered and the other has not.&quot;
                  </p>
                </div>

                <div>
                  <h3 className="wt-h3">
                    Step 4.4 — Clearing Certificate
                  </h3>
                  <p className="wt-p">
                    Click <strong>View Receipt</strong> on the settled order.
                    Show the certificate number, SHA-256 hash, and ledger
                    integrity statement.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── 5. Capital ─── */}
            <section id="capital" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">5. Capital Adequacy Console</h2>
              <div className="wt-grid-2">
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Intraday Console</h3>
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: "1rem",
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <li style={{ marginBottom: "0.4rem" }}>
                      <strong>ECR:</strong> Gross exposure / Capital base.
                    </li>
                    <li style={{ marginBottom: "0.4rem" }}>
                      <strong>Hardstop Util:</strong> % of absolute limit.
                    </li>
                    <li>
                      <strong>Breach Level:</strong> Computed deterministically.
                    </li>
                  </ul>
                </div>
                <div className="wt-card wt-card-padded">
                  <h3 className="wt-h3">Capital Controls</h3>
                  <div style={{ fontSize: "0.75rem" }}>
                    {[
                      { name: "NORMAL", value: "Allowed", color: "var(--success)" },
                      { name: "THROTTLE", value: "Limited", color: "var(--warning)" },
                      { name: "FREEZE", value: "Blocked", color: "var(--danger)" },
                      { name: "HALT", value: "Suspended", color: "var(--danger)", bold: true },
                    ].map((c, i, arr) => (
                      <div
                        key={c.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.35rem 0",
                          borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                          color: "var(--text)",
                        }}
                      >
                        <span>{c.name}</span>
                        <span style={{ color: c.color, fontWeight: c.bold ? 700 : 400 }}>
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="wt-p" style={{ fontStyle: "italic", marginTop: "1rem" }}>
                &quot;Continuous monitoring replaces periodic reporting. Breaches
                are immediate.&quot;
              </p>
            </section>

            {/* ─── 6. Verification ─── */}
            <section id="verification" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">6. Verification &amp; Identity</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  Demonstrate the multi-step identity perimeter.
                </p>
                <div className="wt-grid-2">
                  <div className="wt-kycb">
                    <p className="wt-label">KYC Steps</p>
                    <ul>
                      <li>1. Email &amp; Phone</li>
                      <li>2. Gov ID Capture</li>
                      <li>3. Liveness Check</li>
                      <li>4. Sanctions Screening</li>
                    </ul>
                  </div>
                  <div className="wt-kycb">
                    <p className="wt-label">KYB Steps</p>
                    <ul>
                      <li>1. Company Reg Docs</li>
                      <li>2. UBO Declaration</li>
                      <li>3. Proof of Address</li>
                      <li>4. Source of Funds</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── 7. Audit ─── */}
            <section id="audit" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">7. Audit &amp; Supervisory</h2>
              <div className="wt-card wt-card-padded">
                <h3 className="wt-h3">Supervisory Mode</h3>
                <p className="wt-p">
                  Show the &quot;Case Dossier&quot; view.
                </p>
                <ul
                  style={{
                    listStyle: "disc",
                    paddingLeft: "1.25rem",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <li style={{ marginBottom: "0.25rem" }}>
                    Full settlement details
                  </li>
                  <li style={{ marginBottom: "0.25rem" }}>
                    Complete ledger history (immutable)
                  </li>
                  <li>Capital snapshot frozen at authorization</li>
                </ul>
                <div
                  style={{
                    marginTop: "1rem",
                    background: "var(--surface-2)",
                    padding: "0.75rem",
                    borderRadius: 8,
                    borderLeft: "4px solid var(--info)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontStyle: "italic",
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    &quot;The supervisory console is the regulator-ready evidence
                    package.&quot;
                  </p>
                </div>
              </div>
            </section>

            {/* ─── 8. Seller ─── */}
            <section id="seller" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">8. Seller Supply Controls</h2>
              <div className="wt-card wt-card-padded">
                <p className="wt-p">
                  Switch to <strong>Seller</strong> role to show the listing
                  wizard.
                </p>
                <div className="wt-evidence">
                  <div className="wt-evidence-item">Assay Report</div>
                  <span className="wt-evidence-plus">+</span>
                  <div className="wt-evidence-item">Chain of Custody</div>
                  <span className="wt-evidence-plus">+</span>
                  <div className="wt-evidence-item">Attestation</div>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-faint)",
                    textAlign: "center",
                    marginTop: "0.5rem",
                  }}
                >
                  Three-part evidence pack required for the Publish Gate.
                </p>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

            {/* ─── 9 & 10. Tools ─── */}
            <section id="presentation" style={{ scrollMarginTop: "6rem" }}>
              <div className="wt-grid-2">
                <div>
                  <h2 className="wt-h2">9. Presentation Mode</h2>
                  <p className="wt-p">
                    Press{" "}
                    <kbd
                      style={{
                        background: "var(--surface-3)",
                        padding: "0.15em 0.5em",
                        borderRadius: 4,
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                        color: "var(--text)",
                      }}
                    >
                      SHIFT + D
                    </kbd>{" "}
                    to toggle.
                  </p>
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: "1rem",
                      fontSize: "0.75rem",
                      color: "var(--text-faint)",
                    }}
                  >
                    <li style={{ marginBottom: "0.2rem" }}>
                      Hides sidebar &amp; breadcrumbs
                    </li>
                    <li style={{ marginBottom: "0.2rem" }}>
                      Increases font size (108%)
                    </li>
                    <li>Optimizes layout for projectors</li>
                  </ul>
                </div>
                <div id="notes" style={{ scrollMarginTop: "6rem" }}>
                  <h2 className="wt-h2">10. Presenter Notes</h2>
                  <p className="wt-p">
                    Click the <strong>Notes</strong> button (bottom-right).
                  </p>
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: "1rem",
                      fontSize: "0.75rem",
                      color: "var(--text-faint)",
                    }}
                  >
                    <li style={{ marginBottom: "0.2rem" }}>
                      Structured talking points per section
                    </li>
                    <li style={{ marginBottom: "0.2rem" }}>
                      Key takeaways highlighted
                    </li>
                    <li>Hidden during Presentation Mode</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ─── Role Permissions ─── */}
            <section id="reference" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2">Role Permissions Reference</h2>
              <div className="wt-card" style={{ overflow: "hidden" }}>
                <table className="wt-table" style={{ fontSize: "0.75rem" }}>
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th style={{ textAlign: "center" }}>Clearing Auth</th>
                      <th style={{ textAlign: "center" }}>Buyer</th>
                      <th style={{ textAlign: "center" }}>Seller</th>
                      <th style={{ textAlign: "center" }}>Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Dashboard</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                    </tr>
                    <tr>
                      <td>Settlements</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅ Full</td>
                      <td style={{ textAlign: "center", color: "var(--text-faint)" }}>View</td>
                      <td style={{ textAlign: "center", color: "var(--text-faint)" }}>View</td>
                      <td style={{ textAlign: "center", color: "var(--text-faint)" }}>View</td>
                    </tr>
                    <tr>
                      <td>Execute DvP</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>❌</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>❌</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>❌</td>
                    </tr>
                    <tr>
                      <td>Intraday Capital</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>❌</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>❌</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── Troubleshooting ─── */}
            <section id="troubleshooting" style={{ scrollMarginTop: "6rem" }}>
              <h2 className="wt-h2" style={{ fontSize: "1.1rem" }}>
                Troubleshooting
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="wt-trouble">
                  <span className="wt-trouble-icon">ℹ️</span>
                  <div>
                    <p className="wt-trouble-title">
                      Settlement actions not available?
                    </p>
                    <p className="wt-trouble-desc">
                      Ensure you are logged in as{" "}
                      <strong>Clearing Authority</strong> (Admin). Only admins
                      can authorize and execute DvP.
                    </p>
                  </div>
                </div>
                <div className="wt-trouble">
                  <span className="wt-trouble-icon">ℹ️</span>
                  <div>
                    <p className="wt-trouble-title">Certificate missing?</p>
                    <p className="wt-trouble-desc">
                      The settlement must reach{" "}
                      <span className="wt-code">SETTLED</span> status first.
                      Complete all 5 lifecycle actions.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════
                ─── BEGIN DEMO CTA — Final section ───
                ═══════════════════════════════════════════════ */}
            <section
              id="begin-demo"
              style={{ scrollMarginTop: "6rem", marginTop: "3rem" }}
            >
              <div className="wt-cta-section">
                <h2 className="wt-cta-title">Ready to Begin?</h2>
                <p className="wt-cta-desc">
                  You&apos;ve reviewed the complete walkthrough. Launch the live
                  AurumShield demonstration environment to explore sovereign
                  clearing infrastructure in action.
                </p>
                <button
                  className="wt-cta-btn"
                  id="begin-demo-btn"
                  onClick={() => router.push("/demo/login?demo=true")}
                >
                  Begin Demo →
                </button>
                <p className="wt-cta-footer">
                  Demonstration Environment — Not for Production Use
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
