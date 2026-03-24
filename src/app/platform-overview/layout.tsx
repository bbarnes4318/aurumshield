import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Platform Capabilities v2.0",
  description:
    "Sovereign clearing infrastructure for institutional precious metals. Atomic DvP, Column Bank settlement, Veriff KYC, passkey authentication, actuarial transit insurance, and cryptographic settlement finality.",
};

export default function PlatformOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
