import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Institutional Demo Walkthrough",
  description:
    "Guided walkthrough for the AurumShield sovereign clearing platform demonstration. Review the demo structure before entering the live environment.",
};

export default function WalkthroughLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
