"use client";

/* ================================================================
   /producer — Root redirect to Producer accreditation entry
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProducerRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/producer/accreditation");
  }, [router]);

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <span className="font-mono text-sm text-slate-500 animate-pulse">
        Initializing Producer Terminal...
      </span>
    </div>
  );
}
