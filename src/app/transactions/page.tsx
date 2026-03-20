/* ================================================================
   TRANSACTIONS / MARKETPLACE — Async Server Component
   ================================================================
   Institutional operators see the same Marketplace execution
   terminal that cleared Offtakers use at /offtaker/marketplace.

   The sidebar labels this route "Marketplace".
   ================================================================ */

import OfftakerMarketplacePage from "@/app/offtaker/marketplace/page";

export default async function TransactionsPage() {
  return <OfftakerMarketplacePage />;
}
