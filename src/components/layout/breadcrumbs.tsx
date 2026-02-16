"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

/** Capitalize and humanize a URL slug */
function humanize(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/"
        className="flex items-center text-text-muted transition-colors hover:text-text"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-text-faint" />
            {isLast ? (
              <span className="text-text font-medium">{humanize(segment)}</span>
            ) : (
              <Link
                href={href}
                className="text-text-muted transition-colors hover:text-text"
              >
                {humanize(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
