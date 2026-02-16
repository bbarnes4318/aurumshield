"use client";

import { useQuery } from "@tanstack/react-query";
import { mockFetch } from "@/lib/api";
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
  getMockDashboardData,
} from "@/lib/mock-data";

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
