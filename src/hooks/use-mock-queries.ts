"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  mockFetch,
  getListings,
  getListing,
  getListingInventory,
  getMyReservations,
  createReservation,
  convertReservationToOrder,
  getMyOrders,
  getOrder,
} from "@/lib/api";
import {
  mockMetrics,
  mockCounterparties,
  mockTransactions,
  mockCorridors,
  mockHubs,
  mockLabs,
  mockClaims,
  mockReinsurance,
  mockPolicies,
  mockRoles,
  mockTimeline,
  mockAuditEvents,
  mockEvidence,
  type Metric,
  type Counterparty,
  type Transaction,
  type Corridor,
  type Hub,
  type Lab,
  type Claim,
  type ReinsuranceTreaty,
  type Policy,
  type Role,
  type TimelineEvent,
  type AuditEvent,
  type EvidenceItem,
  type DashboardScenario,
  type DashboardData,
  type Listing,
  type InventoryPosition,
  type Reservation,
  type Order,
  getMockDashboardData,
} from "@/lib/mock-data";

/* ================================================================
   Existing hooks — unchanged
   TODO: WIRE_TO_LIVE_API — The hooks below read from mock-data.ts fixtures.
   These data points (metrics, counterparties, transactions, corridors,
   hubs, labs, claims, reinsurance, policies, roles, timeline, audit events,
   evidence, dashboard scenarios) have NO corresponding PostgreSQL tables.
   A separate phase is required to build the full risk/capital API surface.
   Until then, these remain as institutional visual fixtures.
   ================================================================ */

export function useMetrics() {
  return useQuery<Metric[]>({
    queryKey: ["metrics"],
    queryFn: () => mockFetch(mockMetrics),
  });
}

export function useCounterparties() {
  return useQuery<Counterparty[]>({
    queryKey: ["counterparties"],
    queryFn: () => mockFetch(mockCounterparties),
  });
}

export function useCounterparty(id: string) {
  return useQuery<Counterparty | undefined>({
    queryKey: ["counterparty", id],
    queryFn: async () => {
      const data = await mockFetch(mockCounterparties);
      return data.find((c) => c.id === id);
    },
    enabled: !!id,
  });
}

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => mockFetch(mockTransactions),
  });
}

export function useTransaction(id: string) {
  return useQuery<Transaction | undefined>({
    queryKey: ["transaction", id],
    queryFn: async () => {
      const data = await mockFetch(mockTransactions);
      return data.find((t) => t.id === id);
    },
    enabled: !!id,
  });
}

export function useCorridors() {
  return useQuery<Corridor[]>({
    queryKey: ["corridors"],
    queryFn: () => mockFetch(mockCorridors),
  });
}

export function useHubs() {
  return useQuery<Hub[]>({
    queryKey: ["hubs"],
    queryFn: () => mockFetch(mockHubs),
  });
}

export function useLabs() {
  return useQuery<Lab[]>({
    queryKey: ["labs"],
    queryFn: () => mockFetch(mockLabs),
  });
}

export function useClaims() {
  return useQuery<Claim[]>({
    queryKey: ["claims"],
    queryFn: () => mockFetch(mockClaims),
  });
}

export function useClaim(id: string) {
  return useQuery<Claim | undefined>({
    queryKey: ["claim", id],
    queryFn: async () => {
      const data = await mockFetch(mockClaims);
      return data.find((c) => c.id === id);
    },
    enabled: !!id,
  });
}

export function useReinsurance() {
  return useQuery<ReinsuranceTreaty[]>({
    queryKey: ["reinsurance"],
    queryFn: () => mockFetch(mockReinsurance),
  });
}

export function usePolicies() {
  return useQuery<Policy[]>({
    queryKey: ["policies"],
    queryFn: () => mockFetch(mockPolicies),
  });
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => mockFetch(mockRoles),
  });
}

export function useTimeline() {
  return useQuery<TimelineEvent[]>({
    queryKey: ["timeline"],
    queryFn: () => mockFetch(mockTimeline),
  });
}

export function useAuditEvents() {
  return useQuery<AuditEvent[]>({
    queryKey: ["audit-events"],
    queryFn: () => mockFetch(mockAuditEvents),
  });
}

export function useEvidence() {
  return useQuery<EvidenceItem[]>({
    queryKey: ["evidence"],
    queryFn: () => mockFetch(mockEvidence),
  });
}

// Keep backward compat
export function useTableData() {
  return useCounterparties();
}

/* TODO: WIRE_TO_LIVE_API — useDashboardData reads from getMockDashboardData().
   Capital adequacy, TRI bands, risk distribution, evidence health, and WORM
   storage data exist only as fixtures in mock-data.ts. No PostgreSQL tables. */
export function useDashboardData(scenario: DashboardScenario = "phase1") {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", scenario],
    queryFn: () => mockFetch(getMockDashboardData(scenario)),
  });
}

/* ================================================================
   Live PostgreSQL hooks — Identity Perimeter
   ================================================================
   These hooks query live API routes backed by PostgreSQL,
   NOT mock data. They are the first hooks to cross the
   mock → live boundary.
   ================================================================ */

export type KycStatusValue = "PENDING" | "APPROVED" | "ELEVATED" | "REJECTED";

interface KycStatusResponse {
  kycStatus: KycStatusValue;
  source: "postgresql" | "fallback";
  reason?: string;
}

/**
 * Fetch the live `kyc_status` for a user from PostgreSQL.
 * Falls back to PENDING if DB is unreachable (graceful degradation).
 * 30s staleTime — KYC status rarely changes mid-session.
 */
export function useKycStatus(userId: string | null | undefined) {
  return useQuery<KycStatusResponse>({
    queryKey: ["kyc-status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/user/kyc-status?userId=${encodeURIComponent(userId!)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000, // 30s cache — KYC status changes infrequently
  });
}

/* ================================================================
   Marketplace hooks
   ================================================================ */

export function useListings() {
  return useQuery<Listing[]>({
    queryKey: ["listings"],
    queryFn: () => getListings(),
  });
}

export function useListing(id: string) {
  return useQuery<Listing | undefined>({
    queryKey: ["listing", id],
    queryFn: () => getListing(id),
    enabled: !!id,
  });
}

export function useListingInventory(listingId: string) {
  return useQuery<InventoryPosition | undefined>({
    queryKey: ["listing-inventory", listingId],
    queryFn: () => getListingInventory(listingId),
    enabled: !!listingId,
  });
}

export function useMyReservations(userId: string) {
  return useQuery<Reservation[]>({
    queryKey: ["my-reservations", userId],
    queryFn: () => getMyReservations(userId),
    enabled: !!userId,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { listingId: string; userId: string; weightOz: number }) =>
      createReservation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}

export function useConvertReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reservationId: string; userId: string; policySnapshot: import("@/lib/policy-engine").MarketplacePolicySnapshot }) =>
      convertReservationToOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

export function useMyOrders(userId: string) {
  return useQuery<Order[]>({
    queryKey: ["my-orders", userId],
    queryFn: () => getMyOrders(userId),
    enabled: !!userId,
  });
}

export function useOrder(id: string) {
  return useQuery<Order | undefined>({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
}

/* ================================================================
   Seller-side hooks — listing creation, evidence, publish gate
   ================================================================ */

import type { ListingEvidenceItem, ListingEvidenceType } from "@/lib/mock-data";
import type { GateResult } from "@/lib/marketplace-engine";
import {
  getMyListings,
  getListingEvidence,
  apiCreateDraftListing,
  apiUpdateDraftListing,
  apiCreateListingEvidence,
  apiPublishListing,
  apiRunPublishGate,
} from "@/lib/api";

export function useMyListings(userId: string) {
  return useQuery<Listing[]>({
    queryKey: ["my-listings", userId],
    queryFn: () => getMyListings(userId),
    enabled: !!userId,
  });
}

export function useListingEvidenceItems(listingId: string) {
  return useQuery<ListingEvidenceItem[]>({
    queryKey: ["listing-evidence", listingId],
    queryFn: () => getListingEvidence(listingId),
    enabled: !!listingId,
  });
}

export function useCreateDraftListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      form: "bar" | "coin";
      purity: "995" | "999" | "9999";
      totalWeightOz: number;
      pricePerOz: number;
      vaultHubId: string;
      vaultName: string;
      jurisdiction: string;
      sellerUserId: string;
      sellerOrgId: string;
      sellerName: string;
    }) => apiCreateDraftListing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useUpdateDraftListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listingId: string;
      patch: Partial<Omit<Listing, "id" | "status" | "createdAt" | "publishedAt">>;
    }) => apiUpdateDraftListing(input.listingId, input.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
    },
  });
}

export function useCreateListingEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listingId: string;
      evidenceType: ListingEvidenceType;
      userId: string;
    }) => apiCreateListingEvidence(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listing-evidence", variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing", variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["publish-gate"] });
    },
  });
}

export function usePublishListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { listingId: string; userId: string }) =>
      apiPublishListing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      queryClient.invalidateQueries({ queryKey: ["listing-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["publish-gate"] });
    },
  });
}

export function usePublishGate(listingId: string, userId: string) {
  return useQuery<GateResult>({
    queryKey: ["publish-gate", listingId, userId],
    queryFn: () => apiRunPublishGate({ listingId, userId }),
    enabled: !!listingId && !!userId,
  });
}

/* ================================================================
   Verification hooks — deterministic, localStorage-backed
   ================================================================ */

import type { VerificationCase, VerificationTrack } from "@/lib/mock-data";
import {
  getVerificationCase,
  initCase,
  submitStep,
} from "@/lib/verification-engine";

export function useVerificationCase(userId: string | null) {
  return useQuery<VerificationCase | null>({
    queryKey: ["verification-case", userId],
    queryFn: () => {
      if (!userId) return null;
      return getVerificationCase(userId);
    },
    enabled: !!userId,
    // Auto-poll every 2s when any step is in PROCESSING state
    refetchInterval: (query) => {
      const vc = query.state.data;
      if (vc?.steps.some((s) => s.status === "PROCESSING")) return 2000;
      return false;
    },
  });
}

export function useInitVerification() {
  const queryClient = useQueryClient();
  return useMutation<VerificationCase, Error, { track: VerificationTrack; userId: string; orgId: string }>({
    mutationFn: async ({ track, userId, orgId }) => {
      return initCase(track, userId, orgId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["verification-case", variables.userId] });
    },
  });
}

export function useSubmitVerificationStep() {
  const queryClient = useQueryClient();
  return useMutation<VerificationCase, Error, { existingCase: VerificationCase; stepId: string; orgId: string; orgType: "individual" | "company" }>({
    mutationFn: async ({ existingCase, stepId, orgId, orgType }) => {
      return submitStep(existingCase, stepId, orgId, orgType);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-case", data.userId] });
    },
  });
}

/**
 * Schedule a simulated provider webhook callback via the demo trigger API.
 * Fires POST /api/internal/simulate-verification with configurable delay.
 */
export function useScheduleDemoWebhook() {
  return useMutation<
    { scheduled: boolean; webhookId?: string; delayMs?: number },
    Error,
    { userId: string; stepId: string; orgId: string; orgType: "individual" | "company"; delayMs?: number }
  >({
    mutationFn: async (input) => {
      const res = await fetch("/api/internal/simulate-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

/* ================================================================
   Settlement hooks — deterministic, localStorage-backed
   ================================================================ */

import type { SettlementCase, LedgerEntry, UserRole } from "@/lib/mock-data";
import type { SettlementActionPayload } from "@/lib/settlement-engine";
import {
  getSettlements,
  getSettlement,
  getSettlementLedger,
  getSettlementByOrderId,
  apiOpenSettlementFromOrder,
  apiApplySettlementAction,
  apiExportSettlementPacket,
} from "@/lib/api";
import { notifyPartiesOfSettlement } from "@/actions/notifications";
import { triggerSettlementPayouts } from "@/actions/banking";

/* ---------- Placeholder contact data for demo users ---------- */
const DEMO_CONTACTS: Record<string, { email: string; phone: string }> = {
  "user-1": { email: "buyer@aurumshield.vip", phone: "+15551000001" },
  "user-2": { email: "ops@aurumshield.vip", phone: "+15551000002" },
  "user-3": { email: "seller@aurumshield.vip", phone: "+15551000003" },
  "user-4": { email: "compliance@aurumshield.vip", phone: "+15551000004" },
  "user-5": { email: "treasury@aurumshield.vip", phone: "+15551000005" },
};
const DEFAULT_CONTACT = { email: "unknown@aurumshield.vip", phone: "+15550000000" };

/* ---------- Demo banking constants (cents) ---------- */
/** Placeholder Modern Treasury external account ID for demo sellers */
const DEMO_SELLER_EXTERNAL_ACCOUNT_ID = "demo-ext-acct-seller-001";
/** Demo notional settlement value: $5,000.00 = 500_000 cents */
const DEMO_SETTLEMENT_AMOUNT_CENTS = 500_000_00;
/** Demo platform fee (2.5%): $125.00 = 12_500 cents */
const DEMO_PLATFORM_FEE_CENTS = 12_500_00;

export function useSettlements() {
  return useQuery<SettlementCase[]>({
    queryKey: ["settlements"],
    queryFn: () => getSettlements(),
  });
}

export function useSettlement(id: string) {
  return useQuery<SettlementCase | undefined>({
    queryKey: ["settlement", id],
    queryFn: () => getSettlement(id),
    enabled: !!id,
  });
}

export function useSettlementLedger(settlementId: string) {
  return useQuery<LedgerEntry[]>({
    queryKey: ["settlement-ledger", settlementId],
    queryFn: () => getSettlementLedger(settlementId),
    enabled: !!settlementId,
  });
}

export function useSettlementByOrder(orderId: string) {
  return useQuery<SettlementCase | undefined>({
    queryKey: ["settlement-by-order", orderId],
    queryFn: () => getSettlementByOrderId(orderId),
    enabled: !!orderId,
  });
}

export function useOpenSettlementFromOrder() {
  const queryClient = useQueryClient();
  return useMutation<SettlementCase, Error, { orderId: string; actorRole: UserRole; actorUserId: string }>({
    mutationFn: async ({ orderId, actorRole, actorUserId }) => {
      return apiOpenSettlementFromOrder({ orderId, now: new Date().toISOString(), actorRole, actorUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

export function useApplySettlementAction() {
  const queryClient = useQueryClient();
  return useMutation<
    { settlement: SettlementCase; ledgerEntries: LedgerEntry[] },
    Error,
    { settlementId: string; payload: SettlementActionPayload }
  >({
    mutationFn: async ({ settlementId, payload }) => {
      return apiApplySettlementAction({
        settlementId,
        payload,
        now: new Date().toISOString(),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-by-settlement"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });

      toast.success("Action Executed", {
        description: "The settlement state has been successfully updated.",
      });

      // ── Notify buyer & seller when settlement reaches SETTLED ──
      if (data.settlement.status === "SETTLED") {
        const buyer = DEMO_CONTACTS[data.settlement.buyerUserId] ?? DEFAULT_CONTACT;
        const seller = DEMO_CONTACTS[data.settlement.sellerUserId] ?? DEFAULT_CONTACT;

        // Fire-and-forget — server action runs on the server, no secrets exposed
        notifyPartiesOfSettlement(
          buyer.email,
          seller.email,
          buyer.phone,
          seller.phone,
          data.settlement.id,
        ).catch((err) => {
          console.error("[AurumShield] Settlement notification failed:", err);
        });

        // ── Trigger Modern Treasury outbound payouts ──
        // Fire-and-forget — server action, no secrets exposed to client
        // TODO: Replace demo constants with real settlement amounts / seller
        //       external account IDs from the settlement data model once
        //       the database is provisioned.
        triggerSettlementPayouts(
          data.settlement.id,
          DEMO_SELLER_EXTERNAL_ACCOUNT_ID,
          DEMO_SETTLEMENT_AMOUNT_CENTS,
          DEMO_PLATFORM_FEE_CENTS,
        ).catch((err) => {
          console.error("[AurumShield] Settlement banking payout failed:", err);
        });
      }
    },
    onError: () => {
      toast.error("Execution Failed", {
        description:
          "There was an error processing this action. Please try again or contact support.",
      });
    },
  });
}

export function useExportSettlementPacket() {
  return useMutation<
    { exported: boolean; packet: { settlement: SettlementCase; ledger: LedgerEntry[] } | null },
    Error,
    { settlementId: string }
  >({
    mutationFn: async ({ settlementId }) => {
      return apiExportSettlementPacket(settlementId);
    },
  });
}

/* ================================================================
   Certificate hooks — deterministic, localStorage-backed
   ================================================================ */

import type { ClearingCertificate } from "@/lib/certificate-engine";
import {
  apiGetCertificates,
  apiGetCertificate,
  apiGetCertificateBySettlement,
} from "@/lib/api";

export function useCertificates() {
  return useQuery<ClearingCertificate[]>({
    queryKey: ["certificates"],
    queryFn: () => apiGetCertificates(),
  });
}

export function useCertificate(id: string) {
  return useQuery<ClearingCertificate | undefined>({
    queryKey: ["certificate", id],
    queryFn: () => apiGetCertificate(id),
    enabled: !!id,
  });
}

export function useCertificateBySettlement(settlementId: string) {
  return useQuery<ClearingCertificate | undefined>({
    queryKey: ["certificate-by-settlement", settlementId],
    queryFn: () => apiGetCertificateBySettlement(settlementId),
    enabled: !!settlementId,
  });
}

/* ================================================================
   Fee & Activation hooks
   ================================================================ */

import type { PricingConfig, SelectedAddOn, FeeQuote } from "@/lib/fees/fee-engine";
import { computeFeeQuote as engineComputeFeeQuote } from "@/lib/fees/fee-engine";
import { loadPricingConfig as loadConfig } from "@/lib/fees/pricing-store";
import {
  apiGetPricingConfig,
  apiSavePricingConfig,
  apiSelectAddOns,
  apiProcessPayment,
  apiApproveManualReview,
  apiRejectManualReview,
  apiRecalculateFeeQuote,
} from "@/lib/api";

export function usePricingConfig() {
  return useQuery<PricingConfig>({
    queryKey: ["pricing-config"],
    queryFn: () => apiGetPricingConfig(),
  });
}

export function useSavePricingConfig() {
  const queryClient = useQueryClient();
  return useMutation<PricingConfig, Error, PricingConfig>({
    mutationFn: (config) => apiSavePricingConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-config"] });
    },
  });
}

/**
 * Direct fee computation hook — computes fee quote locally via engine import.
 * Does NOT hit the mock API — per revision #2 (avoid pseudo-API indirection).
 */
export function useComputeFeeQuote(
  notionalCents: number,
  selectedAddOns: SelectedAddOn[],
  enabled = true,
) {
  return useQuery({
    queryKey: ["compute-fee-quote", notionalCents, selectedAddOns],
    queryFn: () => {
      const config = loadConfig();
      const now = new Date().toISOString();
      return engineComputeFeeQuote({ notionalCents, selectedAddOns, config, now });
    },
    enabled,
  });
}

export function useSelectAddOns() {
  const queryClient = useQueryClient();
  return useMutation<
    { settlement: SettlementCase; feeQuote: FeeQuote },
    Error,
    { settlementId: string; addOns: SelectedAddOn[] }
  >({
    mutationFn: ({ settlementId, addOns }) =>
      apiSelectAddOns({ settlementId, addOns, now: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["compute-fee-quote"] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();
  return useMutation<
    { settlement: SettlementCase; activated: boolean },
    Error,
    { settlementId: string; method: "mock_card" | "wire_mock" | "invoice_mock"; actorUserId: string }
  >({
    mutationFn: ({ settlementId, method, actorUserId }) =>
      apiProcessPayment({ settlementId, method, now: new Date().toISOString(), actorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
    },
  });
}

export function useApproveManualReview() {
  const queryClient = useQueryClient();
  return useMutation<
    { settlement: SettlementCase; activated: boolean },
    Error,
    { settlementId: string; actorRole: UserRole; actorUserId: string }
  >({
    mutationFn: ({ settlementId, actorRole, actorUserId }) =>
      apiApproveManualReview({ settlementId, now: new Date().toISOString(), actorRole, actorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
    },
  });
}

export function useRejectManualReview() {
  const queryClient = useQueryClient();
  return useMutation<
    SettlementCase,
    Error,
    { settlementId: string; reason: string; actorRole: UserRole; actorUserId: string }
  >({
    mutationFn: ({ settlementId, reason, actorRole, actorUserId }) =>
      apiRejectManualReview({ settlementId, reason, now: new Date().toISOString(), actorRole, actorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
    },
  });
}

export function useRecalculateFeeQuote() {
  const queryClient = useQueryClient();
  return useMutation<
    { settlement: SettlementCase; feeQuote: FeeQuote },
    Error,
    { settlementId: string }
  >({
    mutationFn: ({ settlementId }) =>
      apiRecalculateFeeQuote({ settlementId, now: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
  });
}

/* ================================================================
   Governance Audit hooks
   ================================================================ */

import type { GovernanceAuditEvent } from "@/lib/mock-data";
import type { AuditEventFilters, LedgerIndexEntry, ReceiptIndexEntry } from "@/lib/api";
import {
  apiGetAuditEvents,
  apiGetAuditEvent,
  apiExportAuditCSV,
  apiExportAuditPacket,
  apiGetLedgerIndex,
  apiGetReceiptIndex,
} from "@/lib/api";
import type { AuditResourceType } from "@/lib/mock-data";

export function useGovernanceAuditEvents(filters: AuditEventFilters = {}) {
  return useQuery<GovernanceAuditEvent[]>({
    queryKey: ["governance-audit-events", filters],
    queryFn: () => apiGetAuditEvents(filters),
  });
}

export function useGovernanceAuditEvent(id: string) {
  return useQuery<GovernanceAuditEvent | undefined>({
    queryKey: ["governance-audit-event", id],
    queryFn: () => apiGetAuditEvent(id),
    enabled: !!id,
  });
}

export function useLedgerIndex() {
  return useQuery<LedgerIndexEntry[]>({
    queryKey: ["ledger-index"],
    queryFn: () => apiGetLedgerIndex(),
  });
}

export function useReceiptIndex() {
  return useQuery<ReceiptIndexEntry[]>({
    queryKey: ["receipt-index"],
    queryFn: () => apiGetReceiptIndex(),
  });
}

export function useExportAuditCSV() {
  return useMutation<
    { csv: string; count: number },
    Error,
    { filters: AuditEventFilters }
  >({
    mutationFn: async ({ filters }) => {
      return apiExportAuditCSV(filters);
    },
  });
}

export function useExportAuditPacket() {
  return useMutation<
    { events: GovernanceAuditEvent[]; exported: boolean },
    Error,
    { resourceType: AuditResourceType; resourceId: string }
  >({
    mutationFn: async ({ resourceType, resourceId }) => {
      return apiExportAuditPacket(resourceType, resourceId);
    },
  });
}

/* ================================================================
   Intraday Capital hooks
   ================================================================ */

import type { IntradayCapitalSnapshot } from "@/lib/capital-engine";
import type { BreachEvent } from "@/lib/breach-store";
import {
  apiGetIntradayCapitalSnapshot,
  apiGetBreachEvents,
  apiRunBreachSweep,
  apiExportIntradayPacket,
} from "@/lib/api";

/* TODO: WIRE_TO_LIVE_API — useIntradayCapital reads from apiGetIntradayCapitalSnapshot()
   which resolves from capital-engine.ts localStorage state, not PostgreSQL. */
export function useIntradayCapital() {
  return useQuery<IntradayCapitalSnapshot>({
    queryKey: ["intraday-capital"],
    queryFn: () => apiGetIntradayCapitalSnapshot(),
  });
}

export function useBreachEvents() {
  return useQuery<BreachEvent[]>({
    queryKey: ["breach-events"],
    queryFn: () => apiGetBreachEvents(),
  });
}

export function useRunBreachSweep() {
  const queryClient = useQueryClient();
  return useMutation<
    { snapshot: IntradayCapitalSnapshot; newEvents: BreachEvent[]; allEvents: BreachEvent[] },
    Error,
    void
  >({
    mutationFn: async () => {
      return apiRunBreachSweep();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intraday-capital"] });
      queryClient.invalidateQueries({ queryKey: ["breach-events"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
    },
  });
}

export function useExportIntradayPacket() {
  return useMutation<
    {
      exported: boolean;
      packet: {
        packetVersion: number;
        generatedAt: string;
        intradaySnapshot: IntradayCapitalSnapshot;
        breachEvents: BreachEvent[];
        topDrivers: IntradayCapitalSnapshot["topDrivers"];
        auditEventIds: string[];
      };
    },
    Error,
    void
  >({
    mutationFn: async () => {
      return apiExportIntradayPacket();
    },
  });
}

/* ================================================================
   Capital Controls hooks
   ================================================================ */

import type { CapitalControlDecision, ControlActionKey } from "@/lib/capital-controls";
import type { CapitalOverride, OverrideScope } from "@/lib/override-store";
import {
  apiGetCapitalControls,
  apiGetCapitalOverrides,
  apiCreateCapitalOverride,
  apiRevokeCapitalOverride,
  apiRunCapitalControlsSweep,
  apiExportCapitalControlsPacket,
} from "@/lib/api";

/* TODO: WIRE_TO_LIVE_API — useCapitalControls reads from apiGetCapitalControls()
   which resolves from capital-controls localStorage engine, not PostgreSQL. */
export function useCapitalControls() {
  return useQuery<CapitalControlDecision>({
    queryKey: ["capital-controls"],
    queryFn: () => apiGetCapitalControls(),
  });
}

export function useCapitalOverrides() {
  return useQuery<CapitalOverride[]>({
    queryKey: ["capital-overrides"],
    queryFn: () => apiGetCapitalOverrides(),
  });
}

export function useCreateCapitalOverride() {
  const queryClient = useQueryClient();
  return useMutation<
    { override: CapitalOverride; isNew: boolean },
    Error,
    {
      scope: OverrideScope;
      actionKey: ControlActionKey | null;
      reason: string;
      expiresAt: string;
      actorRole: UserRole;
      actorUserId: string;
      actorName: string;
    }
  >({
    mutationFn: async (input) => {
      return apiCreateCapitalOverride(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-controls"] });
      queryClient.invalidateQueries({ queryKey: ["capital-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
    },
  });
}

export function useRevokeCapitalOverride() {
  const queryClient = useQueryClient();
  return useMutation<
    CapitalOverride | null,
    Error,
    { overrideId: string; actorRole: UserRole; actorUserId: string }
  >({
    mutationFn: async (input) => {
      return apiRevokeCapitalOverride(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-controls"] });
      queryClient.invalidateQueries({ queryKey: ["capital-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
    },
  });
}

export function useRunCapitalControlsSweep() {
  const queryClient = useQueryClient();
  return useMutation<
    {
      decision: CapitalControlDecision;
      overrides: CapitalOverride[];
      previousMode: string | null;
    },
    Error,
    void
  >({
    mutationFn: async () => {
      return apiRunCapitalControlsSweep();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-controls"] });
      queryClient.invalidateQueries({ queryKey: ["capital-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["intraday-capital"] });
      queryClient.invalidateQueries({ queryKey: ["breach-events"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
    },
  });
}

export function useExportCapitalControlsPacket() {
  return useMutation<
    {
      exported: boolean;
      packet: {
        packetVersion: number;
        generatedAt: string;
        snapshot: IntradayCapitalSnapshot;
        breachEvents: BreachEvent[];
        controlDecision: CapitalControlDecision;
        overrides: CapitalOverride[];
        auditEventIds: string[];
      };
    },
    Error,
    void
  >({
    mutationFn: async () => {
      return apiExportCapitalControlsPacket();
    },
  });
}

