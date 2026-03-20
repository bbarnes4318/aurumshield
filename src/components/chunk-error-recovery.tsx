"use client";

/* ================================================================
   CHUNK ERROR RECOVERY
   ================================================================
   After a deploy, users with cached HTML will try to load JS chunks
   that no longer exist on the server (new build = new chunk hashes).
   This component catches those 404 ChunkLoadErrors and forces a
   full page reload so the browser fetches the new HTML + new chunks.

   Guard: only reloads once per session to prevent infinite loops.
   The guard is cleared after a 5-second delay (meaning the page
   loaded and stabilized successfully with new chunks).
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
      try {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
        if (alreadyReloaded) return;
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        // sessionStorage unavailable — don't reload
        return;
      }

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

      try {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
        if (alreadyReloaded) return;
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        return;
      }

      window.location.reload();
    }

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Clear the reload guard AFTER a delay — if we got here and stayed
    // stable for 5 seconds, the new chunks loaded fine
    const clearTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore
      }
    }, 5_000);

    return () => {
      clearTimeout(clearTimer);
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
