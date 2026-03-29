"use client";

/* ================================================================
   SETTLEMENT DOCUMENT MODAL — Institutional Trust Instruments
   ================================================================
   Premium modal component that renders mock settlement documents
   with institutional-grade formatting. These are the proof
   artifacts that make a $500M buyer comfortable.

   Document types:
     1. BINDING_QUOTE — Locked price, execution terms
     2. SETTLEMENT_INSTRUCTIONS — Wire/wallet details, deadline
     3. CUSTODY_CONFIRMATION — Bar serial numbers, vault, insurance
     4. CLEARING_CERTIFICATE — SHA-256 hash, digital seal
   ================================================================ */

import { useCallback, useEffect, useRef } from "react";
import {
  X,
  Shield,
  Lock,
  CheckCircle2,
  FileText,
  Fingerprint,
} from "lucide-react";
import type { ArtifactType } from "@/lib/types/settlement-case-types";

/* ── Props ── */

interface SettlementDocumentModalProps {
  open: boolean;
  onClose: () => void;
  documentType: ArtifactType;
  caseRef: string;
  orderRef: string;
  assetName: string;
  quantity: number;
  totalWeightOz: number;
  vaultJurisdiction: string | null;
  spotPrice: number;
  totalAmount: number;
  submittedAt: string;
}

/* ── Mock data generators ── */

function generateSerialNumber(index: number): string {
  const refiners = ["PAMP", "VALC", "ARGH", "UMCR"];
  const refiner = refiners[index % refiners.length];
  const year = "2026";
  const seq = String(Math.floor(Math.random() * 900000) + 100000);
  return `${refiner}-${year}-${seq}`;
}

function generateSHA256(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function fmtUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtWeight(oz: number): string {
  return oz.toLocaleString("en-US", {
    minimumFractionDigits: oz % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });
}

/* ── Document Header ── */

function DocumentHeader({
  title,
  docRef,
  timestamp,
}: {
  title: string;
  docRef: string;
  timestamp: string;
}) {
  return (
    <div className="border-b border-[#C6A86B]/20 pb-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border-2 border-[#C6A86B] flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#C6A86B]" />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#C6A86B] tracking-[0.3em] uppercase font-bold">
              AurumShield
            </div>
            <div className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase">
              Sovereign Gold Settlement Infrastructure
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
            Document Ref
          </div>
          <div className="font-mono text-xs text-white font-bold">{docRef}</div>
        </div>
      </div>
      <h2 className="font-mono text-sm text-white font-bold tracking-wider uppercase mb-1">
        {title}
      </h2>
      <div className="font-mono text-[9px] text-slate-500">
        Generated: {fmtTime(timestamp)}
      </div>
    </div>
  );
}

/* ── Key-Value Row ── */

function DocRow({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-800/40 last:border-0">
      <span className="font-mono text-[10px] text-slate-500 shrink-0 mr-4">
        {label}
      </span>
      <span
        className={`font-mono text-[11px] text-right ${
          accent
            ? "text-[#C6A86B] font-bold"
            : mono
              ? "text-white tabular-nums"
              : "text-slate-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Digital Signature Block ── */

function DigitalSignatureBlock({
  hash,
  signer,
  timestamp,
}: {
  hash: string;
  signer: string;
  timestamp: string;
}) {
  return (
    <div className="mt-5 border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-emerald-400" />
        <span className="font-mono text-[9px] text-emerald-400 tracking-[0.15em] uppercase font-bold">
          Cryptographic Verification
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="font-mono text-[8px] text-slate-600 tracking-wider uppercase mb-0.5">
            SHA-256 Document Hash
          </div>
          <div className="font-mono text-[9px] text-emerald-400 break-all leading-relaxed bg-black/40 px-2 py-1.5 border border-emerald-500/10">
            {hash}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-mono text-[8px] text-slate-600 tracking-wider uppercase mb-0.5">
              Signing Authority
            </div>
            <div className="font-mono text-[10px] text-slate-300">
              {signer}
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] text-slate-600 tracking-wider uppercase mb-0.5">
              Timestamp
            </div>
            <div className="font-mono text-[10px] text-slate-300">
              {fmtTime(timestamp)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[9px] text-emerald-400 font-bold tracking-wider uppercase">
            Signature Verified — Tamper-Evident Record
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Document Bodies ── */

function BindingQuoteBody(props: SettlementDocumentModalProps) {
  const platformFee = props.totalAmount * 0.01;
  const assetPremium = props.totalAmount * 0.001;
  const spotValue = props.totalAmount - platformFee - assetPremium;
  const hash = generateSHA256();

  return (
    <>
      <DocumentHeader
        title="Binding Quote Confirmation"
        docRef={`BQ-${props.caseRef}`}
        timestamp={new Date().toISOString()}
      />

      <div className="space-y-4">
        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Quote Terms
          </div>
          <DocRow label="Status" value="LOCKED — BINDING" accent />
          <DocRow label="Quote Validity" value="60 seconds from generation" />
          <DocRow label="Execution Window" value="Same business day" />
          <DocRow
            label="Settlement Rail"
            value="Institutional Stablecoin Bridge (USDC)"
          />
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Asset Details
          </div>
          <DocRow label="Instrument" value={props.assetName} />
          <DocRow label="Quantity" value={`${props.quantity} unit(s)`} />
          <DocRow
            label="Total Weight"
            value={`${fmtWeight(props.totalWeightOz)} troy oz`}
            mono
          />
          <DocRow label="Fineness" value="≥995.0 (LBMA Good Delivery)" />
        </div>

        <div className="border border-[#C6A86B]/20 bg-[#C6A86B]/5 p-3">
          <div className="font-mono text-[8px] text-[#C6A86B] tracking-[0.15em] uppercase mb-2 font-bold flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Locked Price Derivation
          </div>
          <DocRow
            label="XAU/USD Locked Spot"
            value={fmtUsd(props.spotPrice)}
            mono
          />
          <DocRow label="Spot Value" value={fmtUsd(spotValue)} mono />
          <DocRow label="Asset Premium (+0.10%)" value={fmtUsd(assetPremium)} mono />
          <DocRow label="Platform Fee (1.00%)" value={fmtUsd(platformFee)} mono />
          <div className="border-t border-[#C6A86B]/20 pt-2 mt-2">
            <DocRow
              label="TOTAL EXECUTION AMOUNT"
              value={fmtUsd(props.totalAmount)}
              accent
            />
          </div>
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Custody Arrangement
          </div>
          <DocRow label="Custody Type" value="Allocated — Bailment" />
          <DocRow
            label="Vault Facility"
            value={props.vaultJurisdiction ?? "Zurich — Malca-Amit Hub 1"}
          />
          <DocRow
            label="Insurance"
            value="Lloyd's Specie Policy — Full Coverage"
          />
          <DocRow label="Legal Framework" value="English Law / UCC Article 7" />
        </div>
      </div>

      <DigitalSignatureBlock
        hash={hash}
        signer="AurumShield Clearing Engine"
        timestamp={new Date().toISOString()}
      />
    </>
  );
}

function SettlementInstructionsBody(props: SettlementDocumentModalProps) {
  const hash = generateSHA256();

  return (
    <>
      <DocumentHeader
        title="Settlement Instructions"
        docRef={`SI-${props.caseRef}`}
        timestamp={new Date().toISOString()}
      />

      <div className="space-y-4">
        <div className="border border-[#C6A86B]/20 bg-[#C6A86B]/5 p-3">
          <div className="font-mono text-[8px] text-[#C6A86B] tracking-[0.15em] uppercase mb-2 font-bold">
            Settlement Amount Due
          </div>
          <DocRow
            label="Total Amount"
            value={fmtUsd(props.totalAmount)}
            accent
          />
          <DocRow label="Currency" value="USDC (USD Coin)" />
          <DocRow label="Deadline" value="Same business day as quote" />
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Stablecoin Funding Instructions
          </div>
          <DocRow label="Network" value="Ethereum (ERC-20)" />
          <DocRow label="Asset" value="USDC" />
          <div className="py-2">
            <div className="font-mono text-[8px] text-slate-600 tracking-wider uppercase mb-1">
              Deposit Address
            </div>
            <div className="font-mono text-[10px] text-[#C6A86B] break-all bg-black/40 px-2 py-1.5 border border-[#C6A86B]/20">
              0x7a3B8c9D4e2F1A6b5C0d8E9f3A7B4c6D2E1F0a9B
            </div>
          </div>
          <DocRow
            label="Wallet Screening"
            value="OFAC Cleared — Chainalysis KYT"
          />
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Compliance Attestation
          </div>
          <DocRow label="Entity" value="Meridian Capital Holdings Ltd." />
          <DocRow label="KYB Status" value="APPROVED" />
          <DocRow label="AML Screening" value="CLEARED — 7 jurisdictions" />
          <DocRow
            label="UBO Review"
            value="CLEARED — 3 beneficial owners screened"
          />
          <DocRow label="Source of Funds" value="Institutional Custody Wallet" />
        </div>

        <div className="flex items-start gap-2 border border-red-500/20 bg-red-500/5 px-3 py-2">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
          <p className="font-mono text-[9px] text-red-400 leading-relaxed">
            IMPORTANT: Upon receipt, funds undergo mandatory AML re-screening
            before settlement proceeds. Settlement is blocked until re-screening
            clears. This is a non-negotiable compliance requirement.
          </p>
        </div>
      </div>

      <DigitalSignatureBlock
        hash={hash}
        signer="AurumShield Settlement Operations"
        timestamp={new Date().toISOString()}
      />
    </>
  );
}

function CustodyConfirmationBody(props: SettlementDocumentModalProps) {
  const hash = generateSHA256();
  const barSerials = Array.from({ length: props.quantity }, (_, i) =>
    generateSerialNumber(i),
  );

  return (
    <>
      <DocumentHeader
        title="Custody Allocation Manifest"
        docRef={`CA-${props.caseRef}`}
        timestamp={new Date().toISOString()}
      />

      <div className="space-y-4">
        <div className="border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="font-mono text-[8px] text-emerald-400 tracking-[0.15em] uppercase mb-2 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            Allocation Status: CONFIRMED
          </div>
          <DocRow label="Custody Type" value="ALLOCATED — SEGREGATED" accent />
          <DocRow
            label="Vault Facility"
            value={props.vaultJurisdiction ?? "Zurich — Malca-Amit Hub 1"}
          />
          <DocRow label="Vault Operator" value="Malca-Amit Global" />
          <DocRow
            label="Legal Framework"
            value="Bailment — English Law / UCC Art. 7"
          />
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Allocated Bar Inventory
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="font-mono text-[8px] text-slate-500 tracking-wider uppercase text-left py-1.5 pr-2">
                    #
                  </th>
                  <th className="font-mono text-[8px] text-slate-500 tracking-wider uppercase text-left py-1.5 pr-2">
                    Bar Serial
                  </th>
                  <th className="font-mono text-[8px] text-slate-500 tracking-wider uppercase text-left py-1.5 pr-2">
                    Refiner
                  </th>
                  <th className="font-mono text-[8px] text-slate-500 tracking-wider uppercase text-right py-1.5">
                    Weight (oz)
                  </th>
                  <th className="font-mono text-[8px] text-slate-500 tracking-wider uppercase text-right py-1.5 pl-2">
                    Fineness
                  </th>
                </tr>
              </thead>
              <tbody>
                {barSerials.map((serial, idx) => (
                  <tr
                    key={serial}
                    className="border-b border-slate-800/30 last:border-0"
                  >
                    <td className="font-mono text-[10px] text-slate-600 py-1.5 pr-2">
                      {idx + 1}
                    </td>
                    <td className="font-mono text-[10px] text-[#C6A86B] py-1.5 pr-2 font-bold">
                      {serial}
                    </td>
                    <td className="font-mono text-[10px] text-slate-400 py-1.5 pr-2">
                      {serial.split("-")[0] === "PAMP"
                        ? "PAMP SA"
                        : serial.split("-")[0] === "VALC"
                          ? "Valcambi SA"
                          : serial.split("-")[0] === "ARGH"
                            ? "Argor-Heraeus"
                            : "Umicore SA"}
                    </td>
                    <td className="font-mono text-[10px] text-white py-1.5 tabular-nums text-right">
                      {fmtWeight(
                        props.totalWeightOz / props.quantity +
                          (Math.random() * 4 - 2),
                      )}
                    </td>
                    <td className="font-mono text-[10px] text-white py-1.5 tabular-nums text-right pl-2">
                      999.9
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700">
                  <td
                    colSpan={3}
                    className="font-mono text-[10px] text-slate-400 py-1.5 font-bold"
                  >
                    Total Allocated
                  </td>
                  <td className="font-mono text-[10px] text-white py-1.5 tabular-nums text-right font-bold">
                    {fmtWeight(props.totalWeightOz)} oz
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Insurance Coverage
          </div>
          <DocRow
            label="Underwriter"
            value="Lloyd's of London Syndicate"
          />
          <DocRow label="Policy Type" value="Specie Insurance — All-Risk" />
          <DocRow label="Coverage" value="Transit + Static Custody" />
          <DocRow
            label="Insured Value"
            value={fmtUsd(props.totalAmount)}
            mono
          />
          <DocRow label="Coverage Status" value="ACTIVE" />
        </div>

        <div className="border border-slate-800 bg-black/30 p-3">
          <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
            Audit & Verification
          </div>
          <DocRow
            label="Third-Party Auditor"
            value="Bureau Veritas"
          />
          <DocRow label="Audit Schedule" value="Semi-annual physical inspection" />
          <DocRow
            label="Next Audit"
            value="Q3 2026"
          />
          <DocRow label="Verification Method" value="Ultrasonic + Conductivity" />
        </div>
      </div>

      <DigitalSignatureBlock
        hash={hash}
        signer="Malca-Amit Vault Operations"
        timestamp={new Date().toISOString()}
      />
    </>
  );
}

function ClearingCertificateBody(props: SettlementDocumentModalProps) {
  const docHash = generateSHA256();
  const clearingHash = generateSHA256();
  const idempotencyKey = generateSHA256();

  return (
    <>
      <DocumentHeader
        title="SHA-256 Clearing Certificate"
        docRef={`CC-${props.caseRef}`}
        timestamp={new Date().toISOString()}
      />

      {/* Verified Watermark */}
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
          <div className="font-mono text-[80px] text-emerald-400 font-bold tracking-[0.3em] uppercase -rotate-12 select-none">
            VERIFIED
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="border-2 border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <div className="font-mono text-[9px] text-emerald-400 tracking-[0.3em] uppercase mb-2 font-bold">
              Settlement Status
            </div>
            <div className="font-mono text-lg text-emerald-400 font-bold tracking-wider">
              DvP SETTLEMENT COMPLETE
            </div>
            <div className="font-mono text-[9px] text-slate-500 mt-1">
              Delivery vs. Payment executed — title transferred — case archived
            </div>
          </div>

          <div className="border border-slate-800 bg-black/30 p-3">
            <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
              Transaction Summary
            </div>
            <DocRow label="Settlement Case" value={props.caseRef} mono />
            <DocRow label="Order Reference" value={props.orderRef} mono />
            <DocRow label="Instrument" value={props.assetName} />
            <DocRow label="Quantity" value={`${props.quantity} unit(s)`} />
            <DocRow
              label="Total Weight"
              value={`${fmtWeight(props.totalWeightOz)} troy oz`}
              mono
            />
            <DocRow
              label="Execution Amount"
              value={fmtUsd(props.totalAmount)}
              accent
            />
          </div>

          <div className="border border-slate-800 bg-black/30 p-3">
            <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
              Counterparties
            </div>
            <DocRow label="Buyer" value="Meridian Capital Holdings Ltd." />
            <DocRow
              label="Buyer Jurisdiction"
              value="United States (Delaware)"
            />
            <DocRow label="Seller (Principal)" value="AurumShield Inc." />
            <DocRow label="Custodian" value="Malca-Amit Global" />
            <DocRow label="Insurer" value="Lloyd's of London Syndicate" />
            <DocRow label="Clearing Engine" value="Goldwire v2.1" />
          </div>

          <div className="border border-slate-800 bg-black/30 p-3">
            <div className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase mb-2 font-bold">
              Settlement Timeline
            </div>
            <DocRow
              label="Trade Intent Recorded"
              value={fmtTime(props.submittedAt)}
            />
            <DocRow
              label="Binding Quote Locked"
              value={fmtTime(new Date().toISOString())}
            />
            <DocRow
              label="Funds Received"
              value={fmtTime(new Date().toISOString())}
            />
            <DocRow
              label="Gold Allocated"
              value={fmtTime(new Date().toISOString())}
            />
            <DocRow
              label="Title Transferred"
              value={fmtTime(new Date().toISOString())}
            />
            <DocRow
              label="Settlement Archived"
              value={fmtTime(new Date().toISOString())}
            />
          </div>
        </div>
      </div>

      {/* Cryptographic Proof Block — the crown jewel */}
      <div className="border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400 tracking-[0.15em] uppercase font-bold">
            Cryptographic Clearing Proof
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase mb-0.5">
              Clearing Hash (SHA-256)
            </div>
            <div className="font-mono text-[9px] text-emerald-400 break-all leading-relaxed bg-black/60 px-2 py-2 border border-emerald-500/20">
              {clearingHash}
            </div>
          </div>

          <div>
            <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase mb-0.5">
              Idempotency Key (SHA-256)
            </div>
            <div className="font-mono text-[9px] text-slate-400 break-all leading-relaxed bg-black/60 px-2 py-2 border border-slate-800">
              {idempotencyKey}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase mb-0.5">
                Signing Authority
              </div>
              <div className="font-mono text-[10px] text-slate-300">
                Goldwire Clearing Engine v2.1
              </div>
            </div>
            <div>
              <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase mb-0.5">
                Signing Method
              </div>
              <div className="font-mono text-[10px] text-slate-300">
                AWS KMS ECDSA P-256
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-500/20 pt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="font-mono text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                Settlement Verified — Tamper-Evident — Immutable Record
              </span>
              <p className="font-mono text-[8px] text-slate-500 mt-0.5">
                This clearing certificate cannot be retroactively altered. The
                complete settlement lifecycle is reconstructable from the audit
                chain.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DigitalSignatureBlock
        hash={docHash}
        signer="Goldwire Clearing Engine v2.1"
        timestamp={new Date().toISOString()}
      />
    </>
  );
}

/* ================================================================
   MAIN MODAL COMPONENT
   ================================================================ */

export default function SettlementDocumentModal(
  props: SettlementDocumentModalProps,
) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        props.onClose();
      }
    },
    [props],
  );

  // ESC to close
  useEffect(() => {
    if (!props.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-700 shadow-[0_0_60px_rgba(198,168,107,0.1)]">
        {/* Close button */}
        <button
          onClick={props.onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Document Body */}
        <div className="p-6">
          {props.documentType === "quote_confirmation" && (
            <BindingQuoteBody {...props} />
          )}
          {props.documentType === "settlement_instructions" && (
            <SettlementInstructionsBody {...props} />
          )}
          {props.documentType === "custody_confirmation" && (
            <CustodyConfirmationBody {...props} />
          )}
          {props.documentType === "clearing_certificate" && (
            <ClearingCertificateBody {...props} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-black/60 px-6 py-3">
          <p className="font-mono text-[8px] text-slate-700 text-center tracking-wider">
            AurumShield Sovereign Settlement Infrastructure · Append-Only Audit
            Trail · End-to-End Encryption · AWS KMS ECDSA Signing
          </p>
        </div>
      </div>
    </div>
  );
}
