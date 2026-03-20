"use client";

/* ================================================================
   CAPITAL CAP TABLE — LP Telemetry Terminal
   ================================================================
   Equity structure dashboard for Limited Partners.
   Shows ownership breakdown, funding round history, dilution
   waterfall, share class detail, and vesting schedule.

   All financial figures: font-mono + tabular-nums.
   Typography: text-sm / text-xs. Max padding: p-4.
   ================================================================ */

import {
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Calendar,
  ArrowUpDown,
  Shield,
} from "lucide-react";

/* ================================================================
   MOCK DATA
   ================================================================ */

const CAP_KPIS = [
  {
    id: "valuation",
    label: "Post-Money Valuation",
    value: "$2.4B",
    sub: "Series C (Q1 2026)",
    change: "+60%",
    positive: true,
    icon: TrendingUp,
  },
  {
    id: "raised",
    label: "Total Capital Raised",
    value: "$482M",
    sub: "across 4 rounds",
    change: "+$180M",
    positive: true,
    icon: Landmark,
  },
  {
    id: "shares",
    label: "Fully Diluted Shares",
    value: "120.0M",
    sub: "common equivalent",
    change: "+8.2M",
    positive: false,
    icon: PieChart,
  },
  {
    id: "holders",
    label: "Total Shareholders",
    value: "47",
    sub: "institutions + founders",
    change: "+6",
    positive: true,
    icon: Users,
  },
] as const;

/** Funding round history */
interface FundingRound {
  round: string;
  date: string;
  raised: string;
  preMoney: string;
  postMoney: string;
  leadInvestor: string;
  sharePrice: string;
  sharesIssued: string;
}

const FUNDING_ROUNDS: FundingRound[] = [
  {
    round: "Series C",
    date: "Jan 2026",
    raised: "$180M",
    preMoney: "$2.22B",
    postMoney: "$2.40B",
    leadInvestor: "Sovereign Wealth Fund I",
    sharePrice: "$22.00",
    sharesIssued: "8.18M",
  },
  {
    round: "Series B",
    date: "Jun 2025",
    raised: "$120M",
    preMoney: "$1.38B",
    postMoney: "$1.50B",
    leadInvestor: "Meridian Growth Equity",
    sharePrice: "$15.00",
    sharesIssued: "8.00M",
  },
  {
    round: "Series A",
    date: "Nov 2024",
    raised: "$62M",
    preMoney: "$438M",
    postMoney: "$500M",
    leadInvestor: "Aurelia Ventures",
    sharePrice: "$6.20",
    sharesIssued: "10.00M",
  },
  {
    round: "Seed",
    date: "Mar 2024",
    raised: "$18M",
    preMoney: "$52M",
    postMoney: "$70M",
    leadInvestor: "FinTech Foundry LP",
    sharePrice: "$1.40",
    sharesIssued: "12.86M",
  },
  {
    round: "Pre-Seed",
    date: "Sep 2023",
    raised: "$2.5M",
    preMoney: "$10M",
    postMoney: "$12.5M",
    leadInvestor: "Angel Syndicate",
    sharePrice: "$0.25",
    sharesIssued: "10.00M",
  },
];

/** Ownership breakdown */
interface OwnershipRow {
  category: string;
  shares: string;
  pct: number;
  color: string;
}

const OWNERSHIP: OwnershipRow[] = [
  { category: "Founders & Management",   shares: "36.0M",  pct: 30.0,  color: "bg-cyan-500"    },
  { category: "Series C Investors",       shares: "8.18M",  pct: 6.8,   color: "bg-emerald-500" },
  { category: "Series B Investors",       shares: "8.00M",  pct: 6.7,   color: "bg-violet-500"  },
  { category: "Series A Investors",       shares: "10.00M", pct: 8.3,   color: "bg-amber-500"   },
  { category: "Seed Investors",           shares: "12.86M", pct: 10.7,  color: "bg-rose-500"    },
  { category: "Pre-Seed / Angels",        shares: "10.00M", pct: 8.3,   color: "bg-sky-500"     },
  { category: "Employee Option Pool",     shares: "18.0M",  pct: 15.0,  color: "bg-slate-500"   },
  { category: "Treasury Reserve",         shares: "10.96M", pct: 9.1,   color: "bg-teal-500"    },
  { category: "Strategic Partners",       shares: "6.00M",  pct: 5.0,   color: "bg-indigo-500"  },
];

/** Share class detail */
interface ShareClass {
  className: string;
  authorized: string;
  outstanding: string;
  parValue: string;
  liquidationPref: string;
  votingRights: string;
  antiDilution: string;
}

const SHARE_CLASSES: ShareClass[] = [
  { className: "Common",     authorized: "80.0M",  outstanding: "54.96M", parValue: "$0.001", liquidationPref: "None",             votingRights: "1x",    antiDilution: "N/A"            },
  { className: "Series A",   authorized: "10.0M",  outstanding: "10.00M", parValue: "$0.001", liquidationPref: "1x non-part.",     votingRights: "1x",    antiDilution: "Weighted Avg."  },
  { className: "Series B",   authorized: "8.0M",   outstanding: "8.00M",  parValue: "$0.001", liquidationPref: "1x non-part.",     votingRights: "1x",    antiDilution: "Weighted Avg."  },
  { className: "Series C",   authorized: "10.0M",  outstanding: "8.18M",  parValue: "$0.001", liquidationPref: "1x participating", votingRights: "1x",    antiDilution: "Broad Weighted" },
  { className: "Option Pool", authorized: "20.0M", outstanding: "18.00M", parValue: "N/A",    liquidationPref: "None",             votingRights: "Post-exercise", antiDilution: "N/A"    },
];

/** Key investor roster */
interface KeyInvestor {
  name: string;
  type: string;
  sharesM: number;
  pctOwnership: number;
  boardSeat: boolean;
  entryRound: string;
}

const KEY_INVESTORS: KeyInvestor[] = [
  { name: "Sovereign Wealth Fund I",    type: "Sovereign",      sharesM: 8.18,  pctOwnership: 6.8,  boardSeat: true,  entryRound: "Series C" },
  { name: "Meridian Growth Equity",     type: "Growth PE",      sharesM: 8.00,  pctOwnership: 6.7,  boardSeat: true,  entryRound: "Series B" },
  { name: "Aurelia Ventures",           type: "VC",             sharesM: 10.00, pctOwnership: 8.3,  boardSeat: true,  entryRound: "Series A" },
  { name: "FinTech Foundry LP",         type: "Seed VC",        sharesM: 7.14,  pctOwnership: 6.0,  boardSeat: true,  entryRound: "Seed" },
  { name: "Nordic Reserve Systems",     type: "Strategic",      sharesM: 3.50,  pctOwnership: 2.9,  boardSeat: false, entryRound: "Series B" },
  { name: "Pacific Bullion Trust",      type: "Strategic",      sharesM: 2.50,  pctOwnership: 2.1,  boardSeat: false, entryRound: "Series C" },
  { name: "Helvetia Private Bank",      type: "Institutional",  sharesM: 1.80,  pctOwnership: 1.5,  boardSeat: false, entryRound: "Series A" },
  { name: "Angel Syndicate (8 LPs)",    type: "Angel",          sharesM: 10.00, pctOwnership: 8.3,  boardSeat: false, entryRound: "Pre-Seed" },
];

/* ================================================================
   PAGE
   ================================================================ */

export default function CapTablePage() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── KPI Strip ── */}
      <div className="col-span-12 grid grid-cols-4 gap-3">
        {CAP_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-md border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-slate-800 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold text-white tabular-nums">{kpi.value}</span>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">{kpi.sub}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-mono text-[10px] font-semibold tabular-nums ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                <span className="text-[10px] text-slate-600">vs prior round</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
         LEFT COL — Funding Rounds + Share Classes (col-span-8)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-8 space-y-4">
        {/* ── Funding Round History ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Funding Round History
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-600">5 rounds closed</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Round</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Date</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Raised</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Post-$</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Price/Share</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Lead</th>
              </tr>
            </thead>
            <tbody>
              {FUNDING_ROUNDS.map((r) => (
                <tr key={r.round} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-cyan-400 font-semibold">{r.round}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 tabular-nums">{r.date}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-emerald-400 font-semibold text-right tabular-nums">{r.raised}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white font-semibold text-right tabular-nums">{r.postMoney}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300 text-right tabular-nums">{r.sharePrice}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 truncate max-w-[180px]">{r.leadInvestor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Share Class Detail ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Share Class Detail & Rights
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Class</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Authorized</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold text-right">Outstanding</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Liq. Pref</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Voting</th>
                <th className="px-4 py-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Anti-Dilution</th>
              </tr>
            </thead>
            <tbody>
              {SHARE_CLASSES.map((sc) => (
                <tr key={sc.className} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-200 font-medium">{sc.className}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 text-right tabular-nums">{sc.authorized}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white font-semibold text-right tabular-nums">{sc.outstanding}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-400">{sc.liquidationPref}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{sc.votingRights}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">{sc.antiDilution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         RIGHT COL — Ownership Breakdown + Key Investors (col-span-4)
         ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-4 space-y-4">
        {/* ── Ownership Breakdown ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <PieChart className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Ownership Breakdown
            </span>
          </div>
          {/* Stacked ownership bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="h-4 w-full rounded-sm overflow-hidden flex">
              {OWNERSHIP.map((o) => (
                <div
                  key={o.category}
                  className={`${o.color} transition-all duration-500`}
                  style={{ width: `${o.pct}%` }}
                  title={`${o.category}: ${o.pct}%`}
                />
              ))}
            </div>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {OWNERSHIP.map((o) => (
              <div key={o.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-sm ${o.color}`} />
                  <span className="text-[11px] text-slate-400 truncate">{o.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500 tabular-nums">{o.shares}</span>
                  <span className="font-mono text-[11px] text-white font-semibold tabular-nums w-12 text-right">{o.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Investor Roster ── */}
        <div className="rounded-md border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Key Investors
            </span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {KEY_INVESTORS.map((inv) => (
              <div key={inv.name} className="px-4 py-2.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-200 font-medium truncate mr-2">{inv.name}</span>
                  <span className="font-mono text-[11px] text-white font-semibold tabular-nums shrink-0">{inv.pctOwnership}%</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono text-slate-600 tabular-nums">{inv.sharesM.toFixed(2)}M shares</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-500">{inv.type}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-cyan-400/60">{inv.entryRound}</span>
                  {inv.boardSeat && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-amber-400/60 font-semibold uppercase tracking-wider text-[9px]">Board</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
