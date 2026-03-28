/* ================================================================
   COMPLIANCE DECISION PANEL — Final institutional approval state
   
   Shows:
   - Cleared for institutional trading badge
   - Reviewer desk attribution
   - Approval timestamp
   - Capability unlock: EXECUTION ENABLED badge
   - Detailed capability list with descriptions
   
   All data is demonstration material.
   ================================================================ */

"use client";

import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Award,
  Zap,
  Lock,
  Shield,
} from "lucide-react";
import { DEMO_ENTITY, DEMO_REPRESENTATIVE } from "@/demo/data/demoConstants";

interface Props {
  isVisible: boolean;
}

export function ComplianceDecisionPanel({ isVisible }: Props) {
  if (!isVisible) return null;

  const approvalTimestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div className="space-y-5">
      {/* ── Approval badge ── */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.08)]">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10 animate-ping" style={{ animationDuration: "3s" }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-emerald-400 tracking-wide">
            Cleared for Institutional Trading
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            {DEMO_ENTITY.companyName}
          </p>
        </div>
      </div>

      {/* ── Decision details ── */}
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 space-y-3">
        <DecisionLine
          icon={<Clock className="h-3.5 w-3.5 text-slate-500" />}
          label="Approval Timestamp"
          value={approvalTimestamp}
        />
        <DecisionLine
          icon={<Shield className="h-3.5 w-3.5 text-slate-500" />}
          label="Reviewer Desk"
          value="AurumShield Compliance — Automated Review + Manual Oversight"
        />
        <DecisionLine
          icon={<Award className="h-3.5 w-3.5 text-slate-500" />}
          label="Authorized Representative"
          value={`${DEMO_REPRESENTATIVE.name} — ${DEMO_REPRESENTATIVE.title}`}
        />
        <DecisionLine
          icon={<Lock className="h-3.5 w-3.5 text-slate-500" />}
          label="Review Type"
          value="Full KYB + UBO + AML/Sanctions + Source of Funds"
        />
      </div>

      {/* ── EXECUTION ENABLED badge ── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2.5 rounded-lg border-2 border-[#C6A86B]/30 bg-linear-to-r from-[#C6A86B]/10 via-[#C6A86B]/5 to-[#C6A86B]/10 px-6 py-3 shadow-[0_0_24px_rgba(198,168,107,0.06)]">
          <Zap className="h-4 w-4 text-[#C6A86B]" />
          <span className="text-xs font-bold tracking-[0.2em] text-[#C6A86B] uppercase">
            Execution Enabled
          </span>
        </div>
      </div>

      {/* ── Capabilities unlocked ── */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 px-1">
          Capabilities Unlocked
        </p>
        {CAPABILITIES.map((cap) => (
          <div
            key={cap.label}
            className="flex items-start gap-2.5 rounded-lg border border-slate-800/30 bg-slate-900/20 px-3 py-2.5 transition-colors hover:bg-slate-900/30"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/15 shrink-0 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400/80" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-300 font-semibold">{cap.label}</p>
              <p className="text-[8px] text-slate-600 mt-0.5 leading-snug">{cap.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Demo footer ── */}
      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/20">
        <ShieldCheck className="h-2.5 w-2.5 text-[#C6A86B]/40" />
        <span className="text-[8px] text-[#C6A86B]/50 tracking-wider uppercase">
          DEMONSTRATION COMPLIANCE DECISION — NOT A LIVE CLEARANCE
        </span>
      </div>
    </div>
  );
}

/* ── Constants ── */

const CAPABILITIES = [
  {
    label: "Institutional Marketplace Access",
    description: "Full access to LBMA-standard gold products including Good Delivery bars, kilo bars, and sovereign coins.",
  },
  {
    label: "LBMA Good Delivery Settlement",
    description: "Execute settlement for 400oz Good Delivery bars at London Bullion Market standards with 995+ fineness.",
  },
  {
    label: "Allocated Vaulted Custody",
    description: "Secure title to individually identified bars at Malca-Amit, Brink's, or Loomis facilities worldwide.",
  },
  {
    label: "Goldwire Settlement Engine",
    description: "Process deterministic settlement with T+0 stablecoin deposits and real-time stage tracking.",
  },
  {
    label: "Real-Time Settlement Tracking",
    description: "Monitor every stage from case opened through binding quote, fund receipt, allocation, and clearing certificate.",
  },
] as const;

/* ── Sub-components ── */

function DecisionLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}
