"use client";

/* ================================================================
   DEMO CONSOLE — Role-based guided tour entry point

   Displays 3 role cards (Buyer / Seller / Admin) with CTA to start guided tours.
   Each card shows role icon, display name, description, preview path.
   ================================================================ */

import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Store,
  Settings,
  ChevronRight,
  RotateCcw,
  Play,
} from "lucide-react";
import { useDemo } from "@/providers/demo-provider";
import { useTour } from "@/demo/tour-engine/TourProvider";
import { ROLE_DISPLAY } from "@/demo/tour-engine/tourTypes";
import { getAllTours } from "@/demo/tours";
import { SupportBanner } from "@/components/demo/SupportBanner";
import type { UserRole } from "@/lib/mock-data";

/* ---------- Role Icon Mapping ---------- */
const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  buyer: ShoppingCart,
  seller: Store,
  admin: Settings,
};

/* ---------- Role Descriptions ---------- */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  buyer:
    "Experience the buy-side workflow: market overview, reservation creation, order confirmation, settlement tracking, and certificate issuance.",
  seller:
    "Walk through the sell-side workflow: listing creation, evidence packing, publish gate verification, and settlement lifecycle participation.",
  admin:
    "Administrative operations: fee pricing, capital controls, settlement oversight, and governance audit.",
};

/** Only these three roles appear on the demo console */
const DEMO_ROLES = ["buyer", "seller", "admin"];

/* ---------- Page Component ---------- */
export default function DemoConsolePage() {
  const router = useRouter();
  const { isDemo, resetDemo } = useDemo();
  const { startTour, state: tourState, exitTour } = useTour();
  const tours = getAllTours().filter((t) => DEMO_ROLES.includes(t.role));

  const handleStartTour = (roleId: string) => {
    if (tourState.status !== "idle") {
      exitTour();
    }
    startTour(roleId);
  };

  if (!isDemo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-xl font-semibold text-text mb-2">Demo Mode Required</h1>
        <p className="text-sm text-text-muted mb-4">
          Add <code className="typo-mono text-gold">?demo=true</code> to the URL to access the demo console.
        </p>
        <button
          onClick={() => router.push("/demo?demo=true")}
          className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-bg hover:bg-gold-hover transition-colors"
        >
          Enter Demo Mode
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-text mb-1">
          Demo Console
        </h1>
        <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
          Select a role to begin a guided tour of AurumShield&apos;s clearing and settlement infrastructure.
          Each tour covers the primary workflow for that role with structured commentary.
        </p>
      </div>

      {/* Role Cards Grid — 3 cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        {tours.map((tour) => {
          const Icon = ROLE_ICONS[tour.role] ?? Settings;
          const displayName = ROLE_DISPLAY[tour.role as UserRole] ?? tour.role;
          const description = ROLE_DESCRIPTIONS[tour.role] ?? tour.description;

          return (
            <div
              key={tour.id}
              className="card-base border border-border p-5 flex flex-col justify-between"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-surface-2">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-text">{displayName}</h2>
                    <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
                      {tour.steps.length} steps
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  {description}
                </p>

                {/* Preview Path */}
                <div className="mb-4">
                  <span className="text-[9px] uppercase tracking-widest text-text-faint font-semibold mb-1.5 block">
                    Tour Path
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tour.previewPath.slice(0, 6).map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[10px] text-text-faint"
                      >
                        {idx > 0 && <ChevronRight className="h-2.5 w-2.5 opacity-40" />}
                        {label}
                      </span>
                    ))}
                    {tour.previewPath.length > 6 && (
                      <span className="text-[10px] text-text-faint">
                        +{tour.previewPath.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleStartTour(tour.role)}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-4 py-2.5 text-xs font-semibold text-bg uppercase tracking-wider transition-colors hover:bg-gold-hover active:bg-gold-pressed"
              >
                <Play className="h-3 w-3" />
                Start Guided Tour
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Controls + Support */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-6">
          <div className="text-[10px] text-text-faint uppercase tracking-widest">
            AurumShield Institutional Demonstration
          </div>
          <SupportBanner compact />
        </div>
        <button
          onClick={resetDemo}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-3 hover:text-text transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Demo
        </button>
      </div>
    </>
  );
}
