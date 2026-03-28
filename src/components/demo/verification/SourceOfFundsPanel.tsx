/* ================================================================
   SOURCE OF FUNDS PANEL — Funding origin and screening review

   Shows:
   - Funding rail chosen (digital stablecoin / legacy wire)
   - Treasury origin and corporate source
   - Bank/wallet review status
   - OFAC wallet screening result
   - Chain analysis results
   - Operational readiness for settlement

   All data is demonstration material.
   ================================================================ */

"use client";

import {
  DollarSign,
  CheckCircle2,
  Zap,
  Clock,
  ShieldCheck,
  Globe,
  Wallet,
  Building2,
  Activity,
} from "lucide-react";
import { DEMO_FUNDING, DEMO_ENTITY } from "@/demo/data/demoConstants";

interface Props {
  isVisible: boolean;
}

export function SourceOfFundsPanel({ isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#C6A86B]" />
          <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
            Source of Funds Review
          </h4>
        </div>
        <span className="text-[9px] text-slate-600 font-mono">
          {DEMO_ENTITY.companyName}
        </span>
      </div>

      {/* ── Funding rail summary ── */}
      <div className="rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-800/40">
          <DetailBlock
            icon={<Zap className="h-3.5 w-3.5 text-emerald-400/80" />}
            label="Funding Rail"
            value="Digital Stablecoin Bridge"
            sublabel="Institutional preferred rail — no legacy banking friction"
          />
          <DetailBlock
            icon={<Clock className="h-3.5 w-3.5 text-emerald-400/80" />}
            label="Settlement Speed"
            value="T+0 — Instant Clearing"
            sublabel="Deterministic settlement via Goldwire engine"
            highlight
          />
        </div>
        <div className="border-t border-slate-800/40 grid grid-cols-2 divide-x divide-slate-800/40">
          <DetailBlock
            icon={<Wallet className="h-3.5 w-3.5 text-slate-500" />}
            label="Stablecoin Asset"
            value={DEMO_FUNDING.asset}
            sublabel="Circle USDC — fully reserved, US-regulated"
          />
          <DetailBlock
            icon={<Globe className="h-3.5 w-3.5 text-slate-500" />}
            label="Network"
            value={DEMO_FUNDING.network.charAt(0).toUpperCase() + DEMO_FUNDING.network.slice(1)}
            sublabel="L1 mainnet — no bridge risk"
          />
        </div>

        {/* Wallet address */}
        <div className="border-t border-slate-800/40 px-4 py-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">Designated Wallet Address</p>
          <p className="text-[10px] text-slate-300 font-mono tracking-wider break-all leading-relaxed">
            {DEMO_FUNDING.walletAddress}
          </p>
        </div>

        {/* Treasury origin */}
        <div className="border-t border-slate-800/40 px-4 py-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">Treasury Origin</p>
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
            <p className="text-[10px] text-slate-300 font-medium">
              {DEMO_FUNDING.treasuryOrigin}
            </p>
          </div>
        </div>

        {/* Bank review */}
        <div className="border-t border-slate-800/40 px-4 py-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">Bank / Correspondent Review</p>
          <p className="text-[10px] text-slate-400">
            {DEMO_FUNDING.bankReview}
          </p>
        </div>
      </div>

      {/* ── Screening status rows ── */}
      <div className="space-y-1.5">
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 px-1">
          Wallet & Source Screening
        </p>
        <ScreeningRow
          icon={<ShieldCheck className="h-3 w-3 text-emerald-400/60" />}
          label="OFAC Wallet Screen"
          detail="Screened against SDN and Blocked Persons List"
          status="SCREENED"
        />
        <ScreeningRow
          icon={<Activity className="h-3 w-3 text-emerald-400/60" />}
          label="Chain Analysis — Illicit Source Detection"
          detail="Chainalysis KYT — no exposure to sanctioned entities or mixing services"
          status="CLEAR"
        />
        <ScreeningRow
          icon={<Activity className="h-3 w-3 text-emerald-400/60" />}
          label="Transaction Volume Pattern Analysis"
          detail="Historical pattern consistent with institutional operating account"
          status="NORMAL"
        />
        <ScreeningRow
          icon={<Zap className="h-3 w-3 text-emerald-400/60" />}
          label="Operational Readiness"
          detail="Wallet verified, screening passed, settlement engine ready to accept deposits"
          status={DEMO_FUNDING.operationalReadiness}
        />
      </div>

      {/* ── Demo footer ── */}
      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/20">
        <DollarSign className="h-2.5 w-2.5 text-[#C6A86B]/40" />
        <span className="text-[8px] text-[#C6A86B]/50 tracking-wider uppercase">
          DEMONSTRATION FUNDING DATA — NOT A LIVE WALLET OR TREASURY
        </span>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function DetailBlock({
  icon,
  label,
  value,
  sublabel,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={`text-[11px] font-semibold ${highlight ? "text-emerald-400" : "text-slate-300"}`}>
          {value}
        </p>
      </div>
      <p className="text-[8px] text-slate-600 mt-1">{sublabel}</p>
    </div>
  );
}

function ScreeningRow({
  icon,
  label,
  detail,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800/30 bg-slate-900/20 px-3 py-2.5 transition-colors hover:bg-slate-900/30">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-300 font-medium">{label}</p>
          <p className="text-[8px] text-slate-600 mt-0.5 leading-snug">{detail}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-400/80 shrink-0 ml-3">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {status}
      </span>
    </div>
  );
}
