"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  FileText,
  Shield,
  AlertTriangle,
  XCircle,
  Loader2,
  Plus,
  Minus,
  Lock,
  Phone,
} from "lucide-react";
import {
  useSettlement,
  useProcessPayment,
  useSelectAddOns,
  useComputeFeeQuote,
} from "@/hooks/use-mock-queries";
import { useAuth } from "@/providers/auth-provider";
import { ContactSupportInline } from "@/components/ui/contact-support-inline";
import {
  ADD_ON_CATALOG,
  ADD_ON_CATEGORY_LABELS,
  ADD_ON_CATEGORY_ORDER,
  formatCentsUsd,
  formatBpsPercent,
  type SelectedAddOn,
  type AddOnCategory,
  type AddOnCatalogEntry,
} from "@/lib/fees/fee-engine";

/* ================================================================
   Activation & Fees Page
   
   Full fee configuration, add-on selection, invoice breakdown,
   and mock payment flow for a settlement's clearing activation.
   ================================================================ */

export default function ActivationPage() {
  const params = useParams();
  const settlementId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { data: settlement, isLoading } = useSettlement(settlementId);

  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
  const [addOnsInitialized, setAddOnsInitialized] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const selectAddOnsMutation = useSelectAddOns();
  const processPaymentMutation = useProcessPayment();

  // Initialize add-ons from settlement data
  if (settlement && !addOnsInitialized) {
    setSelectedAddOns(settlement.selectedAddOns ?? []);
    setAddOnsInitialized(true);
  }

  // Compute fee quote locally (revision #2: no pseudo-API indirection)
  const { data: feeResult } = useComputeFeeQuote(
    settlement?.notionalCents ?? 0,
    selectedAddOns,
    !!settlement,
  );

  // Group add-ons by category
  const groupedAddOns = useMemo(() => {
    const groups: Record<AddOnCategory, AddOnCatalogEntry[]> = {
      physical: [],
      insurance: [],
      compliance: [],
      structuring: [],
      audit: [],
      priority_ops: [],
    };
    for (const entry of ADD_ON_CATALOG) {
      groups[entry.category].push(entry);
    }
    return groups;
  }, []);

  // Toggle add-on selection
  const toggleAddOn = useCallback((code: string) => {
    setSelectedAddOns((prev) => {
      const exists = prev.some((a) => a.code === code);
      if (exists) return prev.filter((a) => a.code !== code);
      return [...prev, { code }];
    });
  }, []);

  // Save add-on selections
  const handleSaveAddOns = useCallback(async () => {
    if (!settlement) return;
    try {
      await selectAddOnsMutation.mutateAsync({
        settlementId: settlement.id,
        addOns: selectedAddOns,
      });
    } catch (err) {
      console.error("[ActivationPage] Failed to save add-ons:", err);
    }
  }, [settlement, selectedAddOns, selectAddOnsMutation]);

  // Process payment
  const handlePayment = useCallback(
    async (method: "mock_card" | "wire_mock" | "invoice_mock") => {
      if (!settlement || !user) return;
      setProcessing(true);
      try {
        // Save add-ons first if changed
        await selectAddOnsMutation.mutateAsync({
          settlementId: settlement.id,
          addOns: selectedAddOns,
        });
        // Process payment
        await processPaymentMutation.mutateAsync({
          settlementId: settlement.id,
          method,
          actorUserId: user.id,
        });
        setPaymentModalOpen(false);
        // Redirect back to settlement detail
        router.push(`/settlements/${settlement.id}`);
      } catch (err) {
        console.error("[ActivationPage] Payment failed:", err);
      } finally {
        setProcessing(false);
      }
    },
    [settlement, user, selectedAddOns, selectAddOnsMutation, processPaymentMutation, router],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="p-8">
        <p className="text-[var(--text-secondary)]">Settlement not found.</p>
      </div>
    );
  }

  const isPaid = settlement.paymentStatus === "paid";
  const isActivated = settlement.activationStatus === "activated";
  const frozenQuote = settlement.feeQuote?.frozen ? settlement.feeQuote : null;
  const displayQuote = frozenQuote ?? feeResult?.feeQuote;
  const requiresApproval = feeResult?.requiresManualApproval ?? false;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto" data-tour="activation-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/settlements/${settlement.id}`)}
            className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Activation & Fees
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {settlement.id} — {settlement.weightOz} oz @ $
              {settlement.pricePerOzLocked.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              /oz
            </p>
          </div>
        </div>
        <ContactSupportInline />
      </div>

      {/* Activation Status Banner */}
      <ActivationStatusBanner
        activationStatus={settlement.activationStatus}
        paymentStatus={settlement.paymentStatus}
        approvalStatus={settlement.approvalStatus}
        requiresManualApproval={settlement.requiresManualApproval}
        paymentReceipt={settlement.paymentReceipt}
      />

      {/* Notional */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Notional Value
            </p>
            <p className="text-2xl font-semibold font-mono text-[var(--text-primary)] mt-1">
              {formatCentsUsd(settlement.notionalCents)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Currency</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {settlement.currency}
            </p>
          </div>
        </div>
      </div>

      {/* Add-On Selector */}
      {!isPaid && (
        <div className="space-y-4" data-tour="addons-selector">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Institutional Services
            </h2>
            <button
              onClick={handleSaveAddOns}
              disabled={selectAddOnsMutation.isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
            >
              {selectAddOnsMutation.isPending ? "Saving…" : "Save Selections"}
            </button>
          </div>

          {ADD_ON_CATEGORY_ORDER.map((category) => {
            const entries = groupedAddOns[category];
            if (entries.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {ADD_ON_CATEGORY_LABELS[category]}
                </h3>
                <div className="grid gap-2">
                  {entries.map((entry) => (
                    <AddOnCard
                      key={entry.code}
                      entry={entry}
                      selected={selectedAddOns.some((a) => a.code === entry.code)}
                      onToggle={() => toggleAddOn(entry.code)}
                      notionalCents={settlement.notionalCents}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Breakdown */}
      {displayQuote && (
        <div className="card-base p-5" data-tour="fee-lineitems">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Fee Breakdown
            </h2>
            {frozenQuote && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)]">
                <Lock className="h-3 w-3" />
                Frozen
              </span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left pb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Item
                </th>
                <th className="text-right pb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-right pb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {displayQuote.lineItems.map((item) => (
                <tr
                  key={item.code}
                  className="border-b border-[var(--border-primary)] last:border-0"
                >
                  <td className="py-2.5 text-[var(--text-primary)]">
                    {item.label}
                    {item.metadata.percentBps !== undefined && (
                      <span className="text-xs text-[var(--text-secondary)] ml-2">
                        ({formatBpsPercent(item.metadata.percentBps)})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.type === "vendor_pass_through"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]"
                      }`}
                    >
                      {item.type === "vendor_pass_through"
                        ? "Vendor"
                        : "Platform"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-[var(--text-primary)]">
                    {formatCentsUsd(item.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-primary)]">
                <td
                  colSpan={2}
                  className="pt-3 text-sm font-semibold text-[var(--text-primary)]"
                >
                  Total Due
                </td>
                <td className="pt-3 text-right font-mono text-lg font-bold text-[var(--gold)]">
                  {formatCentsUsd(displayQuote.totalDueCents)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Subtotals */}
          <div className="mt-3 pt-3 border-t border-[var(--border-primary)] grid grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
            <div>
              <p className="uppercase tracking-wider mb-0.5">Indemnification</p>
              <p className="font-mono font-medium text-[var(--text-primary)]">
                {formatCentsUsd(displayQuote.coreIndemnificationFeeCents)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider mb-0.5">Add-Ons</p>
              <p className="font-mono font-medium text-[var(--text-primary)]">
                {formatCentsUsd(displayQuote.addOnFeesCents)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider mb-0.5">Vendor</p>
              <p className="font-mono font-medium text-[var(--text-primary)]">
                {formatCentsUsd(displayQuote.vendorPassThroughCents)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Approval Notice */}
      {requiresApproval && !isPaid && (
        <div className="card-base p-4 border-l-4 border-l-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Manual Approval Required
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                One or more selected services require OPS/Compliance sign-off.
                After payment, activation will be held until approval is granted.
              </p>
              <ContactSupportInline compact className="mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* Payment CTA */}
      {!isPaid && (
        <div className="card-base p-5" data-tour="pay-activate-button">
          <button
            onClick={() => setPaymentModalOpen(true)}
            disabled={processing}
            className="w-full py-3 px-6 rounded-lg bg-[var(--gold)] text-[var(--bg-primary)] font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Pay & Activate Clearing
              </>
            )}
          </button>
          <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
            {displayQuote
              ? `Total: ${formatCentsUsd(displayQuote.totalDueCents)}`
              : "Configure services above to calculate fees"}
          </p>
        </div>
      )}

      {/* Receipt */}
      {isPaid && settlement.paymentReceipt && (
        <div className="card-base p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Payment Receipt
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                Reference
              </p>
              <p className="font-mono font-medium text-[var(--text-primary)] mt-0.5">
                {settlement.paymentReceipt.reference}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                Method
              </p>
              <p className="font-medium text-[var(--text-primary)] mt-0.5">
                {settlement.paymentMethod?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                Paid At
              </p>
              <p className="font-medium text-[var(--text-primary)] mt-0.5">
                {new Date(settlement.paymentReceipt.paidAtUtc).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                Status
              </p>
              <p className="font-medium text-emerald-400 mt-0.5">Paid</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
            <ContactSupportInline compact />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          totalCents={displayQuote?.totalDueCents ?? 0}
          onSelectMethod={handlePayment}
          onClose={() => setPaymentModalOpen(false)}
          processing={processing}
        />
      )}
    </div>
  );
}

/* ================================================================
   Sub-Components
   ================================================================ */

function ActivationStatusBanner({
  activationStatus,
  paymentStatus,
  approvalStatus,
  requiresManualApproval,
  paymentReceipt,
}: {
  activationStatus: string;
  paymentStatus: string;
  approvalStatus: string;
  requiresManualApproval: boolean;
  paymentReceipt?: { reference: string } | null;
}) {
  if (activationStatus === "activated") {
    return (
      <div className="card-base p-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Clearing Activated
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              All gates satisfied — settlement actions unlocked
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === "paid" && approvalStatus === "pending") {
    return (
      <div className="card-base p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              Manual Approval Pending
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Payment received — awaiting OPS/Compliance approval for selected
              services
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="card-base p-4 border-l-4 border-l-red-500">
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              Approval Rejected
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Contact Operations to resolve — clearing remains blocked
            </p>
            <ContactSupportInline compact className="mt-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4 border-l-4 border-l-[var(--gold)]">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-[var(--gold)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--gold)]">
            {activationStatus === "draft"
              ? "Configuration Required"
              : "Payment Required"}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {activationStatus === "draft"
              ? "Configure services and pay the indemnification fee to activate clearing"
              : "Complete payment to activate clearing and unlock settlement actions"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AddOnCard({
  entry,
  selected,
  onToggle,
  notionalCents,
}: {
  entry: AddOnCatalogEntry;
  selected: boolean;
  onToggle: () => void;
  notionalCents: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Estimate fee for display
  const estimatedFee = useMemo(() => {
    switch (entry.pricingModel) {
      case "flat":
        return formatCentsUsd(entry.defaultFlatCents ?? 0);
      case "percent": {
        const bps = entry.defaultBps ?? 0;
        const raw = Math.round((notionalCents * bps) / 10_000);
        const min = entry.defaultMinCents ?? 0;
        const max = entry.defaultMaxCents ?? Number.MAX_SAFE_INTEGER;
        const clamped = Math.min(Math.max(raw, min), max);
        return formatCentsUsd(clamped);
      }
      case "pass_through_plus_fee":
        return `${formatCentsUsd(entry.defaultPlatformFeeFlatCents ?? 0)} + vendor`;
      default:
        return "—";
    }
  }, [entry, notionalCents]);

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/5"
          : "border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]"
      }`}
    >
      <div
        className="flex items-center gap-3 p-3.5"
        onClick={onToggle}
      >
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? "border-[var(--gold)] bg-[var(--gold)]"
              : "border-[var(--border-secondary)] bg-transparent"
          }`}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5 text-[var(--bg-primary)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {entry.label}
            </span>
            {entry.requiresManualApproval && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Approval
              </span>
            )}
            {entry.affectsRisk && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Risk
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
            {entry.description.whatItDoes}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-medium text-[var(--text-primary)]">
            {estimatedFee}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] capitalize">
            {entry.pricingModel.replace(/_/g, " ")}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <Minus className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          ) : (
            <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2 text-xs border-t border-[var(--border-primary)] mt-0">
          <div className="pt-2 space-y-1.5">
            <div>
              <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                What it does:
              </span>
              <p className="text-[var(--text-primary)] mt-0.5">
                {entry.description.whatItDoes}
              </p>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                When you need it:
              </span>
              <p className="text-[var(--text-primary)] mt-0.5">
                {entry.description.whenYouNeedIt}
              </p>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Pricing:
              </span>
              <p className="text-[var(--text-primary)] mt-0.5">
                {entry.description.pricingExplainer}
              </p>
            </div>
            {entry.description.operationalNotes && (
              <div>
                <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Notes:
                </span>
                <p className="text-[var(--text-primary)] mt-0.5">
                  {entry.description.operationalNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({
  totalCents,
  onSelectMethod,
  onClose,
  processing,
}: {
  totalCents: number;
  onSelectMethod: (method: "mock_card" | "wire_mock" | "invoice_mock") => void;
  onClose: () => void;
  processing: boolean;
}) {
  const methods = [
    {
      key: "mock_card" as const,
      icon: CreditCard,
      label: "Card Payment",
      description: "Authorize → Capture (mock)",
      detail: "Processed instantly in demo mode",
    },
    {
      key: "wire_mock" as const,
      icon: Building2,
      label: "Wire Transfer",
      description: "Bank wire instructions (mock)",
      detail: "Wire instructions provided, mark as received",
    },
    {
      key: "invoice_mock" as const,
      icon: FileText,
      label: "Invoice",
      description: "Net-30 invoice (mock)",
      detail: "Invoice reference generated, mark as paid",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!processing ? onClose : undefined}
      />
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Payment Method
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Select a method to pay{" "}
                <span className="font-mono font-semibold text-[var(--gold)]">
                  {formatCentsUsd(totalCents)}
                </span>
              </p>
            </div>
            <button
              onClick={!processing ? onClose : undefined}
              className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
              disabled={processing}
            >
              <XCircle className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="space-y-3">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => onSelectMethod(m.key)}
                disabled={processing}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <m.icon className="h-5 w-5 text-[var(--gold)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {m.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {m.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {processing && (
            <div className="flex items-center justify-center gap-2 mt-6 py-3 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--gold)]" />
              <span className="text-sm font-medium text-[var(--gold)]">
                Processing payment…
              </span>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[var(--border-primary)]">
            <ContactSupportInline compact />
            <p className="text-[10px] text-[var(--text-secondary)] mt-2">
              This is a mock payment for demo purposes. No real charges will be
              made.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
