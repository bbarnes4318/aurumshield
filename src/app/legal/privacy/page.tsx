import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AurumShield",
  description:
    "Privacy and Data Protection Policy for the AurumShield deterministic gold clearing infrastructure.",
};

export default function PrivacyPage() {
  return (
    <>
      {/* ── Document Header ── */}
      <div className="border-b border-slate-800 pb-8 mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-8 bg-gold/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">LEGAL INFRASTRUCTURE</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
          Privacy &amp; Data Protection Policy
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
        This Privacy and Data Protection Policy (&ldquo;Policy&rdquo;) explains how AurumShield (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, retains, and discloses personal, corporate, and biometric information when you access or utilize the AurumShield deterministic gold clearing infrastructure, marketplace, and associated application programming interfaces (collectively, the &ldquo;Platform&rdquo;).
      </p>
      <p className="text-gray-300 leading-relaxed mb-10">
        Given the institutional financial nature of the Platform, we are subject to strict regulatory frameworks, including but not limited to the Bank Secrecy Act (BSA), FinCEN regulations, the General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA). By accessing the Platform, the institutional entity and its authorized users (&ldquo;Counterparty,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) consent to the rigorous data practices outlined herein.
      </p>

      {/* ── Article 1 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 1: CATEGORIES OF INFORMATION WE COLLECT</h2>
      <p className="text-gray-300 leading-relaxed mb-4">To operate a compliant Delivery versus Payment (DvP) clearinghouse and execute physical commodities settlements, AurumShield collects highly sensitive, granular data:</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">1.1. Corporate &amp; Institutional Identity Data:</strong> Legal entity names, Legal Entity Identifiers (LEI), certificates of incorporation, tax identification numbers, physical headquarters addresses, and capitalization table structures.</li>
        <li><strong className="text-white">1.2. Ultimate Beneficial Owner (UBO) &amp; Officer Data:</strong> Government-issued identification (passports, driver&apos;s licenses), residential addresses, dates of birth, and tax IDs for corporate directors, executive officers, and individuals holding a controlling equity interest.</li>
        <li><strong className="text-white">1.3. Biometric and Forensic Data:</strong> Facial geometry, liveness check video feeds, and cryptographic document forensics utilized during onboarding and re-verification events.</li>
        <li><strong className="text-white">1.4. Financial and Transactional Data:</strong> Corporate banking details, routing and account numbers, intraday capital margin states, trading histories, settlement ledger logs, and actuarial risk assessments.</li>
        <li><strong className="text-white">1.5. Technical, Telemetry, and Security Data:</strong> Device fingerprinting, IP addresses, geolocation data, browser metadata, hardware security module (HSM) attestations, and immutable cryptographic audit logs recording all Maker/Checker authorizations.</li>
      </ul>

      {/* ── Article 2 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 2: HOW WE USE YOUR INFORMATION</h2>
      <p className="text-gray-300 leading-relaxed mb-4">AurumShield operates on a &ldquo;strict necessity&rdquo; basis. We process the collected data exclusively for the following purposes:</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">Execution of Core Services:</strong> Facilitating atomic settlement, operating the DvP escrow, managing physical logistics corridors, and running the deterministic claims engine.</li>
        <li><strong className="text-white">Regulatory Compliance:</strong> Conducting initial and continuous KYC/AML screening against global sanctions lists (e.g., OFAC, UN), Politically Exposed Persons (PEP) databases, and adverse media watchlists.</li>
        <li><strong className="text-white">Fraud Prevention &amp; Security:</strong> Enforcing role-based access controls (RBAC), detecting synthetic identity fraud through biometric liveness checks, and preventing unauthorized corporate treasury actions.</li>
        <li><strong className="text-white">System Integrity:</strong> Populating our immutable audit ledgers and actuarial risk models to ensure the systemic stability of the clearinghouse.</li>
      </ul>

      {/* ── Article 3 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 3: DATA SHARING AND ENTERPRISE SUB-PROCESSORS</h2>
      <p className="text-gray-300 leading-relaxed mb-4 font-semibold border-l-2 border-gold pl-4">AurumShield does not and will never sell Counterparty data.</p>
      <p className="text-gray-300 leading-relaxed mb-4">We share data strictly with certified enterprise sub-processors required to operate the Platform&apos;s infrastructure:</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">Identity &amp; Compliance Verification:</strong> Data is shared with Veriff and Diro to execute automated biometric liveness checks, forensic document verification, and continuous AML screening.</li>
        <li><strong className="text-white">Banking &amp; Escrow Routing:</strong> Financial data is transmitted via secure APIs to Moov (and associated banking partners) to facilitate fiat capital holds, escrow locking, and final settlement routing.</li>
        <li><strong className="text-white">Physical Logistics:</strong> Necessary delivery manifests, containing physical addresses and authorized receiving personnel contact details, are shared with secure transit providers, including Brink&apos;s and EasyPost.</li>
        <li><strong className="text-white">Contract Management:</strong> Authorized signatory data is processed via DocuSign CLM for the execution of institutional agreements and Maker/Checker authorizations.</li>
        <li><strong className="text-white">Law Enforcement &amp; Regulatory Bodies:</strong> We will disclose data, without prior notice, to agencies such as FinCEN, the SEC, or international equivalents, to comply with Subpoenas, Suspicious Activity Reports (SARs), or other lawful mandates.</li>
      </ul>

      {/* ── Article 4 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 4: DATA RETENTION AND IMMUTABLE LEDGERS</h2>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-8">
        <li><strong className="text-white">4.1. Regulatory Retention Periods:</strong> Due to our status as financial infrastructure, Counterparty and UBO data, transaction histories, and identity verification records are legally required to be retained for a minimum of seven (7) years following the termination of the Counterparty&apos;s account.</li>
        <li><strong className="text-white">4.2. Immutable Ledger Architecture:</strong> Counterparties acknowledge that AurumShield utilizes immutable cryptographic ledgers for transactional and compliance audit trails. Data committed to the clearing ledger or deterministic claims engine cannot be structurally deleted, altered, or modified.</li>
      </ul>

      {/* ── Article 5 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 5: INTERNATIONAL DATA TRANSFERS</h2>
      <p className="text-gray-300 leading-relaxed mb-8">
        As a global clearing network, data may be transferred to, and processed in, the United States and other jurisdictions. For Counterparties operating within the European Economic Area (EEA) or the United Kingdom, AurumShield utilizes Standard Contractual Clauses (SCCs) and rigorous encryption-in-transit (TLS 1.3) and encryption-at-rest (AES-256) to ensure cross-border transfers comply with GDPR adequacy requirements.
      </p>

      {/* ── Article 6 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 6: YOUR PRIVACY RIGHTS AND LIMITATIONS</h2>
      <p className="text-gray-300 leading-relaxed mb-4">Depending on your jurisdiction (e.g., GDPR, CCPA), you may have rights to access, correct, or request the deletion of your personal data.</p>
      <p className="text-gray-300 leading-relaxed mb-8 font-semibold border-l-2 border-gold pl-4">
        Crucial Exemption: Because AurumShield is a heavily regulated financial platform, your &ldquo;Right to Erasure&rdquo; (Right to be Forgotten) is explicitly superseded by our legal obligations under Anti-Money Laundering (AML) laws, the Bank Secrecy Act, and the technical realities of our immutable audit ledgers. Requests for deletion will only be honored for marketing communications or data not strictly tied to compliance or financial execution.
      </p>

      {/* ── Article 7 ── */}
      <h2 className="text-xl font-bold text-white mt-12 mb-4">ARTICLE 7: DATA SECURITY</h2>
      <p className="text-gray-300 leading-relaxed mb-4">AurumShield implements institutional-grade security architectures, including but not limited to:</p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
        <li>Mandatory Multi-Factor Authentication (MFA) and Maker/Checker thresholds.</li>
        <li>Cryptographic hashing of sensitive database fields.</li>
        <li>Continuous penetration testing and zero-trust internal network policies.</li>
      </ul>
      <p className="text-gray-300 leading-relaxed mb-8">
        However, no system is entirely impenetrable. Counterparties are strictly responsible for maintaining the confidentiality of their internal credentials and API keys.
      </p>
    </>
  );
}
