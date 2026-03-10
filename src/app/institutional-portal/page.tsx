import { UnifiedInstitutionalHub } from "@/components/institutional/UnifiedInstitutionalHub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Buyer Portal — AurumShield",
  description:
    "Institutional gold procurement hub. LBMA Good Delivery 400-oz bars. Goldwire instant settlement.",
};

export default function InstitutionalPortalPage() {
  return <UnifiedInstitutionalHub />;
}
