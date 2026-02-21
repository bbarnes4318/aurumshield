import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AurumShield — Routing",
  description: "Role-based routing for AurumShield platform.",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
