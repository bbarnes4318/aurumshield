"use client";

/* ================================================================
   INSTITUTIONAL TRUST MARQUEE
   ================================================================
   Horizontal scrolling logo bar + compliance badges.
   Renders directly below the hero section.
   Logos: Bureau Veritas, Brink's, Loomis, Lloyd's of London
   Badges: SOC 2 Type II, PCI-DSS
   ================================================================ */

const TRUST_LOGOS = [
  { name: "Bureau Veritas", width: 140 },
  { name: "Brink's", width: 100 },
  { name: "Loomis", width: 110 },
  { name: "Lloyd's of London", width: 155 },
] as const;

const COMPLIANCE_BADGES = [
  { label: "SOC 2 TYPE II" },
  { label: "PCI-DSS" },
] as const;

/**
 * Placeholder SVG logo — grayscale rectangle with institution name.
 * Designed to be replaced with actual SVGs when brand assets are available.
 */
function LogoPlaceholder({
  name,
  width,
}: {
  name: string;
  width: number;
}) {
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded border border-slate-700/50 px-5 py-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition duration-300 select-none"
      style={{ minWidth: width }}
    >
      <span className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

function ComplianceBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0 rounded border border-slate-700/50 px-4 py-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition duration-300 select-none">
      {/* Status dot */}
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
      <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-slate-300 uppercase whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export function InstitutionalTrustMarquee() {
  // Doubled content for seamless infinite scroll
  const items = [...TRUST_LOGOS, ...TRUST_LOGOS];

  return (
    <section className="w-full border-y border-slate-800 bg-[#111827] overflow-hidden py-5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-6">
          {/* Compliance badges — static, left-aligned */}
          <div className="hidden md:flex items-center gap-3 shrink-0 border-r border-slate-700/50 pr-6">
            {COMPLIANCE_BADGES.map((badge) => (
              <ComplianceBadge key={badge.label} label={badge.label} />
            ))}
          </div>

          {/* Scrolling logos */}
          <div className="relative flex-1 overflow-hidden">
            {/* Left/right fade masks */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-linear-to-r from-[#111827] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-linear-to-l from-[#111827] to-transparent" />

            <div className="flex items-center gap-8 animate-marquee">
              {items.map((logo, i) => (
                <LogoPlaceholder
                  key={`${logo.name}-${i}`}
                  name={logo.name}
                  width={logo.width}
                />
              ))}
            </div>
          </div>

          {/* Compliance badges — mobile: below on small screens */}
          <div className="flex md:hidden items-center gap-3 shrink-0 border-l border-slate-700/50 pl-6">
            {COMPLIANCE_BADGES.map((badge) => (
              <ComplianceBadge key={badge.label} label={badge.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
