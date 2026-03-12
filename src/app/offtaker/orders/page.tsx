"use client";

/* ================================================================
   OFFTAKER ALLOCATION LEDGER — Settlement & Custody
   ================================================================
   Bloomberg-style data grid for all offtaker orders.
   Strict terminal aesthetic: font-mono, dark slate, gold accents.
   ================================================================ */

import { useRouter } from "next/navigation";
import { Shield, ArrowRight } from "lucide-react";

/* ----------------------------------------------------------------
   MOCK ORDER DATA
   ---------------------------------------------------------------- */
interface OrderRow {
  orderRef: string;
  assetType: string;
  notionalValue: number;
  custodyState: string;
  settlementStatus: "AWAITING_FEDWIRE" | "TITLE_SECURED";
}

const MOCK_ORDERS: OrderRow[] = [
  {
    orderRef: "ORD-8842-XAU",
    assetType: "400oz Good Delivery",
    notionalValue: 10_610_600.0,
    custodyState: "ALLOCATED_BAILMENT",
    settlementStatus: "AWAITING_FEDWIRE",
  },
  {
    orderRef: "ORD-7291-XAU",
    assetType: "1kg Gold Bar",
    notionalValue: 85_362.25,
    custodyState: "ALLOCATED_BAILMENT",
    settlementStatus: "TITLE_SECURED",
  },
  {
    orderRef: "ORD-6104-XAU",
    assetType: "10oz Cast Bar",
    notionalValue: 26_699.38,
    custodyState: "IN_TRANSIT_BRINKS",
    settlementStatus: "TITLE_SECURED",
  },
  {
    orderRef: "ORD-5530-XAU",
    assetType: "400oz Good Delivery",
    notionalValue: 10_610_600.0,
    custodyState: "ALLOCATED_BAILMENT",
    settlementStatus: "AWAITING_FEDWIRE",
  },
  {
    orderRef: "ORD-4017-XAU",
    assetType: "1oz Minted Bar",
    notionalValue: 2_689.75,
    custodyState: "VAULT_SECURED",
    settlementStatus: "TITLE_SECURED",
  },
];

/* ----------------------------------------------------------------
   CURRENCY FORMATTER
   ---------------------------------------------------------------- */
function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ================================================================
   COLUMN HEADERS
   ================================================================ */
const COLUMNS = [
  "ORDER_REF",
  "ASSET_TYPE",
  "NOTIONAL_VALUE",
  "CUSTODY_STATE",
  "SETTLEMENT_STATUS",
  "",
] as const;

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function OfftakerOrdersPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 max-w-7xl mx-auto p-8 pt-12">
      {/* ── Section Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-3.5 w-3.5 text-gold-primary" />
        <span className="font-mono text-xs text-gold-primary tracking-[0.2em] uppercase">
          Settlement &amp; Custody
        </span>
      </div>
      <h1 className="font-mono text-2xl text-white font-bold tracking-tight mb-8">
        Offtaker Allocation Ledger
      </h1>

      {/* ── Data Grid ── */}
      <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr_1.1fr_48px] border-b border-slate-800 bg-slate-950/60">
          {COLUMNS.map((col, i) => (
            <div
              key={i}
              className="px-4 py-3 font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase select-none"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {MOCK_ORDERS.map((order) => (
          <button
            key={order.orderRef}
            onClick={() => router.push(`/offtaker/orders/${order.orderRef}`)}
            className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr_1.1fr_48px] w-full text-left border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors cursor-pointer group"
          >
            {/* ORDER_REF */}
            <div className="px-4 py-3.5 font-mono text-xs text-white font-bold tabular-nums">
              {order.orderRef}
            </div>

            {/* ASSET_TYPE */}
            <div className="px-4 py-3.5 font-mono text-xs text-slate-300">
              {order.assetType}
            </div>

            {/* NOTIONAL_VALUE */}
            <div className="px-4 py-3.5 font-mono text-xs text-white tabular-nums">
              ${fmt(order.notionalValue)}
            </div>

            {/* CUSTODY_STATE */}
            <div className="px-4 py-3.5 font-mono text-xs text-slate-400 tracking-wide">
              {order.custodyState}
            </div>

            {/* SETTLEMENT_STATUS */}
            <div className="px-4 py-3.5">
              {order.settlementStatus === "AWAITING_FEDWIRE" ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-pulse" />
                  <span className="text-gold-primary">AWAITING_FEDWIRE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">TITLE_SECURED</span>
                </span>
              )}
            </div>

            {/* Row Arrow */}
            <div className="px-4 py-3.5 flex items-center justify-center">
              <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-gold-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>

      {/* ── Footer Tally ── */}
      <div className="flex items-center justify-between mt-4 px-1">
        <span className="font-mono text-[10px] text-slate-600 tracking-wider">
          {MOCK_ORDERS.length} ALLOCATIONS · GOLDWIRE SETTLEMENT NETWORK
        </span>
        <span className="font-mono text-[10px] text-slate-600 tabular-nums">
          AGGREGATE NOTIONAL: $
          {fmt(MOCK_ORDERS.reduce((sum, o) => sum + o.notionalValue, 0))}
        </span>
      </div>
    </div>
  );
}
