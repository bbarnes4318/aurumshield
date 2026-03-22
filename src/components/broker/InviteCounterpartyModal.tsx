"use client";

/* ================================================================
   INVITE COUNTERPARTY MODAL — Broker CRM
   ================================================================
   Zod-validated form for inviting a new entity (BUYER/SELLER)
   to the broker's Book of Business. Calls createBrokerClient()
   server action on submit. On success, the roster page is
   revalidated server-side and the modal closes.
   ================================================================ */

import { useState, useTransition } from "react";
import { createBrokerClient } from "@/actions/broker-crm-actions";
import { X } from "lucide-react";

interface Props {
  brokerId: string;
  onClose: () => void;
}

interface FormErrors {
  legalName?: string;
  contactEmail?: string;
  entityType?: string;
  jurisdiction?: string;
}

export function InviteCounterpartyModal({ brokerId, onClose }: Props) {
  const [legalName, setLegalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [entityType, setEntityType] = useState<"BUYER" | "SELLER">("BUYER");
  const [jurisdiction, setJurisdiction] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!legalName.trim()) {
      newErrors.legalName = "Legal name is required";
    } else if (legalName.length > 256) {
      newErrors.legalName = "Must be 256 characters or fewer";
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = "Must be a valid email address";
    }

    if (!entityType) {
      newErrors.entityType = "Entity type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    setServerError(null);

    startTransition(async () => {
      const result = await createBrokerClient({
        brokerId,
        legalName: legalName.trim(),
        contactEmail: contactEmail.trim(),
        entityType,
        jurisdiction: jurisdiction.trim() || undefined,
      });

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      // Success — close modal. The revalidatePath in the server action
      // will cause the roster page to re-render with the new entity.
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 tracking-tight">
              Invite Counterparty
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Issue a secure invite to onboard a new entity
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Server Error */}
          {serverError && (
            <div className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400 font-mono">
              {serverError}
            </div>
          )}

          {/* Legal Name */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Legal Entity Name *
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Aurelia Sovereign Fund"
              className={`w-full px-3 py-2 rounded border text-sm bg-slate-800/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
                errors.legalName ? "border-red-500/50" : "border-slate-700"
              }`}
            />
            {errors.legalName && (
              <p className="mt-1 text-[10px] font-mono text-red-400">{errors.legalName}</p>
            )}
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Contact Email *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ops@company.com"
              className={`w-full px-3 py-2 rounded border text-sm bg-slate-800/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
                errors.contactEmail ? "border-red-500/50" : "border-slate-700"
              }`}
            />
            {errors.contactEmail && (
              <p className="mt-1 text-[10px] font-mono text-red-400">{errors.contactEmail}</p>
            )}
          </div>

          {/* Entity Type */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Entity Type *
            </label>
            <div className="flex gap-3">
              {(["BUYER", "SELLER"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEntityType(type)}
                  className={`flex-1 px-3 py-2 rounded border text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
                    entityType === type
                      ? type === "BUYER"
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                        : "border-violet-500/40 bg-violet-500/10 text-violet-400"
                      : "border-slate-700 bg-slate-800/30 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.entityType && (
              <p className="mt-1 text-[10px] font-mono text-red-400">{errors.entityType}</p>
            )}
          </div>

          {/* Jurisdiction */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Jurisdiction
            </label>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. Switzerland, Cayman Islands"
              className="w-full px-3 py-2 rounded border border-slate-700 text-sm bg-slate-800/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded border border-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 rounded border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Submitting..." : "Issue Secure Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
