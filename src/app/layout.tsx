import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

/* ----------------------------------------------------------------
   FONTS — next/font (self-hosted, no external requests)
   ---------------------------------------------------------------- */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

/* ----------------------------------------------------------------
   METADATA
   ---------------------------------------------------------------- */
export const metadata: Metadata = {
  title: "AurumShield — Sovereign Financial Infrastructure",
  description:
    "Institutional gold clearing, custody, and compliance. Deterministic risk-first execution for sovereign-grade counterparties.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

/* ----------------------------------------------------------------
   ROOT LAYOUT
   ---------------------------------------------------------------- */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${sourceSerif.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
