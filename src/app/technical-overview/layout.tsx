import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Technical Overview",
  description:
    "Comprehensive technical overview of the AurumShield sovereign gold-trading platform for investor due diligence.",
};

export default function TechnicalOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
