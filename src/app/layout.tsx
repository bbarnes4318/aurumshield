import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { ClerkWrapper } from "@/providers/clerk-wrapper";
import { FingerprintProvider } from "@/providers/fingerprint-provider";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { DemoProvider } from "@/providers/demo-provider";
import { TourProvider } from "@/demo/tour-engine/TourProvider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
import { ChunkErrorRecovery } from "@/components/chunk-error-recovery";

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

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
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
  other: {
    "color-scheme": "dark",
    "theme-color": "#0A1128",
    "forced-colors": "none",
  },
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
    <ClerkWrapper>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${ibmPlexSans.variable} ${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <head>
          <meta name="color-scheme" content="dark" />
          <meta name="theme-color" content="#0A1128" />
        </head>
        <body className="font-sans antialiased">
          <ChunkErrorRecovery />
          <ThemeProvider attribute="class" defaultTheme="dark">
            <QueryProvider>
              <AuthProvider>
                <FingerprintProvider>
                  <Suspense fallback={null}>
                    <DemoProvider>
                      <TourProvider>
                        <AppShell>{children}</AppShell>
                      </TourProvider>
                      <Toaster theme="dark" position="bottom-right" richColors />
                    </DemoProvider>
                  </Suspense>
                </FingerprintProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkWrapper>
  );
}
