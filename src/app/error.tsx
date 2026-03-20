"use client";

/* ================================================================
   ROOT ERROR BOUNDARY
   ================================================================
   Catches uncaught errors BELOW layout.tsx but ABOVE global-error.
   This prevents most errors from cascading to the global-error
   boundary (which replaces the entire page including <html>/<body>).

   The layout chrome (sidebar, topbar, providers) stays intact.
   Only the {children} content area is replaced with this error UI.
   ================================================================ */

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <svg
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        An unexpected error occurred. Your session and data are safe.
        Try again or reload the page.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-700 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          Reload Page
        </button>
      </div>

      {process.env.NODE_ENV === "development" && error.message && (
        <details className="mt-8 w-full max-w-lg text-left">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400">
            Error details (dev only)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-red-300 border border-slate-800">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}
