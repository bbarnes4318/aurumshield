"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuditEvent } from "@/lib/mock-data";

const CAT_CLR: Record<string, string> = {
  auth: "text-info bg-info/10", data: "text-gold bg-gold/10", config: "text-warning bg-warning/10",
  export: "text-success bg-success/10", system: "text-text-faint bg-surface-3",
};

const VALID_CAT = new Set(["auth", "data", "config", "export", "system"]);

interface Props { auditEvents: AuditEvent[] }

export function DetailAuditTab({ auditEvents }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawCat = searchParams.get("cat") ?? "all";
  const activeCat = VALID_CAT.has(rawCat) ? rawCat : "all";
  const filtered = activeCat === "all" ? auditEvents : auditEvents.filter((e) => e.category === activeCat);

  function setFilter(val: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (val === "all") p.delete("cat"); else p.set("cat", val);
    p.set("tab", "audit");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-faint mr-1">Category:</span>
        {["all", "auth", "data", "config", "export", "system"].map((v) => (
          <button key={v} type="button" onClick={() => setFilter(v)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors border", activeCat === v ? "bg-gold/10 text-gold border-gold/30" : "bg-surface-2 text-text-muted border-border hover:border-gold/20")}
          >{v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}</button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card-base p-6 text-center text-sm text-text-faint">No audit events match this filter.</div>
      ) : (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Timestamp</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Action</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Actor</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Role</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Resource</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">Category</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-faint">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-3 py-2 tabular-nums text-text-faint whitespace-nowrap text-xs">{new Date(e.timestamp).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 text-text font-medium">{e.action}</td>
                    <td className="px-3 py-2 text-text-muted">{e.actor}</td>
                    <td className="px-3 py-2 text-text-faint text-xs">{e.actorRole}</td>
                    <td className="px-3 py-2 text-text-muted">{e.resource} <span className="text-text-faint font-mono text-[10px]">{e.resourceId}</span></td>
                    <td className="px-3 py-2"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", CAT_CLR[e.category])}>{e.category}</span></td>
                    <td className="px-3 py-2 font-mono text-xs text-text-faint">{e.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
