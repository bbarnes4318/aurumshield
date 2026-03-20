"use client";

/* ================================================================
   GLOBAL ERROR BOUNDARY
   ================================================================
   Catches uncaught React errors at the root level (outside layout).
   Primary purpose: recover gracefully from ChunkLoadErrors that
   crash the React tree after a deploy.

   If a chunk error is detected, auto-reload ONCE per session.
   Guard: uses sessionStorage to prevent infinite reload loops.
   ================================================================ */

import { useEffect } from "react";

const RELOAD_KEY = "__aurumshield_global_error_reload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error.message || "";
    const isChunkError =
      msg.includes("ChunkLoadError") ||
      msg.includes("Failed to load chunk") ||
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch dynamically imported module");

    if (isChunkError) {
      // Guard: only auto-reload ONCE per session to prevent infinite loops
      try {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
        if (alreadyReloaded) {
          // Already tried reloading — don't loop, just show the error UI
          console.warn(
            "[GlobalError] ChunkLoadError persisted after reload. Showing recovery UI.",
          );
          return;
        }
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        // sessionStorage unavailable — don't reload to be safe
        return;
      }
      window.location.reload();
      return;
    }

    // Log non-chunk errors for observability
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#e7ecf4",
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              color: "#c6a86b",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#aab6c8", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            An unexpected error occurred. This may be due to a recent platform
            update. Please try again.
          </p>
          <button
            onClick={() => {
              // Clear the reload guard so a fresh manual reload can try again
              try {
                sessionStorage.removeItem(RELOAD_KEY);
              } catch {
                // ignore
              }
              window.location.reload();
            }}
            style={{
              background: "#c6a86b",
              color: "#0b1220",
              border: "none",
              padding: "0.6rem 1.5rem",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              marginRight: "0.75rem",
            }}
          >
            Reload Page
          </button>
          <button
            onClick={reset}
            style={{
              background: "transparent",
              color: "#c6a86b",
              border: "1px solid #243653",
              padding: "0.6rem 1.5rem",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
