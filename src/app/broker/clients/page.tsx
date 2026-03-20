"use client";

/* ================================================================
   BROKER CLIENT ROSTER — Managed Client Entities
   ================================================================
   Table of all clients (buyers/sellers) onboarded under this
   broker's umbrella, with KYC status and activity tracking.
   ================================================================ */

/* ── Mock client data ── */
const MOCK_CLIENTS = [
  { id: "CLI-001", name: "Aurelia Sovereign Fund",    type: "BUYER",  kyc: "APPROVED", deals: 4, aum: 28_500_000, onboarded: "2026-01-15" },
  { id: "CLI-002", name: "Meridian Capital Partners",  type: "BUYER",  kyc: "APPROVED", deals: 2, aum: 6_400_000,  onboarded: "2026-02-01" },
  { id: "CLI-003", name: "Pacific Bullion Trust",      type: "BUYER",  kyc: "APPROVED", deals: 3, aum: 12_200_000, onboarded: "2026-01-22" },
  { id: "CLI-004", name: "Nordic Reserve AG",          type: "BUYER",  kyc: "PENDING",  deals: 1, aum: 5_306_000,  onboarded: "2026-03-10" },
  { id: "CLI-005", name: "Caspian Trade Finance",      type: "BUYER",  kyc: "APPROVED", deals: 1, aum: 21_224_000, onboarded: "2026-02-28" },
  { id: "CLI-006", name: "Emirates Gold DMCC",         type: "SELLER", kyc: "APPROVED", deals: 3, aum: 0,          onboarded: "2026-01-05" },
  { id: "CLI-007", name: "Perth Mint",                 type: "SELLER", kyc: "APPROVED", deals: 5, aum: 0,          onboarded: "2025-12-15" },
  { id: "CLI-008", name: "Valcambi SA",                type: "SELLER", kyc: "APPROVED", deals: 2, aum: 0,          onboarded: "2026-01-08" },
  { id: "CLI-009", name: "Shanghai Gold Exchange",     type: "BUYER",  kyc: "ELEVATED", deals: 1, aum: 15_918_000, onboarded: "2026-03-01" },
  { id: "CLI-010", name: "Helvetia Heritage SA",       type: "BUYER",  kyc: "APPROVED", deals: 2, aum: 8_800_000,  onboarded: "2026-02-14" },
] as const;

const KYC_STYLES: Record<string, string> = {
  APPROVED: "text-emerald-400",
  PENDING:  "text-yellow-400",
  ELEVATED: "text-blue-400",
  REJECTED: "text-red-400",
};

const TYPE_STYLES: Record<string, string> = {
  BUYER:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  SELLER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const fmtUsd = (v: number) =>
  v === 0 ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function BrokerClientsPage() {
  const buyers = MOCK_CLIENTS.filter((c) => c.type === "BUYER").length;
  const sellers = MOCK_CLIENTS.filter((c) => c.type === "SELLER").length;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            Client Roster
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            {MOCK_CLIENTS.length} entities &middot; {buyers} buyers &middot; {sellers} sellers
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm">
            <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="text-left px-4 py-2 font-medium">ID</th>
              <th className="text-left px-4 py-2 font-medium">Entity Name</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">KYC</th>
              <th className="text-right px-4 py-2 font-medium">Deals</th>
              <th className="text-right px-4 py-2 font-medium">AUM</th>
              <th className="text-left px-4 py-2 font-medium">Onboarded</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLIENTS.map((client) => (
              <tr key={client.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{client.id}</td>
                <td className="px-4 py-2.5 text-sm text-slate-200">{client.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_STYLES[client.type]}`}>
                    {client.type}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${KYC_STYLES[client.kyc] ?? "text-slate-500"}`}>
                    {client.kyc}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">{client.deals}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-300">{fmtUsd(client.aum)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{client.onboarded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
