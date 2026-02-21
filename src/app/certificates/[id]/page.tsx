"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useCertificate } from "@/hooks/use-mock-queries";
import {
  resolvePartyName,
  resolvePartyLei,
  resolvePartyJurisdiction,
  resolveHubName,
} from "@/lib/certificate-engine";
import { mockCorridors } from "@/lib/mock-data";
import { useState, useCallback } from "react";

/* ---------- Helpers ---------- */

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtOz(n: number) {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} oz`;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-text-faint hover:text-gold transition-colors print:hidden"
      title={label ?? "Copy to clipboard"}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint mb-3 flex items-center gap-2">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </h2>
  );
}

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <tr>
      <td className="py-1 pr-4 text-text-faint text-xs w-56 align-top">{label}</td>
      <td className={`py-1 text-xs ${mono ? "font-mono" : ""}`}>{children}</td>
    </tr>
  );
}

/* ---------- Main ---------- */

function CertificateContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: cert, isLoading } = useCertificate(params.id);

  if (isLoading) return <LoadingState message="Loading certificate…" />;

  if (!cert) {
    return (
      <ErrorState
        title="Certificate Not Found"
        message={`No clearing certificate matching "${params.id}" was found. Certificates are issued upon settlement execution.`}
      />
    );
  }

  // Access control
  const isOwner = user?.id === cert.buyerUserId || user?.id === cert.sellerUserId;
  const isOps = user?.role === "admin" || user?.role === "treasury" || user?.role === "compliance" || user?.role === "vault_ops";

  if (!isOwner && !isOps) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-8 text-center space-y-4">
          <Lock className="h-8 w-8 text-danger mx-auto" />
          <h2 className="text-lg font-semibold text-danger">Restricted Access</h2>
          <p className="text-sm text-text-muted">
            Clearing certificates are restricted to order principals and authorized operations personnel.
          </p>
          <p className="text-xs font-mono text-text-faint">
            HTTP 403 — Insufficient privileges for certificate {cert.certificateNumber}
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm text-gold hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Resolve
  const corridor = mockCorridors.find((c) => c.id === cert.corridorId);

  // JSON export payload
  const exportPayload = () => {
    const payload = {
      certificateVersion: "v1",
      certificateNumber: cert.certificateNumber,
      issuedAt: cert.issuedAt,
      settlement: {
        id: cert.settlementId,
        orderId: cert.orderId,
        listingId: cert.listingId,
      },
      parties: {
        buyer: {
          orgId: cert.buyerOrgId,
          name: resolvePartyName(cert.buyerOrgId),
          lei: resolvePartyLei(cert.buyerOrgId),
          jurisdiction: resolvePartyJurisdiction(cert.buyerOrgId),
        },
        seller: {
          orgId: cert.sellerOrgId,
          name: resolvePartyName(cert.sellerOrgId),
          lei: resolvePartyLei(cert.sellerOrgId),
          jurisdiction: resolvePartyJurisdiction(cert.sellerOrgId),
        },
      },
      asset: cert.asset,
      economics: cert.economics,
      controls: {
        rail: cert.rail,
        corridorId: cert.corridorId,
        corridorName: corridor?.name ?? cert.corridorId,
        settlementHubId: cert.settlementHubId,
        settlementHubName: resolveHubName(cert.settlementHubId),
        vaultHubId: cert.vaultHubId,
        vaultHubName: resolveHubName(cert.vaultHubId),
      },
      dvpLedgerReference: {
        entryId: cert.dvpLedgerEntryId,
        executionModel: "Atomic Delivery-versus-Payment (DvP)",
      },
      signatureHash: cert.signatureHash,
      attestation:
        "This certificate is generated from AurumShield's append-only settlement ledger. All economic, verification, and capital conditions reflected herein were recorded in immutable ledger state at time of DvP execution.",
    };
    console.log("[AurumShield] Certificate Export:", JSON.stringify(payload, null, 2));
  };

  return (
    <>
      {/* Nav */}
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <Link
          href={`/orders/${cert.orderId}/receipt`}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Receipt
        </Link>
        <span className="text-text-faint">|</span>
        <Link
          href={`/orders/${cert.orderId}`}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          Order {cert.orderId}
        </Link>
      </div>

      {/* Certificate Card */}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-gold/20 bg-surface-1 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-gold/10 via-gold/5 to-transparent px-8 py-6 border-b border-gold/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AppLogo className="h-10 w-auto" variant="light" />
                </div>
                <h1 className="text-lg font-semibold text-text tracking-wide">
                  Clearing Certificate
                </h1>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-gold">{cert.certificateNumber}</p>
                <p className="text-[10px] text-text-faint mt-1">
                  Issued {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ PARTIES ═══ */}
          <div className="px-8 py-5">
            <SectionTitle>Parties</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              {/* Buyer */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-2">Buyer</p>
                <table className="w-full text-xs">
                  <tbody>
                    <Field label="Organization">{resolvePartyName(cert.buyerOrgId)}</Field>
                    <Field label="Org ID" mono>{cert.buyerOrgId}</Field>
                    <Field label="LEI" mono>{resolvePartyLei(cert.buyerOrgId)}</Field>
                    <Field label="Jurisdiction">{resolvePartyJurisdiction(cert.buyerOrgId)}</Field>
                  </tbody>
                </table>
              </div>
              {/* Seller */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-2">Seller</p>
                <table className="w-full text-xs">
                  <tbody>
                    <Field label="Organization">{resolvePartyName(cert.sellerOrgId)}</Field>
                    <Field label="Org ID" mono>{cert.sellerOrgId}</Field>
                    <Field label="LEI" mono>{resolvePartyLei(cert.sellerOrgId)}</Field>
                    <Field label="Jurisdiction">{resolvePartyJurisdiction(cert.sellerOrgId)}</Field>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ═══ ASSET SPECIFICATION ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>Asset Specification</SectionTitle>
            <table className="w-full text-xs">
              <tbody>
                <Field label="Listing ID" mono>{cert.listingId}</Field>
                <Field label="Form">{cert.asset.form === "bar" ? "LBMA Good Delivery Bar" : "Bullion Coin"}</Field>
                <Field label="Purity">{cert.asset.purity} fine</Field>
                <Field label="Weight">{fmtOz(cert.asset.weightOz)}</Field>
                <Field label="Custody Vault">{resolveHubName(cert.asset.vaultId)}</Field>
              </tbody>
            </table>
          </div>

          {/* ═══ SETTLEMENT CONFIRMATION ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>Settlement Confirmation</SectionTitle>
            <table className="w-full text-xs">
              <tbody>
                <Field label="Settlement ID" mono>{cert.settlementId}</Field>
                <Field label="Order ID" mono>{cert.orderId}</Field>
                <Field label="Price Per Oz">{fmtUsd(cert.economics.pricePerOzLocked)}</Field>
                <Field label="Notional Value">{fmtUsd(cert.economics.notional)}</Field>
                <Field label="Clearing Fee">{fmtUsd(cert.economics.fees.clearingFee)}</Field>
                <Field label="Custody Fee">{fmtUsd(cert.economics.fees.custodyFee)}</Field>
                <Field label="Total Fees">{fmtUsd(cert.economics.fees.totalFees)}</Field>
                <Field label="Settlement Rail" mono>{cert.rail}</Field>
              </tbody>
            </table>
          </div>

          {/* ═══ CONTROLS ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>Controls &amp; Infrastructure</SectionTitle>
            <table className="w-full text-xs">
              <tbody>
                <Field label="Corridor">{corridor?.name ?? cert.corridorId} <span className="text-text-faint font-mono ml-1">({cert.corridorId})</span></Field>
                <Field label="Settlement Hub">{resolveHubName(cert.settlementHubId)} <span className="text-text-faint font-mono ml-1">({cert.settlementHubId})</span></Field>
                <Field label="Vault Hub">{resolveHubName(cert.vaultHubId)} <span className="text-text-faint font-mono ml-1">({cert.vaultHubId})</span></Field>
              </tbody>
            </table>
          </div>

          {/* ═══ DVP LEDGER REFERENCE ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>DvP Ledger Reference</SectionTitle>
            <table className="w-full text-xs">
              <tbody>
                <Field label="DVP Entry ID" mono>
                  {cert.dvpLedgerEntryId}
                  <CopyButton text={cert.dvpLedgerEntryId} label="Copy DVP entry ID" />
                </Field>
                <Field label="Execution Model">Atomic Delivery-versus-Payment (DvP)</Field>
                <Field label="Ledger Mode">Append-only</Field>
              </tbody>
            </table>
          </div>

          {/* ═══ CRYPTOGRAPHIC SIGNATURE ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>Cryptographic Signature</SectionTitle>
            <div className="rounded-lg border border-border bg-surface-2/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-2">SHA-256 Signature Hash</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-[11px] text-gold break-all leading-relaxed flex-1">
                  {cert.signatureHash}
                </code>
                <CopyButton text={cert.signatureHash} label="Copy signature hash" />
              </div>
              <p className="text-[10px] text-text-faint mt-2 italic">
                This hash is computed from the canonical serialization of the certificate payload fields using SHA-256. 
                Any modification to certificate data will produce a different hash.
              </p>
            </div>
          </div>

          {/* ═══ AUDIT REFERENCE ═══ */}
          <div className="px-8 py-5 border-t border-border">
            <SectionTitle>Audit Reference</SectionTitle>
            <table className="w-full text-xs">
              <tbody>
                <Field label="Certificate Number" mono>
                  {cert.certificateNumber}
                  <CopyButton text={cert.certificateNumber} label="Copy certificate number" />
                </Field>
                <Field label="Issued At" mono>{cert.issuedAt}</Field>
                <Field label="Audit Event ID" mono>CERT_ISSUED:{cert.certificateNumber}</Field>
              </tbody>
            </table>
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="px-8 py-4 border-t border-gold/10 bg-gold/2">
            <blockquote className="text-[10px] text-text-faint italic leading-relaxed text-center">
              This certificate is generated from AurumShield&apos;s append-only settlement ledger.
              All economic, verification, and capital conditions reflected herein correspond
              to the authorization and execution snapshots recorded in immutable ledger state.
            </blockquote>
          </div>

          {/* ═══ ACTIONS ═══ */}
          <div className="px-8 py-4 border-t border-border flex items-center justify-between print:hidden">
            <Link
              href={`/orders/${cert.orderId}/receipt`}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Receipt
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={exportPayload}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:border-text-faint transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md bg-gold/10 border border-gold/20 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CertificateViewerPage() {
  return (
    <RequireAuth>
      <CertificateContent />
    </RequireAuth>
  );
}
