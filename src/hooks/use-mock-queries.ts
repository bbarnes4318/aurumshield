"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useDashboardData(scenario: DashboardScenario = "phase1") {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", scenario],
    queryFn: () => mockFetch(getMockDashboardData(scenario)),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-by-settlement"] });
      queryClient.invalidateQueries({ queryKey: ["governance-audit-events"] });
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

