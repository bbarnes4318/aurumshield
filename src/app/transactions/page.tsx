/* ================================================================
   TRANSACTIONS / MARKETPLACE — Async Server Component
   ================================================================
   Institutional operators see the same Marketplace execution
   terminal used by institutional buyers at /institutional/marketplace.

   The sidebar labels this route "Marketplace".
   ================================================================ */

import InstitutionalMarketplacePage from "@/app/institutional/marketplace/page";

export default async function TransactionsPage() {
  return <InstitutionalMarketplacePage />;
}
