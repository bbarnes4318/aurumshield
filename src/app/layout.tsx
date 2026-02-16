import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
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

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-serif-4",
  display: "swap",
});

/* ----------------------------------------------------------------
   METADATA
   ---------------------------------------------------------------- */
export const metadata: Metadata = {
  title: "Gold — Sovereign Financial Infrastructure",
  description:
    "Institutional-grade risk management, counterparty analysis, and compliance platform for sovereign funds, bullion banks, and reinsurers.",
};

/* ----------------------------------------------------------------
   ROOT LAYOUT
   ---------------------------------------------------------------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${sourceSerif4.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
