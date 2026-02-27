"use client";

/* ================================================================
   STEP 4: Maker-Checker Role Assignment
   ================================================================
   Assign the primary institutional role (TRADER or TREASURY) and
   acknowledge the dual-authorization settlement policy.
   ================================================================ */

import { useFormContext } from "react-hook-form";
import {
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Vault,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepMakerChecker() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const selectedRole = watch("primaryRole");

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Maker-Checker Role Assignment
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        AurumShield enforces strict dual-authorization. Every settlement
        requires a Maker to initiate and a separate Checker to approve with a
        JIT WebAuthn signature.
      </p>

      {/* ── Role Selection Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* TRADER Card */}
        <label
          className={`
            flex flex-col items-center gap-3 rounded-xl border-2 p-5
            cursor-pointer transition-all duration-200
            ${
              selectedRole === "TRADER"
                ? "border-color-2/60 bg-color-2/8 shadow-lg shadow-color-2/5"
                : "border-color-5/20 bg-color-1/30 hover:border-color-5/40"
            }
          `}
        >
          <input
            type="radio"
            value="TRADER"
            {...register("primaryRole")}
            className="sr-only"
          />
          <div
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl
              ${selectedRole === "TRADER" ? "bg-color-2/15" : "bg-color-5/10"}
            `}
          >
            <TrendingUp
              className={`h-6 w-6 ${selectedRole === "TRADER" ? "text-color-2" : "text-color-5/50"}`}
            />
          </div>
          <div className="text-center">
            <p
              className={`text-sm font-bold ${selectedRole === "TRADER" ? "text-color-2" : "text-color-3/70"}`}
            >
              TRADER
            </p>
            <p className="text-[10px] text-color-3/40 mt-0.5 uppercase tracking-wider font-semibold">
              Maker
            </p>
          </div>
          <ul className="text-[11px] text-color-3/50 space-y-1 text-center leading-relaxed">
            <li>Initiate orders</li>
            <li>Lock prices</li>
            <li>Submit for approval</li>
          </ul>
        </label>

        {/* TREASURY Card */}
        <label
          className={`
            flex flex-col items-center gap-3 rounded-xl border-2 p-5
            cursor-pointer transition-all duration-200
            ${
              selectedRole === "TREASURY"
                ? "border-color-2/60 bg-color-2/8 shadow-lg shadow-color-2/5"
                : "border-color-5/20 bg-color-1/30 hover:border-color-5/40"
            }
          `}
        >
          <input
            type="radio"
            value="TREASURY"
            {...register("primaryRole")}
            className="sr-only"
          />
          <div
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl
              ${selectedRole === "TREASURY" ? "bg-color-2/15" : "bg-color-5/10"}
            `}
          >
            <Vault
              className={`h-6 w-6 ${selectedRole === "TREASURY" ? "text-color-2" : "text-color-5/50"}`}
            />
          </div>
          <div className="text-center">
            <p
              className={`text-sm font-bold ${selectedRole === "TREASURY" ? "text-color-2" : "text-color-3/70"}`}
            >
              TREASURY
            </p>
            <p className="text-[10px] text-color-3/40 mt-0.5 uppercase tracking-wider font-semibold">
              Checker / Approver
            </p>
          </div>
          <ul className="text-[11px] text-color-3/50 space-y-1 text-center leading-relaxed">
            <li>Review orders</li>
            <li>Approve &amp; Execute DvP</li>
            <li>JIT WebAuthn signature</li>
          </ul>
        </label>
      </div>

      {errors.primaryRole && (
        <p className="text-[11px] text-color-4">
          {errors.primaryRole.message as string}
        </p>
      )}

      {/* ── Maker-Checker Flow Diagram ── */}
      <div className="rounded-lg border border-color-5/20 bg-color-1/50 p-4">
        <h3 className="text-[10px] font-semibold text-color-3/40 uppercase tracking-wider mb-3">
          Dual-Authorization Flow
        </h3>
        <div className="flex items-center justify-center gap-2 text-[11px]">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-color-2/10">
              <TrendingUp className="h-3.5 w-3.5 text-color-2" />
            </div>
            <span className="text-color-3/50 font-medium">Maker</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-color-5/40 mx-1" />
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="rounded-md border border-color-5/20 bg-color-1/80 px-2.5 py-1 text-[10px] text-color-3/50">
              5% Collateral Lock
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-color-5/40 mx-1" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-color-2/10">
              <Vault className="h-3.5 w-3.5 text-color-2" />
            </div>
            <span className="text-color-3/50 font-medium">Checker</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-color-5/40 mx-1" />
          <div className="flex flex-col items-center gap-1">
            <div className="rounded-md border border-[#3fae7a]/30 bg-[#3fae7a]/5 px-2.5 py-1 text-[10px] text-[#3fae7a] font-medium">
              DvP Execute
            </div>
          </div>
        </div>
      </div>

      {/* ── Dual-Auth Acknowledgment ── */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          {...register("dualAuthAcknowledged")}
          className="
            mt-0.5 h-4 w-4 rounded border-color-5/40
            bg-color-1/80 text-color-2
            focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
            accent-[#D0A85C]
          "
        />
        <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
          I acknowledge that all settlements on AurumShield require
          dual-authorization. A TRADER (Maker) must initiate and a separate
          TREASURY (Checker) must approve with a cryptographically bound
          WebAuthn signature before DvP execution can proceed.
        </span>
      </label>

      {errors.dualAuthAcknowledged && (
        <p className="text-[11px] text-color-4">
          {errors.dualAuthAcknowledged.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>RBAC enforced at database level · Roles immutable post-onboarding</span>
      </div>
    </div>
  );
}
