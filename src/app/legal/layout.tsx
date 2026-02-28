import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

/* ================================================================
   LEGAL PAGE LAYOUT — Shared wrapper for all legal/policy pages
   ================================================================ */

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#0A1128]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Image
              src="/arum-logo-gold.svg"
              alt="AurumShield"
              width={160}
              height={40}
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Home
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-4xl px-6 py-24">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/40 py-8 text-center text-[10px] text-slate-600">
        © 2026 AurumShield. All rights reserved.
      </footer>
    </div>
  );
}
