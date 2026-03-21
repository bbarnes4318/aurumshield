"use client";

/* ================================================================
   CAPITAL CAP TABLE — LP Telemetry Terminal
   ================================================================
   ZERO-SCROLL: absolute inset-0, all content fits viewport.
   ================================================================ */

import {
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Calendar,
  Shield,
} from "lucide-react";

/* ── MOCK DATA ── */

const CAP_KPIS = [
  { id: "valuation", label: "Post-Money Valuation", value: "$2.4B", sub: "Series C (Q1 2026)", change: "+60%",   positive: true,  icon: TrendingUp },
  { id: "raised",    label: "Total Capital Raised", value: "$482M", sub: "across 4 rounds",    change: "+$180M", positive: true,  icon: Landmark },
  { id: "shares",    label: "Fully Diluted Shares", value: "120.0M", sub: "common equivalent", change: "+8.2M",  positive: false, icon: PieChart },
  { id: "holders",   label: "Total Shareholders",   value: "47",     sub: "inst + founders",   change: "+6",     positive: true,  icon: Users },
] as const;

interface FundingRound { round: string; date: string; raised: string; postMoney: string; sharePrice: string; leadInvestor: string }
const FUNDING_ROUNDS: FundingRound[] = [
  { round: "Series C",  date: "Jan 2026", raised: "$180M",  postMoney: "$2.40B", sharePrice: "$22.00", leadInvestor: "Sovereign Wealth Fund I" },
  { round: "Series B",  date: "Jun 2025", raised: "$120M",  postMoney: "$1.50B", sharePrice: "$15.00", leadInvestor: "Meridian Growth Equity" },
  { round: "Series A",  date: "Nov 2024", raised: "$62M",   postMoney: "$500M",  sharePrice: "$6.20",  leadInvestor: "Aurelia Ventures" },
  { round: "Seed",      date: "Mar 2024", raised: "$18M",   postMoney: "$70M",   sharePrice: "$1.40",  leadInvestor: "FinTech Foundry LP" },
  { round: "Pre-Seed",  date: "Sep 2023", raised: "$2.5M",  postMoney: "$12.5M", sharePrice: "$0.25",  leadInvestor: "Angel Syndicate" },
];

interface ShareClass { className: string; authorized: string; outstanding: string; liquidationPref: string; votingRights: string; antiDilution: string }
const SHARE_CLASSES: ShareClass[] = [
  { className: "Common",      authorized: "80.0M",  outstanding: "54.96M", liquidationPref: "None",             votingRights: "1x",    antiDilution: "N/A" },
  { className: "Series A",    authorized: "10.0M",  outstanding: "10.00M", liquidationPref: "1x non-part.",     votingRights: "1x",    antiDilution: "Weighted Avg." },
  { className: "Series B",    authorized: "8.0M",   outstanding: "8.00M",  liquidationPref: "1x non-part.",     votingRights: "1x",    antiDilution: "Weighted Avg." },
  { className: "Series C",    authorized: "10.0M",  outstanding: "8.18M",  liquidationPref: "1x participating", votingRights: "1x",    antiDilution: "Broad Weighted" },
  { className: "Option Pool", authorized: "20.0M",  outstanding: "18.00M", liquidationPref: "None",             votingRights: "Post-ex", antiDilution: "N/A" },
];

interface OwnershipRow { category: string; shares: string; pct: number; color: string }
const OWNERSHIP: OwnershipRow[] = [
  { category: "Founders & Mgmt",   shares: "36.0M",  pct: 30.0, color: "bg-cyan-500" },
  { category: "Series C",          shares: "8.18M",  pct: 6.8,  color: "bg-emerald-500" },
  { category: "Series B",          shares: "8.00M",  pct: 6.7,  color: "bg-violet-500" },
  { category: "Series A",          shares: "10.00M", pct: 8.3,  color: "bg-amber-500" },
  { category: "Seed",              shares: "12.86M", pct: 10.7, color: "bg-rose-500" },
  { category: "Pre-Seed / Angels", shares: "10.00M", pct: 8.3,  color: "bg-sky-500" },
  { category: "Option Pool",       shares: "18.0M",  pct: 15.0, color: "bg-slate-500" },
  { category: "Treasury Reserve",  shares: "10.96M", pct: 9.1,  color: "bg-teal-500" },
  { category: "Strategic",         shares: "6.00M",  pct: 5.0,  color: "bg-indigo-500" },
];

interface KeyInvestor { name: string; type: string; sharesM: number; pctOwnership: number; boardSeat: boolean; entryRound: string }
const KEY_INVESTORS: KeyInvestor[] = [
  { name: "Sovereign Wealth Fund I", type: "Sovereign",     sharesM: 8.18,  pctOwnership: 6.8, boardSeat: true,  entryRound: "C" },
  { name: "Meridian Growth Equity",  type: "Growth PE",     sharesM: 8.00,  pctOwnership: 6.7, boardSeat: true,  entryRound: "B" },
  { name: "Aurelia Ventures",        type: "VC",            sharesM: 10.00, pctOwnership: 8.3, boardSeat: true,  entryRound: "A" },
  { name: "FinTech Foundry LP",      type: "Seed VC",       sharesM: 7.14,  pctOwnership: 6.0, boardSeat: true,  entryRound: "Seed" },
  { name: "Nordic Reserve Systems",  type: "Strategic",     sharesM: 3.50,  pctOwnership: 2.9, boardSeat: false, entryRound: "B" },
  { name: "Pacific Bullion Trust",   type: "Strategic",     sharesM: 2.50,  pctOwnership: 2.1, boardSeat: false, entryRound: "C" },
  { name: "Helvetia Private Bank",   type: "Institutional", sharesM: 1.80,  pctOwnership: 1.5, boardSeat: false, entryRound: "A" },
  { name: "Angel Syndicate (8 LPs)", type: "Angel",         sharesM: 10.00, pctOwnership: 8.3, boardSeat: false, entryRound: "Pre-Seed" },
];

/* ── PAGE ── */

export default function CapTablePage() {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-3 gap-2">
      {/* ── KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-2">
        {CAP_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center shrink-0">
                <Icon className="h-3 w-3 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium truncate">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-bold text-white tabular-nums">{kpi.value}</span>
                  <span className={`font-mono text-[9px] font-semibold tabular-nums ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BODY: 2-column ── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-2">
        {/* LEFT COL — Funding Rounds + Share Classes */}
        <div className="col-span-8 flex flex-col gap-2 min-h-0">
          {/* Funding Round History */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 shrink-0">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Funding Round History</span>
              </div>
              <span className="font-mono text-[9px] text-slate-600">5 rounds closed</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Round</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Date</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Raised</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Post-$</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Price/Share</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Lead</th>
                </tr>
              </thead>
              <tbody>
                {FUNDING_ROUNDS.map((r) => (
                  <tr key={r.round} className="border-b border-slate-800/50">
                    <td className="px-3 py-1.5 text-cyan-400 font-semibold">{r.round}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400 tabular-nums">{r.date}</td>
                    <td className="px-3 py-1.5 font-mono text-emerald-400 font-semibold text-right tabular-nums">{r.raised}</td>
                    <td className="px-3 py-1.5 font-mono text-white font-semibold text-right tabular-nums">{r.postMoney}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-300 text-right tabular-nums">{r.sharePrice}</td>
                    <td className="px-3 py-1.5 text-slate-400 truncate max-w-[160px]">{r.leadInvestor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Share Class Detail */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 flex-1 min-h-0">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
              <Shield className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Share Class Detail & Rights</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Class</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">Auth&apos;d</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-right">O/S</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Liq. Pref</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Voting</th>
                  <th className="px-3 py-1 font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">Anti-Dilution</th>
                </tr>
              </thead>
              <tbody>
                {SHARE_CLASSES.map((sc) => (
                  <tr key={sc.className} className="border-b border-slate-800/50">
                    <td className="px-3 py-1.5 text-slate-200 font-medium">{sc.className}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400 text-right tabular-nums">{sc.authorized}</td>
                    <td className="px-3 py-1.5 font-mono text-white font-semibold text-right tabular-nums">{sc.outstanding}</td>
                    <td className="px-3 py-1.5 text-slate-400">{sc.liquidationPref}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400">{sc.votingRights}</td>
                    <td className="px-3 py-1.5 text-slate-500">{sc.antiDilution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL — Ownership Breakdown + Key Investors */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          {/* Ownership Breakdown */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 shrink-0">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
              <PieChart className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Ownership Breakdown</span>
            </div>
            <div className="px-3 pt-2 pb-1">
              <div className="h-3 w-full rounded-sm overflow-hidden flex">
                {OWNERSHIP.map((o) => (
                  <div key={o.category} className={`${o.color}`} style={{ width: `${o.pct}%` }} title={`${o.category}: ${o.pct}%`} />
                ))}
              </div>
            </div>
            <div className="px-3 py-1.5 space-y-0.5">
              {OWNERSHIP.map((o) => (
                <div key={o.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-sm ${o.color}`} />
                    <span className="text-[9px] text-slate-400 truncate">{o.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-500 tabular-nums">{o.shares}</span>
                    <span className="font-mono text-[9px] text-white font-semibold tabular-nums w-10 text-right">{o.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Investor Roster */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 flex-1 min-h-0 flex flex-col">
            <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 shrink-0">
              <Users className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-wider">Key Investors</span>
            </div>
            <div className="divide-y divide-slate-800/50 flex-1 min-h-0 overflow-hidden">
              {KEY_INVESTORS.map((inv) => (
                <div key={inv.name} className="px-3 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-200 font-medium truncate mr-2">{inv.name}</span>
                    <span className="font-mono text-[10px] text-white font-semibold tabular-nums shrink-0">{inv.pctOwnership}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span className="font-mono text-slate-600 tabular-nums">{inv.sharesM.toFixed(2)}M</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-500">{inv.type}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-cyan-400/60">{inv.entryRound}</span>
                    {inv.boardSeat && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-amber-400/60 font-semibold uppercase tracking-wider text-[8px]">Board</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
