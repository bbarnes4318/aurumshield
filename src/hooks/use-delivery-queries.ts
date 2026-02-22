"use client";

/* ================================================================
   DELIVERY QUERY HOOKS — TanStack Query wrappers
   for delivery rate quoting, preferences, and shipment tracking.
   ================================================================ */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetDeliveryRate,
  apiSubmitDeliveryPreference,
  apiGetDeliveryPreference,
  apiGetShipmentForSettlement,
  apiCreateShipment,
  apiAdvanceShipment,
} from "@/lib/api";
import type {
  DeliveryAddress,
  DeliveryMethod,
  DeliveryRateQuote,
} from "@/lib/delivery/delivery-types";

/* ---------- Query Keys ---------- */

export const deliveryKeys = {
  all: ["delivery"] as const,
  rate: (address: DeliveryAddress | null, weightOz: number, notionalUsd: number) =>
    [...deliveryKeys.all, "rate", address, weightOz, notionalUsd] as const,
  preference: (settlementId: string) =>
    [...deliveryKeys.all, "preference", settlementId] as const,
  shipment: (settlementId: string) =>
    [...deliveryKeys.all, "shipment", settlementId] as const,
};

/* ---------- Rate Quote ---------- */

export function useDeliveryRate(
  address: DeliveryAddress | null,
  weightOz: number,
  notionalUsd: number,
) {
  return useQuery({
    queryKey: deliveryKeys.rate(address, weightOz, notionalUsd),
    queryFn: () =>
      apiGetDeliveryRate({
        address: address!,
        weightOz,
        notionalUsd,
      }),
    enabled: !!address && weightOz > 0 && notionalUsd > 0,
    staleTime: 30 * 60 * 1000, // 30 min — rate quotes are valid for 30 min
  });
}

/* ---------- Delivery Preference ---------- */

export function useDeliveryPreference(settlementId: string | null) {
  return useQuery({
    queryKey: deliveryKeys.preference(settlementId ?? ""),
    queryFn: () => apiGetDeliveryPreference(settlementId!),
    enabled: !!settlementId,
  });
}

export function useSubmitDeliveryPreference() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      settlementId: string;
      method: DeliveryMethod;
      address?: DeliveryAddress;
      rateQuote?: DeliveryRateQuote;
    }) => apiSubmitDeliveryPreference(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: deliveryKeys.preference(variables.settlementId),
      });
    },
  });
}

/* ---------- Shipment ---------- */

export function useShipment(settlementId: string | null) {
  return useQuery({
    queryKey: deliveryKeys.shipment(settlementId ?? ""),
    queryFn: () => apiGetShipmentForSettlement(settlementId!),
    enabled: !!settlementId,
    refetchInterval: 30_000, // poll every 30s for real-time tracking
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      settlementId: string;
      orderId: string;
      address: DeliveryAddress;
      rateQuote: DeliveryRateQuote;
    }) => apiCreateShipment(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: deliveryKeys.shipment(variables.settlementId),
      });
    },
  });
}

export function useAdvanceShipment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (shipmentId: string) => apiAdvanceShipment(shipmentId),
    onSuccess: () => {
      // Invalidate all shipment queries since we don't know which settlement
      qc.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
}
