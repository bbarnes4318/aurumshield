"use client";

import Image from "next/image";

export function TrustBand() {
  return (
    <section className="w-full border-y border-slate-800/60 bg-[#080C16]">
      <Image
        src="/banner/banner.png"
        alt="SOC 2 Type II Infrastructure · PCI DSS Compliant Routing · LBMA Good Delivery Formats · FinCEN / BSA Compliant"
        width={1920}
        height={100}
        className="w-full h-auto block"
        priority
        unoptimized
      />
    </section>
  );
}
