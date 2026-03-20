"use client";

/* ================================================================
   OFFTAKER ORG SELECTION — Command Terminal Gate
   ================================================================
   First screen after authentication. Ambient telemetry strip +
   cinematic empty-state "Gate Card" or populated entity grid.
   Zero-scroll enforced: h-full flex flex-col overflow-hidden.
   ================================================================ */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  KeyRound,
  ArrowRight,
  Shield,
  Lock,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  AlertTriangle,
  Activity,
  Wifi,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";
import { useGoldPrice } from "@/hooks/use-gold-price";

/* ── Mock entity data — replace with real query ── */
interface CustodyEntity {
  id: string;
  name: string;
  lei: string;
  jurisdiction: string;
  kybStatus: "CLEARED" | "PENDING" | "REVIEW";
  createdAt: string;
}

// TODO: Replace with TanStack Query fetching from /api/offtaker/entities
const MOCK_ENTITIES: CustodyEntity[] = [];

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function OrgSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const { data: goldPrice, isLoading: priceLoading, isError: priceError } = useGoldPrice();

  const [invitationCode, setInvitationCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [entities] = useState<CustodyEntity[]>(MOCK_ENTITIES);

  const spotPrice = goldPrice?.spotPriceUsd ?? 0;
  const hasEntities = entities.length > 0;

  const handleJoinOrg = () => {
    if (!invitationCode.trim()) {
      setJoinError("Access token is required");
      return;
    }
    setJoinError("");
    const demoParam = isDemoActive ? "&demo=active" : "";
    router.push(
      `/offtaker/org/join?code=${encodeURIComponent(invitationCode.trim())}${demoParam}`
    );
  };

  const handleInitializeOrg = () => {
    const demoParam = isDemoActive ? "?demo=active" : "";
    router.push(`/offtaker/onboarding/intake${demoParam}`);
  };

  const handleSelectEntity = (entityId: string) => {
    const demoParam = isDemoActive ? "?demo=active" : "";
    sessionStorage.setItem("aurumshield:active-entity", entityId);
    router.push(`/offtaker/marketplace${demoParam}`);
  };

  const kybBadge = (status: CustodyEntity["kybStatus"]) => {
    const config = {
      CLEARED: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "KYB CLEARED", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
      PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", label: "PENDING AML", icon: <Activity className="h-2.5 w-2.5" /> },
      REVIEW: { bg: "bg-red-500/10", text: "text-red-400", label: "UNDER REVIEW", icon: <AlertTriangle className="h-2.5 w-2.5" /> },
    };
    const c = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] uppercase ${c.bg} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">

      {/* ══════════════════════════════════════════════════════════
         AMBIENT TELEMETRY STRIP — Makes the terminal feel alive
         ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-black/40 border-b border-slate-800/60 px-6 py-2 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-slate-500" />
          <span className="font-mono text-[9px] text-slate-500">XAU/USD:</span>
          {priceLoading ? (
            <span className="font-mono text-[10px] text-slate-600 animate-pulse">SYNCING...</span>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-mono text-[10px] text-white font-bold tabular-nums">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(spotPrice)}
              </span>
            </>
          )}
          {goldPrice && !priceError && (
            <span className={`font-mono text-[9px] tabular-nums ${goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {goldPrice.change24h >= 0 ? "+" : ""}{goldPrice.change24h}
            </span>
          )}
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
          <Wifi className="h-3 w-3 text-emerald-400" />
          <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase">
            Network: Secure
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-slate-500" />
          <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
            End-to-End Encryption: Active
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Fingerprint className="h-3 w-3 text-slate-600" />
          <span className="font-mono text-[9px] text-slate-600 tracking-wider">
            SESSION AUTHENTICATED
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         HEADER
         ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-6 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-0.5">
          <Shield className="h-3.5 w-3.5 text-gold-primary" />
          <span className="font-mono text-gold-primary text-[9px] tracking-[0.3em] uppercase font-bold">
            AurumShield Terminal Gate
          </span>
        </div>
        <h1 className="text-base font-bold tracking-tight text-white">
          Corporate Custody Perimeter
        </h1>
      </div>

      {/* ══════════════════════════════════════════════════════════
         MAIN CONTENT — Centered Gate Card or Entity Grid
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col px-6 pb-2 overflow-hidden">

        {!hasEntities ? (
          /* ═══════════════════════════════════════════════════════
             EMPTY STATE — "Establish Custody" Gate Card
             ═══════════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              {/* Gate Card */}
              <div className="bg-slate-900/50 border border-[#C6A86B]/30 rounded-sm shadow-[0_0_60px_-15px_rgba(198,168,107,0.1)] relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-linear-to-br from-[#C6A86B]/3 via-transparent to-transparent pointer-events-none" />

                <div className="relative p-6">
                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
                    <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase">
                      Clearing Engine Online — Ready for Registration
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold tracking-tight text-white mb-2">
                    Establish Corporate Custody
                  </h2>

                  {/* Institutional Microcopy */}
                  <p className="font-mono text-[11px] text-slate-400 leading-relaxed mb-4 max-w-lg">
                    Welcome to AurumShield. To access the liquidity nexus and establish
                    physical custody, you must first register your corporate entity and
                    clear the AML/KYB perimeter.
                  </p>

                  {/* Parameter Readout */}
                  <div className="bg-black/40 border border-slate-800/50 p-3 mb-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-3 w-3 text-slate-600" />
                      <span className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase">
                        Entity Parameters
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5">
                      <span className="font-mono text-[10px] text-slate-600">role_assignment</span>
                      <span className="font-mono text-[10px] text-gold-primary text-right tabular-nums">TREASURY_ADMIN</span>
                      <span className="font-mono text-[10px] text-slate-600">perimeter_type</span>
                      <span className="font-mono text-[10px] text-slate-400 text-right">INSTITUTIONAL</span>
                      <span className="font-mono text-[10px] text-slate-600">compliance_tier</span>
                      <span className="font-mono text-[10px] text-slate-400 text-right">SOVEREIGN</span>
                      <span className="font-mono text-[10px] text-slate-600">clearing_access</span>
                      <span className="font-mono text-[10px] text-emerald-400 text-right">ENABLED</span>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="relative">
                    {isDemoActive && (
                      <DemoTooltip
                        text="Register your corporate entity to enter the secure perimeter ↓"
                        position="top"
                      />
                    )}
                    <button
                      data-tour="cinematic-org-register"
                      onClick={handleInitializeOrg}
                      className={`w-full bg-gold-primary text-slate-950 font-mono font-bold text-xs tracking-[0.15em] uppercase py-3 flex items-center justify-center gap-2 hover:bg-gold-hover transition-colors cursor-pointer rounded-sm ${isDemoActive ? `${DEMO_SPOTLIGHT_CLASSES} demo-cta-glow` : ""}`}
                    >
                      <Building2 className="h-4 w-4" />
                      Register Corporate Entity
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Collapsible: Join Existing */}
                  <div className="border border-slate-800/50 mt-3 rounded-sm">
                    <button
                      onClick={() => setShowAttach(!showAttach)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-900/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3 w-3 text-slate-500" />
                        <span className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase">
                          Join Existing Corporate Account
                        </span>
                      </div>
                      {showAttach ? (
                        <ChevronUp className="h-3 w-3 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-600" />
                      )}
                    </button>

                    {showAttach && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-800/30">
                        <div className="pt-3">
                          <label
                            htmlFor="invitation-code"
                            className="font-mono text-slate-600 text-[9px] tracking-[0.15em] uppercase block mb-1.5"
                          >
                            Corporate Access Token
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">
                              $
                            </span>
                            <input
                              id="invitation-code"
                              type="text"
                              value={invitationCode}
                              onChange={(e) => {
                                setInvitationCode(e.target.value);
                                if (joinError) setJoinError("");
                              }}
                              placeholder="enter-access-token"
                              className="w-full bg-slate-950 border border-slate-700 px-8 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                            />
                          </div>
                          {joinError && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                              <p className="font-mono text-[10px] text-red-400">{joinError}</p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleJoinOrg}
                          className="w-full border border-slate-700 text-slate-300 font-mono text-xs tracking-widest uppercase py-2.5 hover:border-gold-primary/50 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Authenticate & Join
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Line */}
              <p className="mt-2 text-center font-mono text-[9px] text-slate-700 tracking-wider">
                AurumShield Clearing · Sovereign Financial Infrastructure · Multi-Tenant Isolation
              </p>
            </div>
          </div>

        ) : (
          /* ═══════════════════════════════════════════════════════
             POPULATED STATE — Entity Grid
             ═══════════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase">
                  Registered Custody Profiles
                </span>
              </div>
              <button
                onClick={handleInitializeOrg}
                className="font-mono text-[10px] text-gold-primary tracking-wider uppercase hover:text-gold-hover transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="h-3 w-3" />
                + New Entity
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-sm p-4 flex flex-col hover:border-[#C6A86B]/30 transition-colors group"
                >
                  {/* Entity name + badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-mono text-sm text-white font-bold mb-1 group-hover:text-gold-primary transition-colors">
                        {entity.name}
                      </h3>
                      <span className="font-mono text-[9px] text-gold-primary bg-black/40 border border-slate-800/50 px-2 py-0.5">
                        {entity.lei}
                      </span>
                    </div>
                    {kybBadge(entity.kybStatus)}
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase block mb-0.5">Jurisdiction</span>
                      <span className="font-mono text-[11px] text-slate-400">{entity.jurisdiction}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase block mb-0.5">Registered</span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {new Date(entity.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <button
                      onClick={() => handleSelectEntity(entity.id)}
                      disabled={entity.kybStatus !== "CLEARED"}
                      className={`w-full font-mono text-xs tracking-wider uppercase py-2.5 flex items-center justify-center gap-2 rounded-sm transition-colors ${
                        entity.kybStatus === "CLEARED"
                          ? "bg-gold-primary text-slate-950 font-bold hover:bg-gold-hover cursor-pointer"
                          : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {entity.kybStatus === "CLEARED" ? (
                        <>
                          Access Terminal
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          KYB Pending
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Telemetry Footer ── */}
      <div className="shrink-0 px-6 py-1.5 border-t border-slate-800/40">
        <TelemetryFooter />
      </div>
    </div>
  );
}
