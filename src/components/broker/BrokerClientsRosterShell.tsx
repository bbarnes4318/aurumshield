"use client";

/* ================================================================
   BROKER CLIENTS ROSTER SHELL — Interactive Client Wrapper
   ================================================================
   Client component that renders the data table and manages the
   InviteCounterpartyModal toggle. Receives real DB data from the
   server page component.
   ================================================================ */

import { useState } from "react";
import Link from "next/link";
import type { BrokerCrmEntity } from "@/actions/broker-crm-actions";
import { InviteCounterpartyModal } from "./InviteCounterpartyModal";

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
  clients: BrokerCrmEntity[];
}

export function BrokerClientsRosterShell({ clients }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const cleared = clients.filter((c) => c.kyc_status === "CLEARED").length;
  const pending = clients.filter((c) =>
    c.kyc_status === "PENDING LIVENESS" || c.kyc_status === "PENDING"
  ).length;
  const blocked = clients.filter((c) => c.kyc_status === "SANCTIONS BLOCK").length;

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── Header Strip ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
            Client Network
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            {clients.length} entities &middot;{" "}
            <span className="text-emerald-400">{cleared} cleared</span> &middot;{" "}
            <span className="text-amber-400">{pending} pending</span> &middot;{" "}
            <span className="text-red-400">{blocked} blocked</span>
          </p>
        </div>

        <button
          onClick={() => setInviteOpen(true)}
          className="px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
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
              <th className="text-left px-4 py-2.5 font-medium">Type</th>
              <th className="text-right px-4 py-2.5 font-medium">AUM</th>
              <th className="text-right px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const style = KYB_STYLES[client.kyc_status] ?? DEFAULT_STYLE;
              const isBlocked = client.kyc_status === "SANCTIONS BLOCK";

              return (
                <tr
                  key={client.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Entity Name */}
                  <td className="px-4 py-2.5 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                      {client.legal_name}
                    </div>
                  </td>

                  {/* Jurisdiction */}
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {client.jurisdiction ?? "—"}
                  </td>

                  {/* KYB/AML Status */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.text} ${style.bg} ${style.border}`}
                    >
                      {(client.kyc_status === "PENDING LIVENESS" || client.kyc_status === "PENDING") && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                      {client.kyc_status}
                    </span>
                  </td>

                  {/* Entity Type */}
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    <span className={client.entity_type === "BUYER" ? "text-sky-400" : "text-violet-400"}>
                      {client.entity_type}
                    </span>
                  </td>

                  {/* AUM */}
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                    {formatAum(client.aum_usd)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    {isBlocked ? (
                      <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider">
                        Restricted
                      </span>
                    ) : (
                      <Link
                        href={`/broker/clients/${client.id}`}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors"
                      >
                        View Entity →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}

            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">
                  No entities found. Invite your first counterparty above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <InviteCounterpartyModal
          brokerId="broker_123"
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
