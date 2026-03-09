"use client";

/* ================================================================
   INSTITUTIONAL VOLUME SCALING TABLE
   ================================================================
   Bloomberg-terminal-style data table proving cost compression
   of 400-oz bar standardization at institutional scale.
   All numeric data in JetBrains Mono for tabular alignment.
   ================================================================ */

const TIERS = [
  {
    capital: "$100,000",
    format: "1 oz Coins / 10 oz Bars",
    physicalPremium: "4.50%",
    executionFee: "1.50%",
    totalFriction: "6.00%",
    highlight: false,
  },
  {
    capital: "$1,000,000",
    format: "1 kg Bars (LBMA)",
    physicalPremium: "1.80%",
    executionFee: "0.75%",
    totalFriction: "2.55%",
    highlight: false,
  },
  {
    capital: "$10,000,000",
    format: "400 oz Good Delivery",
    physicalPremium: "0.20%",
    executionFee: "0.10%",
    totalFriction: "0.30%",
    highlight: false,
  },
  {
    capital: "$100,000,000",
    format: "400 oz Good Delivery",
    physicalPremium: "0.05%",
    executionFee: "0.05%",
    totalFriction: "0.10%",
    highlight: true,
  },
] as const;

const COLUMNS = [
  { key: "capital", label: "Capital Tier" },
  { key: "format", label: "Format Utilized" },
  { key: "physicalPremium", label: "Physical Premium" },
  { key: "executionFee", label: "Execution Fee" },
  { key: "totalFriction", label: "Total Friction" },
] as const;

export function InstitutionalVolumeScalingTable() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <div className="mb-14 max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px w-8" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#D4AF37" }}
            >
              FRICTION COST DECAY
            </p>
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-white leading-tight"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Extreme Cost Compression{" "}
            <span className="text-slate-400">at Institutional Scale.</span>
          </h2>
        </div>

        {/* ── Data Table ── */}
        <div className="border border-slate-800 rounded-md overflow-hidden" style={{ backgroundColor: "#070B12" }}>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="border-b-2 border-slate-700" style={{ backgroundColor: "#0A0E17" }}>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, i) => (
                  <tr
                    key={tier.capital}
                    className={`border-b border-slate-800/70 transition-colors duration-150 ${
                      tier.highlight
                        ? "border-l-2"
                        : i % 2 === 0
                          ? ""
                          : ""
                    }`}
                    style={{
                      backgroundColor: tier.highlight
                        ? "rgba(113, 63, 18, 0.10)"
                        : i % 2 === 0
                          ? "#0A0E17"
                          : "#0F1420",
                      borderLeftColor: tier.highlight ? "#D4AF37" : "transparent",
                      borderLeftWidth: tier.highlight ? 2 : 0,
                    }}
                  >
                    {/* Capital Tier */}
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${tier.highlight ? "text-white" : "text-slate-200"}`}>
                        {tier.capital}
                      </span>
                    </td>

                    {/* Format */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{tier.format}</span>
                    </td>

                    {/* Physical Premium */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{tier.physicalPremium}</span>
                    </td>

                    {/* Execution Fee */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{tier.executionFee}</span>
                    </td>

                    {/* Total Friction */}
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-bold ${
                          tier.highlight ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {tier.totalFriction}
                      </span>
                      {tier.highlight && (
                        <span
                          className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
                        >
                          OPTIMAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-slate-800/70">
            {TIERS.map((tier, i) => (
              <div
                key={tier.capital}
                className="px-5 py-5"
                style={{
                  backgroundColor: tier.highlight
                    ? "rgba(113, 63, 18, 0.10)"
                    : i % 2 === 0
                      ? "#0A0E17"
                      : "#0F1420",
                  borderLeftWidth: tier.highlight ? 2 : 0,
                  borderLeftColor: tier.highlight ? "#D4AF37" : "transparent",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-mono text-sm font-bold ${tier.highlight ? "text-white" : "text-slate-200"}`}>
                    {tier.capital}
                  </span>
                  <span className={`font-mono text-sm font-bold ${tier.highlight ? "text-white" : "text-slate-300"}`}>
                    {tier.totalFriction}
                    {tier.highlight && (
                      <span
                        className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
                      >
                        OPTIMAL
                      </span>
                    )}
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-400 mb-1">{tier.format}</p>
                <div className="flex gap-4 font-mono text-[11px] text-slate-500">
                  <span>Premium: {tier.physicalPremium}</span>
                  <span>Fee: {tier.executionFee}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="border-t-2 border-slate-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: "#0A0E17" }}>
            <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
              Pricing as of Q1 2026 &bull; Subject to notional volume &amp; counterparty tier
            </span>
            <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "rgba(212,175,55,0.5)" }}>
              [ WHOLESALE OTC — NOT FOR RETAIL DISTRIBUTION ]
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
