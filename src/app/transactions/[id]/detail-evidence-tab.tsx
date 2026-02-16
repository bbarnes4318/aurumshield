"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FileText, FileSpreadsheet, Mail, FileCheck, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/mock-data";

const CLASS_CLR: Record<string, { text: string; bg: string }> = {
  public: { text: "text-success", bg: "bg-success/10" },
  internal: { text: "text-info", bg: "bg-info/10" },
  confidential: { text: "text-warning", bg: "bg-warning/10" },
  restricted: { text: "text-danger", bg: "bg-danger/10" },
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText, report: FileSpreadsheet, correspondence: Mail, filing: FileCheck, memo: StickyNote,
};

const VALID_CLASS = new Set(["public", "internal", "confidential", "restricted"]);

interface Props { evidence: EvidenceItem[] }

export function DetailEvidenceTab({ evidence }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawClass = searchParams.get("class") ?? "all";
  const activeClass = VALID_CLASS.has(rawClass) ? rawClass : "all";
  const filtered = activeClass === "all" ? evidence : evidence.filter((e) => e.classification === activeClass);

  function setFilter(val: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (val === "all") p.delete("class"); else p.set("class", val);
    p.set("tab", "evidence");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-faint mr-1">Classification:</span>
        {["all", "public", "internal", "confidential", "restricted"].map((v) => (
          <button key={v} type="button" onClick={() => setFilter(v)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors border", activeClass === v ? "bg-gold/10 text-gold border-gold/30" : "bg-surface-2 text-text-muted border-border hover:border-gold/20")}
          >{v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}</button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="card-base p-6 text-center text-sm text-text-faint">No evidence items match this filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((e) => {
            const cls = CLASS_CLR[e.classification];
            const Icon = TYPE_ICON[e.type] ?? FileText;
            return (
              <div key={e.id} className="card-base p-4 flex gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]", cls.bg)}>
                  <Icon className={cn("h-4 w-4", cls.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{e.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{e.summary}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-text-faint">
                    <span className={cn("rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[10px]", cls.bg, cls.text)}>{e.classification}</span>
                    <span>{e.date}</span>
                    <span>{e.pages} pg</span>
                    <span className="truncate">{e.author}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
