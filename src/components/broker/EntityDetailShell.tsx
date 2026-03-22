"use client";

/* ================================================================
   ENTITY DETAIL SHELL — Broker CRM Detail View
   ================================================================
   Client component that renders the full entity profile and the
   editable private notes field. Uses updateBrokerClientNotes
   server action for saving notes.
   ================================================================ */

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BrokerCrmEntity } from "@/actions/broker-crm-actions";
import { updateBrokerClientNotes } from "@/actions/broker-crm-actions";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";

/* ── KYB/AML Status styling ── */
const KYB_STYLES: Record<string, { text: string; dot: string; bg: string; border: string }> = {
  CLEARED:            { text: "text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "PENDING LIVENESS": { text: "text-amber-400",   dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  "SANCTIONS BLOCK":  { text: "text-red-400",     dot: "bg-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
  PENDING:            { text: "text-amber-400",   dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

const DEFAULT_STYLE = { text: "text-slate-500", dot: "bg-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" };

/** Format BigInt cents string → human-readable USD */
function formatAum(centsStr: string): string {
  const cents = BigInt(centsStr || "0");
  const dollars = Number(cents) / 100;
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

interface Props {
  entity: BrokerCrmEntity;
}

export function EntityDetailShell({ entity }: Props) {
  const [notes, setNotes] = useState(entity.private_notes ?? "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const style = KYB_STYLES[entity.kyc_status] ?? DEFAULT_STYLE;

  function handleSaveNotes() {
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const result = await updateBrokerClientNotes(
        entity.id,
        entity.broker_id,
        notes,
      );

      if (!result.success) {
        setSaveError(result.error);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }

  /* ── Field rows for the details grid ── */
  const fields: { label: string; value: string | null; mono?: boolean }[] = [
    { label: "Entity ID", value: entity.id, mono: true },
    { label: "Legal Name", value: entity.legal_name },
    { label: "Entity Type", value: entity.entity_type },
    { label: "Contact Email", value: entity.contact_email, mono: true },
    { label: "Jurisdiction", value: entity.jurisdiction },
    { label: "Tax ID", value: entity.tax_id, mono: true },
    { label: "Wallet Address", value: entity.wallet_address, mono: true },
    { label: "AUM (USD)", value: formatAum(entity.aum_usd) },
    {
      label: "Created",
      value: new Date(entity.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  ];

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-4">
        <Link
          href="/broker/clients"
          className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Roster
        </Link>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            {entity.legal_name}
          </h1>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.text} ${style.bg} ${style.border}`}
        >
          {entity.kyc_status}
        </span>
      </div>

      {/* ── Content: 2 Column Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Left: Entity Details ── */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] mb-4">
            Entity Profile
          </h2>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-baseline gap-3">
                <span className="shrink-0 w-28 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                  {f.label}
                </span>
                <span
                  className={`text-xs ${f.mono ? "font-mono" : ""} ${
                    f.value ? "text-slate-200" : "text-slate-600"
                  }`}
                >
                  {f.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Private Notes ── */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">
              Private Notes
            </h2>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveError && (
                <span className="text-[10px] font-mono text-red-400">
                  {saveError}
                </span>
              )}
              <button
                onClick={handleSaveNotes}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3 w-3" />
                {isPending ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private broker notes about this entity..."
            className="flex-1 min-h-[200px] w-full px-3 py-2 rounded border border-slate-700 bg-slate-800/50 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
