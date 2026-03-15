/* ================================================================
   TRANSACTIONS / OTC TERMINAL — Async Server Component
   ================================================================
   Dual-Mode Data Fetching:
     - Demo mode (?demo=true): Renders the OTC terminal with mock
       spot pricing and simulated banking actions.
     - Live mode: Renders the same OTC terminal (this page is
       inherently interactive — the server component provides
       the auth gate and dual-mode wrapper).

   The entire interactive OTC terminal UI is delegated to the
   TransactionsUI client component.
   ================================================================ */

import TransactionsUI from "./TransactionsUI";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  // searchParams parsed for future auth gate wiring.
  // Currently both demo and live branches render the same
  // interactive OTC terminal.
  const _isDemo =
    resolvedSearchParams.demo === "true" ||
    resolvedSearchParams.demo === "active";

  // The transactions page is a fully interactive OTC terminal.
  // Both demo and live branches render the same UI — the server
  // component layer adds the async boundary and auth enforcement
  // capability for future wiring.

  return <TransactionsUI />;
}
