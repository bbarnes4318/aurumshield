import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk & Reinsurance Protocol | AurumShield",
  description:
    "Risk Management and Reinsurance Policy for the AurumShield deterministic gold clearing infrastructure.",
};

export default function RiskReinsurancePage() {
  return (
    <>
      {/* ── Document Header ── */}
      <div className="border-b border-slate-800 pb-8 mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">LEGAL INFRASTRUCTURE</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
          Risk Management &amp; Reinsurance Protocol
        </h1>
        <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-2 border border-slate-800 bg-[#0B0E14] px-3 py-1.5 rounded-md">
            Classification: Public
          </span>
          <span className="flex items-center gap-2 border border-slate-800 bg-[#0B0E14] px-3 py-1.5 rounded-md">
            Status: Active &amp; Enforced
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-8 font-mono">
        Last Updated: January 12, 2026
      </p>

      <p className="text-gray-300 leading-relaxed mb-6">
        This Risk Management and Reinsurance Policy (&ldquo;Policy&rdquo;) sets forth the structural, operational, and financial frameworks employed by AurumShield (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) to mitigate counterparty, systemic, and physical delivery risks across our deterministic clearing platform.
      </p>
      <p className="text-gray-300 leading-relaxed mb-10">
        As an institutional clearinghouse for physical commodities, AurumShield is designed to eliminate traditional bilateral counterparty risk. By utilizing this Platform, the institutional entity (&ldquo;Counterparty&rdquo;) agrees to the risk parameters, capital allocation rules, and deterministic claims resolutions outlined herein.
      </p>

      {/* ── Article 1 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 1: SYSTEMIC COUNTERPARTY RISK MITIGATION</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">1.1. Deterministic Delivery versus Payment (DvP):</strong> AurumShield fundamentally eliminates principal settlement risk (Herstatt risk) through its proprietary DvP escrow architecture. Neither fiat capital nor physical commodity titles are released to the respective counterparties until the Platform mathematically verifies that all conditions of the Atomic Settlement have been perfectly fulfilled.</li>
        <li><strong className="text-white">1.2. Pre-Trade Capital Verification:</strong> Prior to the execution of any trade, AurumShield integrates directly with institutional banking rails (via Moov) to verify and lock required capital or margin. Unfunded or partially funded orders are automatically rejected by the ledger, preventing intraday overdrafts or naked shorting of physical assets.</li>
        <li><strong className="text-white">1.3. Continuous Intraday Risk Monitoring:</strong> The Platform enforces dynamic capital controls, calculating real-time Value at Risk (VaR) and Tail Value at Risk (TVaR) for all active Counterparties. AurumShield retains the unilateral right to enforce immediate intraday margin calls or liquidate positions if a Counterparty breaches its algorithmic risk threshold.</li>
      </ul>

      {/* ── Article 2 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 2: PHYSICAL TRANSIT AND LOGISTICS RISK</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">2.1. Certified Corridors:</strong> AurumShield only permits the physical transfer of commodities through pre-vetted, highly secure logistics corridors utilizing approved transit providers (e.g., Brink&apos;s for armored transit, EasyPost for standard insured routing).</li>
        <li><strong className="text-white">2.2. Transit Insurance Riders:</strong> Every physical shipment initiated via the Platform is legally bound to a specific transit insurance rider. Risk of loss, damage, or theft transfers to the logistics provider the moment the physical commodity is scanned into their custody and ceases upon verifiable cryptographic receipt by the Buyer.</li>
        <li><strong className="text-white">2.3. Platform Liability Exemption for Physical Handling:</strong> Counterparties explicitly acknowledge that AurumShield acts as the software infrastructure and clearing agent, not the physical custodian. AurumShield disclaims all direct liability for lost or stolen commodities while in the physical custody of third-party logistics providers.</li>
      </ul>

      {/* ── Article 3 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 3: THE REINSURANCE CAPITAL WATERFALL</h2>
      <p className="text-gray-300 leading-relaxed mb-4">
        In the highly improbable event of a systemic settlement failure, verified fraud, or a logistics breach that exceeds standard insurance coverage, AurumShield operates a strictly defined Capital Waterfall to ensure market integrity and make Non-Defaulting Counterparties whole. Losses are absorbed in the following immutable sequence:
      </p>
      <div className="space-y-4 mb-8">
        <div className="border-l-2 border-gold pl-5 py-2">
          <p className="text-white font-semibold mb-1">Tier 1 — Defaulter&apos;s Margin</p>
          <p className="text-gray-300 text-sm leading-relaxed">The primary source of restitution is the locked escrow capital, posted margin, or physical inventory of the specific Defaulting Counterparty.</p>
        </div>
        <div className="border-l-2 border-gold pl-5 py-2">
          <p className="text-white font-semibold mb-1">Tier 2 — Logistics Insurance</p>
          <p className="text-gray-300 text-sm leading-relaxed">For physical losses, claims are routed directly to the specific insurance policy underwritten for the utilized logistics carrier (e.g., Brink&apos;s institutional transit policy).</p>
        </div>
        <div className="border-l-2 border-gold pl-5 py-2">
          <p className="text-white font-semibold mb-1">Tier 3 — AurumShield Default Fund</p>
          <p className="text-gray-300 text-sm leading-relaxed">If Tiers 1 and 2 are exhausted or inapplicable, losses are absorbed by AurumShield&apos;s proprietary, capitalized Default Fund, established solely for the protection of clearinghouse operations.</p>
        </div>
        <div className="border-l-2 border-gold pl-5 py-2">
          <p className="text-white font-semibold mb-1">Tier 4 — Institutional Reinsurance</p>
          <p className="text-gray-300 text-sm leading-relaxed">Catastrophic systemic losses exceeding the Default Fund are covered by AurumShield&apos;s aggregate institutional reinsurance policies.</p>
        </div>
      </div>

      {/* ── Article 4 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 4: DETERMINISTIC CLAIMS ENGINE</h2>
      <p className="text-gray-300 leading-relaxed mb-4">AurumShield replaces traditional, protracted legal arbitration for delivery and settlement disputes with a mathematically driven adjudication system.</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">4.1. Claim Initiation:</strong> In the event of a delivery breach (e.g., missing parcel) or an assay dispute (e.g., discrepancy in gold purity or weight), the Counterparty must file a formal dispute via the Platform within 48 hours of the recorded delivery event.</li>
        <li><strong className="text-white">4.2. Algorithmic Adjudication:</strong> Claims are routed into AurumShield&apos;s Deterministic Claims Engine. This engine automatically ingests and evaluates cryptographic chain-of-custody data, API telemetry from logistics providers, banking settlement logs, and biometric receiving receipts.</li>
        <li><strong className="text-white">4.3. Binding Resolution:</strong> By utilizing the Platform, Counterparties agree that the findings of the Deterministic Claims Engine are legally binding. Restitution, if awarded, is executed automatically via smart contract routing from the Capital Waterfall directly to the injured Counterparty&apos;s verified banking node.</li>
      </ul>

      {/* ── Article 5 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 5: LIMITATIONS OF PLATFORM EXPOSURE</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">5.1. Aggregate Liability Cap:</strong> Under no circumstances shall AurumShield&apos;s total aggregate liability to any Counterparty — whether in contract, tort, or otherwise — exceed the total recoverable limits of our active institutional reinsurance policies explicitly covering the specific failure event at the time the claim was filed.</li>
        <li><strong className="text-white">5.2. Exclusion of Consequential Damages:</strong> AurumShield shall not be liable for any indirect, incidental, punitive, or consequential damages, including but not limited to lost profits, lost institutional revenue, or reputational damage arising from a delayed settlement, unexecuted trade, or delivery failure, regardless of whether AurumShield was advised of the possibility of such damages.</li>
      </ul>
    </>
  );
}
