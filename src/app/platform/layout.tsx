import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Platform Capabilities",
  description:
    "Sovereign clearing infrastructure for institutional precious metals. Atomic DvP, continuous capital adequacy, deterministic policy enforcement.",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
