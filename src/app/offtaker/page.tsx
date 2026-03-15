"use client";

/* ================================================================
   /offtaker — Root redirect to the Offtaker org selection entry
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfftakerRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/offtaker/org/select");
  }, [router]);

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <span className="font-mono text-sm text-slate-500 animate-pulse">
        Initializing Offtaker Perimeter...
      </span>
    </div>
  );
}
