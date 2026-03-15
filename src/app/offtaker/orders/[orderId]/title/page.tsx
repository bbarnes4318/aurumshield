"use client";

/* ================================================================
   DIGITAL WARRANT OF TITLE
   ================================================================
   Cryptographic proof-of-ownership record. Presents a simulated
   secure-enclave-signed attestation with hash payload, algorithm
   details, and blockchain anchor status. Institutional-grade
   evidence of title assignment.
   ================================================================ */

import { useState } from "react";
import { useParams } from "next/navigation";
import { FileDown, Fingerprint, ShieldCheck } from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK TITLE RECORD
   ---------------------------------------------------------------- */
const TITLE_RECORD = {
  orderId: "ORD-8842-XAU",
  offtakerEntity: "Aureus Capital Partners Ltd.",
  offtakerOrgId: "ACP-0042",
  issuedAt: "2026-03-11T14:35:22Z",
  algorithm: "SHA-256 (ERC-3643 Compatible)",
  enclaveSignature: [
    "0x8fB3cA7d9E12b5F6a0D4c8E1b3F7a2D5e9C0B4f8",
    "A1d3E7c9B2f6D0a4C8e1B5f9A3d7E0c2B6f4D8a1",
    "C3e7A9b1D5f0E2c4B8a6D0f3E5c7A1b9D4f8E2c6",
  ].join(""),
  canonicalSerialization: "VALID",
  blockchainAnchor: "PENDING_BATCH_ROLLUP",
  barSerial: "MOC-883492",
  barWeight: "401.125 tr oz",
  barFineness: "999.9",
};

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono text-sm flex items-center gap-2 w-fit">
      {value}
      <button
        onClick={handleCopy}
        className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer"
      >
        [ COPY ]
      </button>
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function CryptographicTitlePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);

    // Generate a structured title record document
    const titleDocument = {
      documentType: "DIGITAL_WARRANT_OF_TITLE",
      version: "1.0",
      issuer: "AurumShield Clearing",
      record: {
        orderId: orderId,
        offtakerEntity: TITLE_RECORD.offtakerEntity,
        offtakerOrgId: TITLE_RECORD.offtakerOrgId,
        issuedAt: TITLE_RECORD.issuedAt,
        algorithm: TITLE_RECORD.algorithm,
        enclaveSignature: TITLE_RECORD.enclaveSignature,
        canonicalSerialization: TITLE_RECORD.canonicalSerialization,
        blockchainAnchor: TITLE_RECORD.blockchainAnchor,
      },
      asset: {
        barSerial: TITLE_RECORD.barSerial,
        barWeight: TITLE_RECORD.barWeight,
        barFineness: TITLE_RECORD.barFineness,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(titleDocument, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `title-record-${TITLE_RECORD.orderId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsDownloading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-5xl mx-auto p-8 pt-12">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Fingerprint className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Digital Warrant of Title
            </span>
          </div>
          <h1 className="text-3xl text-white font-bold tracking-tight">
            Cryptographic Ownership Record
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <HashBadge value={TITLE_RECORD.orderId} />
            <span className="font-mono text-slate-600 text-xs">·</span>
            <span className="font-mono text-slate-600 text-xs tracking-wider">
              {TITLE_RECORD.offtakerEntity}
            </span>
          </div>
        </div>

        {/* ── Legal Text ── */}
        <div className="mb-8">
          <p className="font-mono text-slate-500 text-sm leading-relaxed max-w-3xl">
            This is a cryptographically signed attestation of allocation and
            title assignment under governing master agreements. Signed via
            Turnkey Secure Enclave.
          </p>
        </div>

        {/* ── Attestation Summary ── */}
        <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Title Attestation — Asset Summary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-4">
            <TitleField label="Bar Serial" value={TITLE_RECORD.barSerial} />
            <TitleField label="Gross Weight" value={TITLE_RECORD.barWeight} />
            <TitleField label="Fineness" value={TITLE_RECORD.barFineness} />
            <TitleField
              label="Title Holder"
              value={TITLE_RECORD.offtakerEntity}
            />
            {/* Org ID — Hash Badge */}
            <div>
              <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
                Org ID
              </span>
              <HashBadge value={TITLE_RECORD.offtakerOrgId} />
            </div>
            <TitleField label="Issued" value={TITLE_RECORD.issuedAt} />
          </div>
        </div>

        {/* ── Hash Payload Terminal ── */}
        <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 relative">
          {/* Terminal header bar */}
          <div className="flex items-center gap-1.5 mb-5 pb-3 border-b border-slate-800">
            <div className="h-2 w-2 rounded-full bg-red-500/60" />
            <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
            <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
            <span className="font-mono text-slate-600 text-[9px] ml-2 tracking-wider uppercase">
              Secure Enclave Output
            </span>
          </div>

          <div className="space-y-4 font-mono text-sm">
            {/* Algorithm */}
            <div>
              <span className="text-slate-600 select-none">{"> "}</span>
              <span className="text-slate-500">ALGORITHM: </span>
              <span className="text-white">{TITLE_RECORD.algorithm}</span>
            </div>

            {/* Enclave Signature */}
            <div>
              <span className="text-slate-600 select-none">{"> "}</span>
              <span className="text-slate-500">ENCLAVE_SIGNATURE: </span>
              <span className="text-emerald-400 break-all leading-relaxed">
                {TITLE_RECORD.enclaveSignature}
              </span>
            </div>

            {/* Canonical Serialization */}
            <div>
              <span className="text-slate-600 select-none">{"> "}</span>
              <span className="text-slate-500">CANONICAL_SERIALIZATION: </span>
              <span className="text-white">
                {TITLE_RECORD.canonicalSerialization}
              </span>
            </div>

            {/* Blockchain Anchor */}
            <div>
              <span className="text-slate-600 select-none">{"> "}</span>
              <span className="text-slate-500">BLOCKCHAIN_ANCHOR: </span>
              <span className="text-yellow-400">
                {TITLE_RECORD.blockchainAnchor}
              </span>
            </div>
          </div>

          {/* Blinking cursor */}
          <div className="mt-4">
            <span className="text-slate-600 select-none font-mono text-sm">
              {"> "}
            </span>
            <span className="inline-block w-2 h-4 bg-emerald-400/80 animate-pulse" />
          </div>
        </div>

        {/* ── Download Action ── */}
        <div className="mt-6 flex flex-col items-end">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`font-mono text-sm px-5 py-2.5 border flex items-center gap-2 transition-colors cursor-pointer ${
              isDownloading
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-slate-700 text-white hover:border-slate-500 hover:bg-slate-900"
            }`}
          >
            {isDownloading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                Download Immutable PDF
              </>
            )}
          </button>
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
            EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
          </span>
        </div>

        {/* ── Footer ── */}
        <p className="mt-12 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · Turnkey Secure Enclave · SHA-256 ·
          Cryptographic Proof of Title
        </p>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ── Inline Helper: Title Field ── */
function TitleField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
        {label}
      </span>
      <span className="font-mono text-sm text-white block">{value}</span>
    </div>
  );
}
