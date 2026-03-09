import { InstitutionalWizard } from "@/components/institutional/InstitutionalWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Buyer Portal — AurumShield",
  description:
    "Institutional gold procurement wizard. LBMA Good Delivery 400-oz bars. Goldwire instant settlement.",
};

export default function InstitutionalPortalPage() {
  return <InstitutionalWizard />;
}
