"use client";

/* ================================================================
   GET-STARTED INDEX — /institutional/get-started
   ================================================================
   Bare route that forwards to the canonical welcome entry point.
   Uses client-side redirect for instant navigation without flash.
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GetStartedIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/institutional/get-started/welcome");
  }, [router]);

  /* Invisible while redirecting — layout provides the background */
  return null;
}
