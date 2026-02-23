"use client";

/* ================================================================
   FINGERPRINT PROVIDER — Device & Behavioral Fraud Detection
   ================================================================
   Wraps @fingerprintjs/fingerprintjs-pro-react to provide device
   fingerprinting across the app. The visitor_id is captured during
   signup/login to block repeat bad actors and detect device spoofing.

   Uses NEXT_PUBLIC_FINGERPRINT_API_KEY (client-safe public key).
   Server-side verification uses FINGERPRINT_SERVER_SECRET separately.
   ================================================================ */

import { type ReactNode } from "react";
import {
  FpjsProvider,
  type FpjsProviderOptions,
} from "@fingerprintjs/fingerprintjs-pro-react";

/* ---------- Environment ---------- */

const FINGERPRINT_API_KEY =
  process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY ?? "";

const IS_CONFIGURED =
  typeof FINGERPRINT_API_KEY === "string" &&
  FINGERPRINT_API_KEY.length > 0 &&
  FINGERPRINT_API_KEY !== "YOUR_FINGERPRINT_API_KEY";

/* ---------- Provider Config ---------- */

const fpjsConfig: FpjsProviderOptions = {
  loadOptions: {
    apiKey: FINGERPRINT_API_KEY,
    region: "us",
  },
};

/* ---------- Component ---------- */

interface FingerprintProviderProps {
  children: ReactNode;
}

/**
 * Wrap the app tree to enable `useVisitorData()` in any client component.
 * When the API key is not configured (e.g. local dev / demo mode), the
 * provider renders children directly without initializing the SDK —
 * all downstream `useVisitorData()` calls will return `undefined` data
 * and `isLoading: false`, which signup/login handle gracefully.
 */
export function FingerprintProvider({ children }: FingerprintProviderProps) {
  if (!IS_CONFIGURED) {
    return <>{children}</>;
  }

  return (
    <FpjsProvider {...fpjsConfig}>
      {children}
    </FpjsProvider>
  );
}
