"use client";

/* ================================================================
   BROKER CLIENT NETWORK — Book of Business
   ================================================================
   High-density table of all entities under the broker's umbrella.
   Columns: Entity Name, Jurisdiction, KYB/AML Status,
            IRA Custodian Status, Actions.

   Status styling:
     CLEARED         → emerald (green)
     PENDING LIVENESS → amber
     SANCTIONS BLOCK  → red
   ================================================================ */

/* ── Mock client data ── */
const MOCK_CLIENTS = [
  { id: "ENT-001", name: "Aurelia Sovereign Fund",     jurisdiction: "Cayman Islands",    kybAml: "CLEARED",           iraCustodian: "Equity Trust Co.",      deals: 4  },
  { id: "ENT-002", name: "Meridian Capital Partners",  jurisdiction: "United Kingdom",    kybAml: "CLEARED",           iraCustodian: "N/A",                   deals: 2  },
  { id: "ENT-003", name: "Pacific Bullion Trust",      jurisdiction: "Singapore",         kybAml: "PENDING LIVENESS",  iraCustodian: "GoldStar Trust",        deals: 3  },
  { id: "ENT-004", name: "Nordic Reserve AG",          jurisdiction: "Switzerland",       kybAml: "CLEARED",           iraCustodian: "Kingdom Trust",         deals: 1  },
  { id: "ENT-005", name: "Caspian Trade Finance",      jurisdiction: "UAE (DIFC)",        kybAml: "CLEARED",           iraCustodian: "N/A",                   deals: 1  },
  { id: "ENT-006", name: "Emirates Gold DMCC",         jurisdiction: "UAE (DMCC)",        kybAml: "SANCTIONS BLOCK",   iraCustodian: "N/A",                   deals: 0  },
  { id: "ENT-007", name: "Perth Mint Direct",          jurisdiction: "Australia",         kybAml: "CLEARED",           iraCustodian: "N/A",                   deals: 5  },
  { id: "ENT-008", name: "Shanghai Gold Exchange",     jurisdiction: "China (Mainland)",  kybAml: "PENDING LIVENESS",  iraCustodian: "N/A",                   deals: 1  },
  { id: "ENT-009", name: "Helvetia Heritage SA",       jurisdiction: "Switzerland",       kybAml: "CLEARED",           iraCustodian: "Preferred Trust Co.",   deals: 2  },
  { id: "ENT-010", name: "Banco del Oro SA",           jurisdiction: "Panama",            kybAml: "PENDING LIVENESS",  iraCustodian: "STRATA Trust",          deals: 0  },
  { id: "ENT-011", name: "Rand Refinery Ltd",          jurisdiction: "South Africa",      kybAml: "CLEARED",           iraCustodian: "N/A",                   deals: 3  },
  { id: "ENT-012", name: "Tanaka Kikinzoku Kogyo",     jurisdiction: "Japan",             kybAml: "CLEARED",           iraCustodian: "N/A",                   deals: 2  },
] as const;

/* ── KYB/AML Status styling ── */
const KYB_STYLES: Record<string, { text: string; dot: string; bg: string; border: string }> = {
  CLEARED:           { text: "text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "PENDING LIVENESS": { text: "text-amber-400",   dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  "SANCTIONS BLOCK":  { text: "text-red-400",     dot: "bg-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
};

const DEFAULT_STYLE = { text: "text-slate-500", dot: "bg-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" };

export default function BrokerClientsPage() {
  const cleared = MOCK_CLIENTS.filter((c) => c.kybAml === "CLEARED").length;
  const pending = MOCK_CLIENTS.filter((c) => c.kybAml === "PENDING LIVENESS").length;
  const blocked = MOCK_CLIENTS.filter((c) => c.kybAml === "SANCTIONS BLOCK").length;

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Header Strip ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            Client Network
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            {MOCK_CLIENTS.length} entities &middot;{" "}
            <span className="text-emerald-400">{cleared} cleared</span> &middot;{" "}
            <span className="text-amber-400">{pending} pending</span> &middot;{" "}
            <span className="text-red-400">{blocked} blocked</span>
          </p>
        </div>

        <button className="px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors">
          + Invite Institutional Buyer
        </button>
      </div>

      {/* ── Dense Data Table ── */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm font-mono">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
            <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="text-left px-4 py-2.5 font-medium">Entity Name</th>
              <th className="text-left px-4 py-2.5 font-medium">Jurisdiction</th>
              <th className="text-left px-4 py-2.5 font-medium">KYB / AML Status</th>
              <th className="text-left px-4 py-2.5 font-medium">IRA Custodian</th>
              <th className="text-right px-4 py-2.5 font-medium">Deals</th>
              <th className="text-right px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLIENTS.map((client) => {
              const style = KYB_STYLES[client.kybAml] ?? DEFAULT_STYLE;
              const isBlocked = client.kybAml === "SANCTIONS BLOCK";

              return (
                <tr
                  key={client.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Entity Name */}
                  <td className="px-4 py-2.5 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                      {client.name}
                    </div>
                  </td>

                  {/* Jurisdiction */}
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {client.jurisdiction}
                  </td>

                  {/* KYB/AML Status */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.text} ${style.bg} ${style.border}`}
                    >
                      {client.kybAml === "PENDING LIVENESS" && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                      {client.kybAml}
                    </span>
                  </td>

                  {/* IRA Custodian */}
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {client.iraCustodian === "N/A" ? (
                      <span className="text-slate-600">—</span>
                    ) : (
                      client.iraCustodian
                    )}
                  </td>

                  {/* Deals */}
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                    {client.deals}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    {isBlocked ? (
                      <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider">
                        Restricted
                      </span>
                    ) : (
                      <button className="text-[10px] font-mono text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors">
                        View Entity →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
