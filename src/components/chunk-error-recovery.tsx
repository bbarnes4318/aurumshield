"use client";

/* ================================================================
   CHUNK ERROR RECOVERY
   ================================================================
   After a deploy, users with cached HTML will try to load JS chunks
   that no longer exist on the server (new build = new chunk hashes).
   This component catches those 404 ChunkLoadErrors and forces a
   full page reload so the browser fetches the new HTML + new chunks.

   Guard: only reloads once per session to prevent infinite loops.
   ================================================================ */

import { useEffect } from "react";

const RELOAD_KEY = "__aurumshield_chunk_reload";

export function ChunkErrorRecovery() {
  useEffect(() => {
    function handleChunkError(event: ErrorEvent) {
      const msg = event.message || "";
      const isChunkError =
        msg.includes("ChunkLoadError") ||
        msg.includes("Failed to load chunk") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module");

      if (!isChunkError) return;

      // Guard: only auto-reload once per session
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (alreadyReloaded) return;

      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";

      const isChunkError =
        msg.includes("ChunkLoadError") ||
        msg.includes("Failed to load chunk") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module");

      if (!isChunkError) return;

      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (alreadyReloaded) return;

      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Clear the reload guard on successful page load (new chunks loaded OK)
    sessionStorage.removeItem(RELOAD_KEY);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
