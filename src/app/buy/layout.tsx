/* ================================================================
   /buy LAYOUT — Buyer Journey Route Group
   ================================================================
   Wraps all /buy/* pages in the BuyerFlowLayout (progress rail +
   spot price ticker). No sidebar, no topbar.
   ================================================================ */

import { BuyerFlowLayout } from "@/components/buyer/BuyerFlowLayout";

export default function BuyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BuyerFlowLayout>{children}</BuyerFlowLayout>;
}
