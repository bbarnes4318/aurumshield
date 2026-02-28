"use client";

/* ================================================================
   SIGNUP PAGE — Redirect to Institutional Access Gate
   ================================================================
   All institutional access requests are handled through the
   unified vetting form at /login.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-xs font-mono text-text-faint tracking-wider animate-pulse">
        Redirecting to access gate...
      </p>
    </div>
  );
}
