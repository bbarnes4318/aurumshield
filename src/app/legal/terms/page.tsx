import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | AurumShield",
  description:
    "Master Service Agreement and Terms of Use for the AurumShield deterministic gold clearing infrastructure.",
};

export default function TermsPage() {
  return (
    <>
      {/* ── Document Header ── */}
      <div className="border-b border-slate-800 pb-8 mb-12">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold mb-4">
          {"// "}LEGAL INFRASTRUCTURE
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
          Master Service Agreement &amp; Terms of Use
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
        This Master Service Agreement and Terms of Use (the &ldquo;Agreement&rdquo;) constitutes a legally binding contract between AurumShield (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) and the institutional entity executing this Agreement or accessing the Platform (&ldquo;Counterparty,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;).
      </p>

      <p className="text-gray-300 leading-relaxed mb-10 font-semibold border-l-2 border-gold pl-4">
        CAREFULLY READ THIS AGREEMENT. BY REGISTERING FOR AN ACCOUNT, EXECUTING A TRANSACTION, OR OTHERWISE UTILIZING THE PLATFORM, YOU EXPRESSLY AGREE TO BE BOUND BY THE TERMS, CONDITIONS, AND STIPULATIONS CONTAINED HEREIN.
      </p>

      {/* ── Article 1 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 1: DEFINITIONS</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">1.1. &ldquo;Atomic Settlement&rdquo;</strong> means the instantaneous, simultaneous, and irrevocable exchange of fiat capital and physical commodity title facilitated by AurumShield&apos;s deterministic ledger.</li>
        <li><strong className="text-white">1.2. &ldquo;DvP Escrow&rdquo;</strong> refers to the Delivery versus Payment cryptographic and banking escrow infrastructure operated by AurumShield, which secures Counterparty funds and commodity titles prior to execution.</li>
        <li><strong className="text-white">1.3. &ldquo;LBMA Oracle&rdquo;</strong> refers to the automated data feeds supplying real-time and fix pricing from the London Bullion Market Association, utilized by the Platform for trade execution and margin calculation.</li>
        <li><strong className="text-white">1.4. &ldquo;Platform&rdquo;</strong> means the AurumShield proprietary deterministic gold clearing infrastructure, marketplace, application programming interfaces (APIs), and associated logistical networks.</li>
        <li><strong className="text-white">1.5. &ldquo;Reinsurance Waterfall&rdquo;</strong> means the tiered capital protection structure, including counterparty margin, logistics insurance policies, and AurumShield&apos;s default fund, utilized to resolve settlement and delivery breaches.</li>
      </ul>

      {/* ── Article 2 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 2: INSTITUTIONAL ELIGIBILITY AND ONBOARDING</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">2.1. Strict Institutional Restriction:</strong> Access to the Platform is expressly restricted to verified institutional entities, including accredited commodities brokers, financial institutions, and corporate treasuries. Retail consumer participation is strictly prohibited.</li>
        <li><strong className="text-white">2.2. KYC/AML Compliance Gate:</strong> Counterparty agrees to submit to rigorous continuous identity and compliance verification. This includes providing exhaustive Ultimate Beneficial Owner (UBO) documentation, biometric liveness checks (via providers such as Persona and Diro), and corporate forensics. AurumShield reserves the absolute right to reject any application or suspend any active account that fails to meet our proprietary compliance gating standards or triggers adverse media/sanctions alerts.</li>
        <li><strong className="text-white">2.3. Maker/Checker Authorization:</strong> Counterparty shall implement and utilize the Platform&apos;s role-based access controls (RBAC) and Maker/Checker workflow authorizations. Counterparty is strictly and solely liable for all actions, trades, and instructions executed under its provisioned credentials. AurumShield shall bear no liability for unauthorized access resulting from Counterparty&apos;s internal credential mismanagement or corporate fraud.</li>
      </ul>

      {/* ── Article 3 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 3: CLEARING, SETTLEMENT, AND DVP ESCROW</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">3.1. Trade Execution and Pricing:</strong> All marketplace transactions are executed utilizing the LBMA Oracle. Counterparty acknowledges that commodities markets are highly volatile. AurumShield is not liable for price slippage, latency, or interruptions in third-party pricing feeds prior to the locking of a transaction.</li>
        <li><strong className="text-white">3.2. Delivery versus Payment (DvP) Mechanics:</strong> Upon initiation of a trade, Counterparty capital and/or commodity titles are cryptographically and financially locked in the DvP Escrow. AurumShield&apos;s deterministic engine will not release assets to either party until all algorithmic conditions of the transaction are fully satisfied.</li>
        <li><strong className="text-white">3.3. Settlement Finality:</strong> Once the Atomic Settlement parameters are met and logged onto the AurumShield clearing ledger, the transaction is absolute, irrevocable, and final. Counterparties may not reverse, cancel, or chargeback a settled transaction under any circumstances.</li>
        <li><strong className="text-white">3.4. Capital Controls and Margin:</strong> AurumShield dynamically enforces intraday settlement checks. We reserve the right, at our sole discretion, to reject transactions, halt trading, or require additional margin posting if a Counterparty approaches or breaches established risk limits.</li>
      </ul>

      {/* ── Article 4 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 4: PHYSICAL LOGISTICS AND TRANSFER OF TITLE</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">4.1. Title Transfer:</strong> Legal ownership, title, and all associated rights to the physical gold transfer instantaneously from the Seller to the Buyer strictly upon the successful execution of the Atomic Settlement on the AurumShield ledger, irrespective of the physical location of the asset at that exact millisecond.</li>
        <li><strong className="text-white">4.2. Secure Transit:</strong> AurumShield integrates with designated secure logistics providers (including Brink&apos;s and EasyPost) across pre-approved delivery corridors. Counterparty agrees to abide by all packaging, manifesting, and routing rules mandated by the Platform and the respective carriers.</li>
        <li><strong className="text-white">4.3. Limitation of Transit Liability:</strong> Counterparty explicitly acknowledges that AurumShield is a clearing and software infrastructure provider, not a physical logistics carrier. Risk of loss, damage, or theft during physical transit is governed by, and liability is strictly capped at, the specific insurance rider and coverage limits of the utilized logistics carrier. AurumShield assumes no direct liability for physical loss in transit.</li>
      </ul>

      {/* ── Article 5 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 5: DETERMINISTIC CLAIMS ENGINE AND REINSURANCE</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">5.1. Actuarial Resolution:</strong> In the event of a delivery breach, settlement failure, or verified assay dispute, Counterparties must submit a claim exclusively through the Platform.</li>
        <li><strong className="text-white">5.2. Algorithmic Adjudication:</strong> Claims are adjudicated by AurumShield&apos;s deterministic claims engine, which analyzes immutable audit logs, telemetry, and chain-of-custody data. Counterparty agrees to accept the findings of the deterministic claims engine as binding.</li>
        <li><strong className="text-white">5.3. Reinsurance Waterfall Limits:</strong> Should a Counterparty suffer a verified loss due to a systemic Platform failure or counterparty default, restitution shall be allocated strictly according to the Reinsurance Waterfall. AurumShield&apos;s maximum aggregate liability shall never exceed the limits of our active institutional reinsurance policies explicitly covering the specific failure event.</li>
      </ul>

      {/* ── Article 6 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 6: REPRESENTATIONS AND WARRANTIES</h2>
      <p className="text-gray-300 leading-relaxed mb-8">
        Counterparty represents and warrants that: (a) it is a duly organized and validly existing institutional entity; (b) it has full legal authority to enter into this Agreement and trade physical commodities; (c) the capital utilized for transactions is legally obtained and free of any liens; and (d) it is not subject to any international sanctions (e.g., OFAC, UN, EU).
      </p>

      {/* ── Article 7 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 7: LIMITATION OF LIABILITY AND INDEMNIFICATION</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">7.1. Force Majeure:</strong> AurumShield shall not be held liable for any delay, settlement failure, or loss caused by events beyond our reasonable control, including but not limited to acts of God, sovereign embargoes, global banking network outages (e.g., SWIFT/Moov failures), systemic internet failures, or acts of war.</li>
        <li><strong className="text-white">7.2. Indemnification:</strong> Counterparty agrees to indemnify, defend, and hold harmless AurumShield, its officers, directors, and sub-processors from and against any claims, losses, fines, or damages arising out of Counterparty&apos;s breach of this Agreement, violation of AML regulations, or physical handling/assay fraud.</li>
      </ul>

      {/* ── Article 8 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 8: GOVERNING LAW AND DISPUTE RESOLUTION</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">8.1. Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.</li>
        <li><strong className="text-white">8.2. Binding Arbitration:</strong> Any dispute, controversy, or claim arising out of or relating to this Agreement, or the breach thereof, which cannot be resolved by the deterministic claims engine, shall be settled by binding arbitration administered by the American Arbitration Association (AAA) in accordance with its Commercial Arbitration Rules.</li>
      </ul>

      {/* ── Disclaimer ── */}
      <div className="mt-16 border-t border-slate-800 pt-8">
        <p className="text-xs text-slate-600 leading-relaxed italic">
          Disclaimer: This document was generated based on the specific operational architecture of the AurumShield platform. Because this governs institutional finance, physical commodities, and clearing operations, a licensed legal professional specializing in FinTech and Commodities law must review and finalize this document before it is published or executed by counterparties.
        </p>
      </div>
    </>
  );
}
