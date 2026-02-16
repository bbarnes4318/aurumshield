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
  title: string;
  type: EvidenceType;
  date: string;
  author: string;
  classification: Classification;
  summary: string;
  pages: number;
  className?: string;
}

export function EvidenceCard({
  title,
  type,
  date,
  author,
  classification,
  summary,
  pages,
  className,
}: EvidenceCardProps) {
  const TypeIcon = typeIcons[type];
  const classConfig = classificationConfig[classification];
  const ClassIcon = classConfig.icon;

  return (
    <div className={cn("card-base p-5", className)}>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2">
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

      {/* Summary */}
      <p className="mb-3 text-sm leading-relaxed text-text-muted">{summary}</p>

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-text-faint">
        <span>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span className="tabular-nums">{pages} {pages === 1 ? "page" : "pages"}</span>
      </div>
    </div>
  );
}
