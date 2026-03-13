"use client";

/* ================================================================
   TRUST BAND — Institutional Trust Strip
   ================================================================ */

const TRUST_ITEMS = [
  "Verified Institutional Counterparties",
  "100% LBMA Good Delivery Assaying",
  "Lloyd's of London Insured Transit",
  "UCC Article 7 Bailment Jurisprudence",
] as const;

export function TrustBand() {
  return (
    <section className="w-full border-y border-slate-800 bg-[#0B0E14] py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 px-5 border-r border-slate-800/50 last:border-r-0"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
            <span className="font-mono text-[10px] lg:text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
              {item}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
