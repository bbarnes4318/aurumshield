"use client";

/* ================================================================
   CLEARING CERTIFICATE — Post-Execution Settlement Ledger
   ================================================================
   Renders a dense terminal-style output showing:
   1. Fedwire clearing hash (mock SHA-256)
   2. ERC-3643 Title Transfer event log
   3. Settlement parameters (timestamp, counterparty, notional)
   4. SHA-256 Clearing Certificate download button

   This replaces any generic "success" screen with an
   institutional, mathematically-heavy settlement proof.
   ================================================================ */

import { useState } from "react";
import { Download, Shield, CheckCircle2, Terminal } from "lucide-react";

/* ── Mock hashes for demo ── */
function mockSha256(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

function mockTxHash(): string {
  return "0x" + mockSha256().slice(0, 40);
}

interface ClearingCertificateProps {
  orderRef?: string;
  notionalValue?: number;
  assetType?: string;
}

export function ClearingCertificate({
  orderRef = "ORD-8842-XAU",
  notionalValue = 106_106_000.0,
  assetType = "400oz LBMA Good Delivery Bar × 100",
}: ClearingCertificateProps) {
  const [fedwireHash] = useState(() => mockSha256());
  const [erc3643TxHash] = useState(() => mockTxHash());
  const [settlementTs] = useState(() => new Date().toISOString());
  const [blockNumber] = useState(() => 19_847_293 + Math.floor(Math.random() * 1000));

  const handleDownload = () => {
    const cert = [
      "═══════════════════════════════════════════════════════════════════",
      "   AURUMSHIELD CLEARING CORPORATION — SHA-256 SETTLEMENT CERTIFICATE",
      "═══════════════════════════════════════════════════════════════════",
      "",
      `ORDER REFERENCE:       ${orderRef}`,
      `SETTLEMENT TIMESTAMP:  ${settlementTs}`,
      `ASSET CLASS:           ${assetType}`,
      `NOTIONAL VALUE:        $${notionalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
      "",
      "───────────────────────────────────────────────────────────────────",
      "FEDWIRE CLEARING PARAMETERS",
      "───────────────────────────────────────────────────────────────────",
      `CLEARING HASH:         ${fedwireHash}`,
      `ORIGINATOR:            AURUMSHIELD CLEARING CORP (ABA: 021000089)`,
      `BENEFICIARY:           OFFTAKER TREASURY ACCOUNT`,
      `IMAD:                  ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}MMQFMP0${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`,
      `STATUS:                SETTLED / FINAL`,
      "",
      "───────────────────────────────────────────────────────────────────",
      "ERC-3643 ON-CHAIN TITLE TRANSFER",
      "───────────────────────────────────────────────────────────────────",
      `TX HASH:               ${erc3643TxHash}`,
      `BLOCK:                 ${blockNumber}`,
      `TOKEN STANDARD:        ERC-3643 (Compliant Security Token)`,
      `FROM:                  0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`,
      `TO:                    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`,
      `TITLE STATUS:          TRANSFERRED / IMMUTABLE`,
      "",
      "───────────────────────────────────────────────────────────────────",
      "CUSTODY & BAILMENT",
      "───────────────────────────────────────────────────────────────────",
      `VAULT:                 Zurich — Malca-Amit Hub 1`,
      `LEGAL FRAMEWORK:       English Law & UCC Article 7 Bailment`,
      `INSURANCE:             Lloyd's of London Transit Specie Policy`,
      `STATUS:                BANKRUPTCY-REMOTE / ALLOCATED`,
      "",
      "═══════════════════════════════════════════════════════════════════",
      `CERTIFICATE HASH:      ${mockSha256()}`,
      `GENERATED:             ${new Date().toISOString()}`,
      "═══════════════════════════════════════════════════════════════════",
    ].join("\n");

    const blob = new Blob([cert], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AurumShield_Clearing_Certificate_${orderRef}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 p-6 pb-0">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-emerald-400">
          Settlement Executed — DvP Swap Finalized
        </h3>
      </div>

      {/* Terminal Output */}
      <div className="p-6">
        <div className="bg-black border border-slate-800 rounded-sm p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
          {/* Terminal header */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
            <Terminal className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-slate-600 text-[10px] tracking-wider uppercase">
              AurumShield Settlement Ledger — Final State
            </span>
          </div>

          {/* Fedwire Section */}
          <div className="mb-4">
            <span className="text-gold-primary">▸ FEDWIRE CLEARING</span>
            <div className="mt-1 ml-2 space-y-0.5">
              <div>
                <span className="text-slate-600">HASH:      </span>
                <span className="text-emerald-400 break-all">{fedwireHash}</span>
              </div>
              <div>
                <span className="text-slate-600">STATUS:    </span>
                <span className="text-emerald-400">SETTLED ✓</span>
              </div>
              <div>
                <span className="text-slate-600">NOTIONAL:  </span>
                <span className="text-white">${notionalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</span>
              </div>
              <div>
                <span className="text-slate-600">TIMESTAMP: </span>
                <span className="text-slate-400">{settlementTs}</span>
              </div>
            </div>
          </div>

          {/* ERC-3643 Section */}
          <div className="mb-4">
            <span className="text-gold-primary">▸ ERC-3643 TITLE TRANSFER</span>
            <div className="mt-1 ml-2 space-y-0.5">
              <div>
                <span className="text-slate-600">TX:        </span>
                <span className="text-emerald-400 break-all">{erc3643TxHash}</span>
              </div>
              <div>
                <span className="text-slate-600">BLOCK:     </span>
                <span className="text-white tabular-nums">{blockNumber.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-600">STANDARD:  </span>
                <span className="text-slate-400">ERC-3643 Security Token</span>
              </div>
              <div>
                <span className="text-slate-600">TITLE:     </span>
                <span className="text-emerald-400">TRANSFERRED ✓</span>
              </div>
            </div>
          </div>

          {/* Custody Section */}
          <div className="mb-2">
            <span className="text-gold-primary">▸ CUSTODY CONFIRMATION</span>
            <div className="mt-1 ml-2 space-y-0.5">
              <div>
                <span className="text-slate-600">VAULT:     </span>
                <span className="text-white">Zurich — Malca-Amit Hub 1</span>
              </div>
              <div>
                <span className="text-slate-600">ASSET:     </span>
                <span className="text-white">{assetType}</span>
              </div>
              <div>
                <span className="text-slate-600">LEGAL:     </span>
                <span className="text-slate-400">English Law & UCC Art. 7 Bailment</span>
              </div>
              <div>
                <span className="text-slate-600">INSURANCE: </span>
                <span className="text-emerald-400">ACTIVE — Lloyd&apos;s of London ✓</span>
              </div>
              <div>
                <span className="text-slate-600">STATUS:    </span>
                <span className="text-emerald-400">BANKRUPTCY-REMOTE / ALLOCATED ✓</span>
              </div>
            </div>
          </div>

          {/* Final line */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-slate-600">ORDER:     </span>
            <span className="text-white font-bold">{orderRef}</span>
            <span className="text-slate-600 ml-4">SETTLEMENT: </span>
            <span className="text-emerald-400 font-bold">FINAL ✓</span>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="
            w-full mt-4 py-4 bg-gold-primary text-slate-950 font-bold text-sm tracking-[0.15em] uppercase
            rounded-sm cursor-pointer transition-all duration-200
            hover:bg-gold-hover hover:shadow-[0_0_30px_rgba(198,168,107,0.2)]
            active:scale-[0.98]
            flex items-center justify-center gap-3
          "
        >
          <Download className="h-5 w-5" />
          DOWNLOAD SHA-256 CLEARING CERTIFICATE
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-slate-700" />
            <span className="font-mono text-[9px] text-slate-700 tracking-wider">
              Append-Only Settlement Ledger · Tamper-Evident
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-700 tabular-nums">
            GOLDWIRE v2.4.1
          </span>
        </div>
      </div>
    </div>
  );
}
