import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AML / KYC Policy | AurumShield",
  description:
    "Anti-Money Laundering and Know Your Customer Policy for the AurumShield deterministic gold clearing infrastructure.",
};

export default function AmlKycPage() {
  return (
    <>
      {/* ── Document Header ── */}
      <div className="border-b border-slate-800 pb-8 mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">LEGAL INFRASTRUCTURE</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
          Anti-Money Laundering (AML) &amp; Know Your Customer (KYC) Policy
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
        This Anti-Money Laundering and Know Your Customer Policy (&ldquo;Policy&rdquo;) outlines the compliance frameworks, technological gating mechanisms, and regulatory protocols enforced by AurumShield (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
      </p>
      <p className="text-gray-300 leading-relaxed mb-10">
        AurumShield operates an institutional-grade deterministic clearinghouse for physical commodities and fiat capital. As such, we are unequivocally committed to full compliance with all applicable global financial regulations, including the United States Bank Secrecy Act (BSA), the USA PATRIOT Act, directives enforced by the Financial Crimes Enforcement Network (FinCEN), the Office of Foreign Assets Control (OFAC), and the Financial Action Task Force (FATF) recommendations.
      </p>

      {/* ── Article 1 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 1: ZERO-TOLERANCE PHILOSOPHY AND SCOPE</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">1.1. Absolute Prohibition:</strong> AurumShield maintains a strict, zero-tolerance policy against money laundering, terrorist financing, sanctions evasion, bribery, corruption, and all other forms of illicit financial activity.</li>
        <li><strong className="text-white">1.2. Institutional Restriction:</strong> The Platform is strictly geofenced and restricted to verified, accredited institutional counterparties. At no time will AurumShield permit retail consumers, anonymous entities, or shell corporations lacking demonstrable physical operational headquarters to utilize the clearing ledger or DvP escrow.</li>
      </ul>

      {/* ── Article 2 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 2: CUSTOMER IDENTIFICATION PROGRAM (CIP) &amp; CORPORATE KYC</h2>
      <p className="text-gray-300 leading-relaxed mb-4">Before any Counterparty is permitted to access the Platform, execute a trade, or route fiat capital, they must satisfy our exhaustive Customer Identification Program.</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">2.1. Corporate Entity Verification:</strong> Counterparties must submit certified articles of incorporation, active Legal Entity Identifiers (LEI), certificates of good standing, operating agreements, and audited financials.</li>
        <li><strong className="text-white">2.2. Ultimate Beneficial Owner (UBO) Disclosures:</strong> AurumShield mandates complete structural transparency. Counterparties must identify and provide comprehensive KYC documentation for any individual or entity holding an equity, voting, or controlling interest of 10% or greater in the Counterparty.</li>
        <li><strong className="text-white">2.3. Authorized Signatories:</strong> Executive officers and authorized traders (&ldquo;Makers&rdquo; and &ldquo;Checkers&rdquo;) must be cryptographically bound to the corporate entity utilizing verified digital signatures and contract lifecycle management protocols (via our sub-processor, DocuSign CLM).</li>
      </ul>

      {/* ── Article 3 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 3: FORENSIC AND BIOMETRIC VERIFICATION INFRASTRUCTURE</h2>
      <p className="text-gray-300 leading-relaxed mb-4">To mitigate the risks of synthetic identities and forged corporate documentation, AurumShield employs advanced, third-party forensic sub-processors during the onboarding and re-verification lifecycles:</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">3.1. Biometric Liveness:</strong> Utilizing our identity partner Persona, authorized officers and UBOs are subjected to active biometric facial geometry mapping and liveness checks, checked against government-issued identity documents to definitively prove identity.</li>
        <li><strong className="text-white">3.2. Document Forensics:</strong> Utilizing our cryptographic validation partner Diro, all uploaded bank statements, utility bills, and corporate filings are subjected to origin tracing and cryptographic forgery analysis to ensure data provenance directly from the issuing institution.</li>
      </ul>

      {/* ── Article 4 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 4: THE COMPLIANCE GATING ARCHITECTURE</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">4.1. Deterministic State Machine:</strong> AurumShield operates a proprietary &ldquo;Compliance Gate&rdquo; natively integrated into the clearing ledger. Compliance is not merely a policy; it is a mathematical prerequisite for platform utilization.</li>
        <li><strong className="text-white">4.2. Operational Locking:</strong> A transaction cannot be initiated, nor can the Delivery versus Payment (DvP) escrow be locked, unless both the Buyer and the Seller possess an uninterrupted &ldquo;Verified and Active&rdquo; compliance state. If a Counterparty&apos;s compliance state drops to &ldquo;Pending,&rdquo; &ldquo;Suspended,&rdquo; or &ldquo;Flagged&rdquo; at any millisecond prior to Atomic Settlement, the deterministic engine will automatically halt the transaction, freeze in-flight capital routing, and suspend logistics dispatch.</li>
      </ul>

      {/* ── Article 5 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 5: CONTINUOUS MONITORING AND SANCTIONS SCREENING</h2>
      <p className="text-gray-300 leading-relaxed mb-4 font-semibold border-l-2 border-gold pl-4">KYC at AurumShield is not a one-time onboarding event; it is a continuous, automated lifecycle.</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">5.1. Real-Time Screening:</strong> Counterparties, UBOs, and associated banking nodes (routed via Moov) are continuously screened via automated API feeds against global watchlists, including but not limited to OFAC Specially Designated Nationals (SDN), UN Security Council resolutions, the EU Consolidated List, and UK HM Treasury lists.</li>
        <li><strong className="text-white">5.2. Adverse Media and PEPs:</strong> We conduct ongoing screening for Politically Exposed Persons (PEPs) and negative/adverse media coverage indicating potential involvement in financial crime or regulatory censure. Matches trigger immediate account suspension pending manual review by AurumShield&apos;s Chief Compliance Officer.</li>
      </ul>

      {/* ── Article 6 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 6: ASSET FREEZING AND SUSPICIOUS ACTIVITY REPORTING (SAR)</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">6.1. Regulatory Reporting:</strong> AurumShield monitors intraday trade velocity, capital deployment anomalies, and physical logistics routing for suspicious patterns. Where required by law, AurumShield will file Suspicious Activity Reports (SARs) or equivalent disclosures to FinCEN and relevant domestic or international law enforcement agencies.</li>
        <li><strong className="text-white">6.2. No &ldquo;Tipping Off&rdquo;:</strong> By law, AurumShield is strictly prohibited from informing a Counterparty that they are the subject of a SAR, a regulatory subpoena, or an active law enforcement investigation.</li>
        <li><strong className="text-white">6.3. Right to Freeze:</strong> Counterparty explicitly acknowledges that in the event of a severe compliance breach, suspected fraud, or legal mandate, AurumShield possesses the unilateral right to freeze fiat capital held in the banking adapter, halt the transfer of physical commodity titles within the DvP escrow, and reroute physical logistics shipments to a secure holding facility pending regulatory resolution.</li>
      </ul>

      {/* ── Article 7 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 7: RECORD RETENTION</h2>
      <p className="text-gray-300 leading-relaxed mb-8">
        In strict accordance with the Bank Secrecy Act and international financial regulations, all KYC/AML documentation, biometric verification logs, continuous screening results, and transactional clearing ledgers are retained securely for a minimum of seven (7) years following the termination of the Counterparty relationship, irrespective of standard data deletion requests.
      </p>

      {/* ── Disclaimer ── */}
      <div className="mt-16 border-t border-slate-800 pt-8">
        <p className="text-xs text-slate-600 leading-relaxed italic">
          Disclaimer: This document was generated based on the specific operational architecture of the AurumShield platform. Because this governs institutional financial compliance and FinCEN reporting standards, a licensed legal professional specializing in FinTech regulation, Commodities, and Anti-Money Laundering law must review and finalize this document before it is published or utilized.
        </p>
      </div>
    </>
  );
}
