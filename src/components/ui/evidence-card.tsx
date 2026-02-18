import { cn } from "@/lib/utils";
import {
  FileText,
  FileBarChart,
  Mail,
  FileInput,
  StickyNote,
  Lock,
  Eye,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { EvidenceItem } from "@/lib/mock-data";

type EvidenceType = "document" | "report" | "correspondence" | "filing" | "memo";
type Classification = "public" | "internal" | "confidential" | "restricted";

const typeIcons: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  report: FileBarChart,
  correspondence: Mail,
  filing: FileInput,
  memo: StickyNote,
};

const classificationConfig: Record<
  Classification,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  public: { icon: Eye, color: "text-success", label: "Public" },
  internal: { icon: ShieldCheck, color: "text-info", label: "Internal" },
  confidential: { icon: Lock, color: "text-warning", label: "Confidential" },
  restricted: { icon: ShieldAlert, color: "text-danger", label: "Restricted" },
};

interface EvidenceCardProps {
  title?: string;
  type?: EvidenceType;
  date?: string;
  author?: string;
  classification?: Classification;
  summary?: string;
  pages?: number;
  item?: EvidenceItem;
  compact?: boolean;
  className?: string;
}

export function EvidenceCard({
  title: titleProp,
  type: typeProp,
  date: dateProp,
  author: authorProp,
  classification: classificationProp,
  summary: summaryProp,
  pages: pagesProp,
  item,
  compact,
  className,
}: EvidenceCardProps) {
  const title = titleProp ?? item?.title ?? "—";
  const type = typeProp ?? item?.type ?? "document";
  const date = dateProp ?? item?.date ?? "";
  const author = authorProp ?? item?.author ?? "—";
  const classification = classificationProp ?? item?.classification ?? "internal";
  const summary = summaryProp ?? item?.summary ?? "";
  const pages = pagesProp ?? item?.pages ?? 0;

  const TypeIcon = typeIcons[type];
  const classConfig = classificationConfig[classification];
  const ClassIcon = classConfig.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5 rounded-sm border border-border bg-surface-2 px-3 py-2", className)}>
        <TypeIcon className="h-3.5 w-3.5 text-text-faint shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text truncate">{title}</p>
          <p className="text-[10px] text-text-faint">{date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} · {pages}pg</p>
        </div>
        <span className={cn("flex items-center gap-0.5 text-[10px]", classConfig.color)}>
          <ClassIcon className="h-2.5 w-2.5" />
        </span>
      </div>
    );
  }

  return (
    <div className={cn("card-base p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-2">
            <TypeIcon className="h-4 w-4 text-text-muted" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">{title}</h4>
            <p className="mt-0.5 text-xs text-text-faint">{author}</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", classConfig.color)}>
          <ClassIcon className="h-3 w-3" />
          {classConfig.label}
        </span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-text-muted">{summary}</p>
      <div className="flex items-center gap-4 text-xs text-text-faint">
        <span>{date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
        <span className="tabular-nums">{pages} {pages === 1 ? "page" : "pages"}</span>
      </div>
    </div>
  );
}
