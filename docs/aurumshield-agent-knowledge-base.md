# AURUMSHIELD — AI AGENT KNOWLEDGE BASE

**Version:** 1.0
**Last Updated:** February 27, 2026
**Classification:** Internal — AI Agent Operational Reference

---

## SECTION 1: PLATFORM IDENTITY & POSITIONING

**Question: What is AurumShield?**
Answer: AurumShield is an institutional-grade deterministic physical gold clearinghouse and settlement infrastructure. It provides a marketplace for buying and selling physical gold, backed by a robust Delivery versus Payment, or D V P, escrow system. It manages end-to-end clearing, risk management, capital controls, and physical logistics. AurumShield is not a retail consumer product. It is private clearing infrastructure reserved for qualified institutional participants, sovereign entities, and tier-1 liquidity providers.

**Question: Who is AurumShield designed for?**
Answer: AurumShield is designed exclusively for institutional counterparties. This includes accredited commodities brokers, financial institutions, corporate treasuries, sovereign wealth funds, ultra-high-net-worth asset managers, and prime brokerages. Retail consumer participation is strictly prohibited. Individual broker-dealers may also apply through our vetting process.

**Question: What makes AurumShield different from other gold trading platforms?**
Answer: AurumShield is not a trading platform in the traditional sense. It is a sovereign-grade clearing infrastructure. The key differentiators are: first, our Delivery versus Payment escrow eliminates bilateral counterparty risk entirely, which is known as Herstatt Risk. Second, we use a deterministic settlement engine where trades are mathematically verified before execution. Third, all gold is transported exclusively through armored sovereign-grade carriers like Malca-Amit and Brinks. Fourth, every transaction is cryptographically audited with S H A 256 hash chains. Fifth, compliance is not a policy layer, it is a mathematical prerequisite hardcoded into the settlement ledger.

**Question: Is AurumShield a broker or an exchange?**
Answer: No. AurumShield is a clearinghouse and settlement infrastructure provider. We do not take proprietary positions in the market, we do not provide investment advice, and we do not custody client funds outside of the D V P escrow window. We are the neutral, deterministic layer that sits between institutional buyers and sellers to guarantee settlement finality.

**Question: What is the website address for AurumShield?**
Answer: The main marketing site is aurumshield.vip. The application platform for active institutional clients is located at app.aurumshield.vip.

---

## SECTION 2: CLEARING ARCHITECTURE & SETTLEMENT

**Question: What is Delivery versus Payment, or D V P, Escrow?**
Answer: Delivery versus Payment is our core escrow architecture. It ensures that fiat capital and physical commodity titles are cryptographically locked simultaneously. Funds and assets are never released to either party until all mathematical and compliance conditions of the trade are met on our ledger. This completely eliminates Herstatt Risk, which is the risk that one party delivers an asset but the other party fails to pay.

**Question: What is Atomic Settlement?**
Answer: Atomic Settlement is the instantaneous, simultaneous, and irrevocable exchange of funds and commodity title. Once executed by the deterministic engine, the settlement is final and cannot be reversed, cancelled, or charged back under any circumstances.

**Question: What is Herstatt Risk and how does AurumShield eliminate it?**
Answer: Herstatt Risk, also called Settlement Risk, occurs in traditional trading when the delivery of an asset and the payment for that asset happen at different times. This creates a window where one counterparty has delivered but the other has not yet paid. AurumShield's D V P escrow architecture mathematically eliminates this risk by ensuring neither fiat capital nor physical commodity titles are released until all conditions are simultaneously and atomically satisfied.

**Question: Where does your pricing data come from?**
Answer: All marketplace pricing, trade execution, and margin calculations are powered by multi-oracle medianized pricing. We aggregate real-time data from three institutional sources: Bloomberg B-PIPE, Refinitiv, and OANDA. We also utilize fix pricing from the London Bullion Market Association, or L B M A. A 15 basis point circuit breaker automatically triggers a marketplace FREEZE if pricing feed divergence exceeds safe thresholds.

**Question: What is the collateral requirement for trades?**
Answer: Before a price lock, the buyer's firm must post 5 percent collateral from their Corporate Wallet. This fractional collateral requirement replaces legacy 100 percent pre-funding models, drastically unlocking capital efficiency and improving Return on Equity for participating trading desks. The collateral is managed through our capital engine and does not compromise the escrow's integrity.

**Question: What is capital efficiency and how does AurumShield improve it?**
Answer: Capital efficiency refers to how effectively an institution can deploy its capital. Traditional physical gold trading requires 100 percent pre-funding, locking up the full notional value of a trade. AurumShield's 5 percent collateral lock system frees up 95 percent of that capital for other operations while maintaining full escrow protection through our D V P architecture. This significantly improves Return on Equity for trading desks.

**Question: What happens if a wire transfer fails after settlement?**
Answer: If a wire transfer fails after the T plus 1 settlement window, the system automatically transitions the trade to SLASH_COLLATERAL status. This means the defaulting organization's posted collateral is seized to penalize the default and protect the non-defaulting counterparty. The collateral is allocated according to our Reinsurance Capital Waterfall.

**Question: What is Immutable Settlement Finality?**
Answer: Once a trade is settled on the AurumShield clearing ledger, a Gold Clearing Certificate is issued. This certificate is cryptographically signed with S H A 256, and in production environments, additionally signed with A W S K M S E C D S A. The certificate is written to an append-only ledger and serves as definitive, tamper-evident proof of the settlement for both regulatory and audit purposes.

**Question: What settlement rails does AurumShield use?**
Answer: AurumShield operates a dual-rail settlement architecture. The primary rail is Modern Treasury, which processes payments via Fedwire, the Federal Reserve's real-time gross settlement system. The secondary rail is Moov, which handles wallet-to-wallet transfers. For transactions of 250 thousand dollars or more, Modern Treasury is automatically selected. The system includes automatic failover, so if one rail is unavailable, the other takes over seamlessly. Each payout carries a deterministic S H A 256 idempotency key to prevent duplicate transactions.

---

## SECTION 3: TRANSACTION LIFECYCLE

**Question: What are the steps in a gold transaction on AurumShield?**
Answer: Every gold transaction follows an eight-step deterministic pipeline. Step one is Entity and Account Creation, where organizations register with their Legal Entity Identifier and undergo identity verification. Step two is Know Your Business verification through our K Y B engine. Step three is Compliance Case Approval, where a formal case must reach APPROVED status. Step four is Marketplace and Price Discovery, where L B M A verified gold is listed. Step five is Collateral Lock and Price Lock, where the 5 percent collateral is posted. Step six is Maker Checker Approval and D V P Execution, where the trade is approved and settled. Step seven is Sovereign Armored Logistics, where physical gold is transported via Malca-Amit or Brinks. Step eight is Delivery Confirmation and Certificate issuance.

**Question: Can a trade be reversed or cancelled after settlement?**
Answer: No. Once Atomic Settlement has been executed and recorded on the AurumShield clearing ledger, the transaction is absolute, irrevocable, and final. Counterparties cannot reverse, cancel, or chargeback a settled transaction under any circumstances.

**Question: What happens if I want to cancel a trade before settlement?**
Answer: A trade can be cancelled before settlement only if it has not yet reached the APPROVED_UNSETTLED state. Once an order transitions past PENDING_CHECKER_APPROVAL and is approved by the Treasury officer, the settlement process becomes automatic and cannot be interrupted.

**Question: What is the Trade State Machine?**
Answer: Every order on AurumShield transitions through a strict state machine defined in our settlement engine. The states are: DRAFT, then PENDING_COLLATERAL, then PENDING_CHECKER_APPROVAL, then APPROVED_UNSETTLED, then SETTLEMENT_PENDING, and finally SETTLED. Terminal failure states include SLASH_COLLATERAL for wire failures, REJECTED_COMPLIANCE for compliance failures, CANCELLED for pre-settlement cancellations, and FAILED for system errors. Only authorized roles can trigger each transition, and any illegal transition attempt generates a forensic alert with full actor and entity context.

**Question: What is a Gold Clearing Certificate?**
Answer: A Gold Clearing Certificate is the final, immutable record of a completed settlement. It is issued by the certificate engine after confirmed delivery. Each certificate has a unique identifier in the format A S dash G C dash date dash 8 hexadecimal characters dash sequence number. The payload is serialized and signed with S H A 256. In production, it is additionally signed with A W S K M S E C D S A for non-repudiation. Each certificate includes the buyer and seller L E I numbers, asset details, fee breakdown, and which settlement rail was used.

---

## SECTION 4: KYC, AML & COMPLIANCE GATING

**Question: What is the onboarding process for new counterparties?**
Answer: Onboarding is strictly institutional. Counterparties must complete rigorous identity verification, including submitting certified articles of incorporation, active Legal Entity Identifiers, certificates of good standing, operating agreements, and complete Ultimate Beneficial Owner disclosures for any individual or entity holding a 10 percent or greater controlling interest.

**Question: How does AurumShield verify identities and prevent fraud?**
Answer: We utilize multiple enterprise partners for verification. We use Persona to conduct biometric facial liveness checks on corporate officers and Ultimate Beneficial Owners. We use Diro to perform cryptographic document forensics on uploaded bank statements, utility bills, and corporate filings to detect forged documents and verify data provenance. We use the G L E I F A P I for deterministic Legal Entity Identifier resolution. We use Fingerprint dot com for device trust fingerprinting and bot detection. We use A W S Textract for optical character recognition verification of documents.

**Question: What is the Compliance Gate?**
Answer: The Compliance Gate is a mathematical prerequisite built natively into the settlement ledger. Compliance is not merely a policy layer. It is an algorithmic precondition for platform utilization. A transaction cannot be initiated, and the D V P escrow cannot be locked, unless both the buyer and the seller possess an active, verified compliance state. If either party's compliance state drops to Pending, Suspended, or Flagged at any millisecond prior to settlement, the deterministic engine automatically halts the transaction, freezes in-flight capital routing, and suspends logistics dispatch.

**Question: What compliance states exist?**
Answer: The compliance case model progresses through a confined state machine: OPEN, then PENDING_USER, then PENDING_PROVIDER, then UNDER_REVIEW, and finally APPROVED. Only counterparties with an APPROVED compliance case can access protected platform capabilities.

**Question: What is the Capability Ladder?**
Answer: The Capability Ladder is a progressive access control system. Institutional accounts unlock capabilities in a strict sequence: BROWSE, then QUOTE, then LOCK_PRICE, then EXECUTE_PURCHASE, then SETTLE. Protected capabilities from LOCK_PRICE and above require a database-verified APPROVED compliance case, a valid Legal Entity Identifier, and the correct organizational role. If any of these requirements are missing, access is denied by default.

**Question: What is Maker Checker authorization?**
Answer: To prevent internal corporate fraud and unauthorized actions, institutional accounts utilize a Maker Checker workflow. The Trader, known as the Maker, initiates an action such as submitting a trade. A separate Treasury officer, known as the Checker, must then review and cryptographically approve the action via a just-in-time Web Authn passkey signature. This signature is bound to the S H A 256 payload of the settlement document. The platform also integrates DocuSign C L M to generate the Master Bill of Sale natively.

**Question: What sanctions screening does AurumShield perform?**
Answer: AurumShield performs continuous automated sanctions screening. This is not a one-time onboarding event. Counterparties, Ultimate Beneficial Owners, and associated banking nodes are continuously screened against: O F A C Specially Designated Nationals, United Nations Security Council resolutions, the E U Consolidated List, U K H M Treasury lists, and Australian D F A T watchlists. We also conduct ongoing screening for Politically Exposed Persons and adverse media coverage. A match triggers immediate account suspension pending manual review.

**Question: Does AurumShield file Suspicious Activity Reports?**
Answer: Yes. AurumShield monitors intraday trade velocity, capital deployment anomalies, and physical logistics routing for suspicious patterns. Where required by law, we file Suspicious Activity Reports, or S A Rs, with FinCEN and relevant domestic or international law enforcement agencies. By law, AurumShield is strictly prohibited from informing a counterparty that they are the subject of a S A R, a regulatory subpoena, or an active law enforcement investigation.

**Question: Can AurumShield freeze my account or assets?**
Answer: Yes. In the event of a severe compliance breach, suspected fraud, or legal mandate, AurumShield possesses the unilateral right to freeze fiat capital held in the banking adapter, halt the transfer of physical commodity titles within the D V P escrow, and reroute physical logistics shipments to a secure holding facility pending regulatory resolution.

**Question: How long does AurumShield retain K Y C and compliance records?**
Answer: In strict accordance with the Bank Secrecy Act and international financial regulations, all K Y C and A M L documentation, biometric verification logs, continuous screening results, and transactional clearing ledgers are retained securely for a minimum of seven years following the termination of a counterparty relationship, irrespective of standard data deletion requests.

**Question: What authentication methods does the platform use?**
Answer: AurumShield enforces authentication via Hardware Keys and Web Authn passkeys, as well as Enterprise Single Sign-On through S A M L and O I D C protocols, supporting providers like Okta and Microsoft Entra I D. Traditional S M S one-time passwords have been fully removed from the platform for security reasons.

---

## SECTION 5: MARKETPLACE & GOLD STANDARDS

**Question: What quality standards does AurumShield require for gold listings?**
Answer: All gold listed on the AurumShield marketplace must be L B M A Good Delivery verified. This means the gold has been refined by one of the 34 or more refiners accredited by the London Bullion Market Association. The platform verifies each refiner against the official L B M A Good Delivery List.

**Question: What evidence is required for each gold listing?**
Answer: Every listing requires three mandatory evidence types: a certified Assay Report confirming purity and weight, a Chain of Custody document proving provenance, and a Seller Attestation signed through DocuSign C L M. Listings cannot be published on the marketplace without all three evidence types validated.

**Question: How is gold purity and weight verified?**
Answer: Purity and weight are verified through the mandatory Assay Report provided by accredited refiners. If a buyer receives gold and disputes the purity or weight, they may file a formal assay dispute claim within 48 hours through the platform, which is resolved by our Deterministic Claims Engine.

---

## SECTION 6: FINANCIALS, BANKING & CAPITAL CONTROLS

**Question: How does the platform handle fiat capital and wire transfers?**
Answer: AurumShield integrates with enterprise banking adapters. Our primary banking partner is Moov for wallet-to-wallet transfers and standard capital operations. For high-value settlements of 250 thousand dollars or more, we use Modern Treasury which routes through Fedwire, the Federal Reserve's real-time gross settlement system. The system automatically selects the optimal rail and includes automatic failover between the two.

**Question: What are intraday capital controls?**
Answer: The platform dynamically calculates real-time Value at Risk and Tail Value at Risk for all active counterparties. AurumShield enforces five escalating control modes based on risk exposure: NORMAL, then THROTTLE_RESERVATIONS, then FREEZE_CONVERSIONS, then FREEZE_MARKETPLACE, and finally EMERGENCY_HALT. If an institution approaches or breaches their algorithmic risk limits, the system will automatically reject new transactions or require the posting of additional margin.

**Question: What is the Transaction Risk Index?**
Answer: The Transaction Risk Index, or T R I, is a score computed by our policy engine for every trade. It evaluates counterparty risk, capital adequacy, compliance posture, and market conditions in real time before any transaction is authorized. The T R I must fall within acceptable parameters for the trade to proceed.

**Question: How does AurumShield handle financial calculations?**
Answer: All financial values on the platform are stored as B I G I N T integers representing cents or basis points. AurumShield never uses floating-point math for financial calculations. This prevents rounding errors and ensures mathematical precision across all settlement, margin, and capital calculations.

**Question: What is a Corporate Wallet?**
Answer: A Corporate Wallet is the on-platform financial account associated with each institutional counterparty. It is used to hold capital for collateral posting, receive settlement funds, and track intraday margin states. Capital in the Corporate Wallet is managed through integration with our banking rails, Moov and Modern Treasury.

---

## SECTION 7: LOGISTICS & PHYSICAL DELIVERY

**Question: How is physical gold transported and delivered?**
Answer: AurumShield manages physical delivery exclusively through sovereign-grade armored logistics. Our primary carrier is Malca-Amit, which provides vault-to-vault armored transport. Our secondary carrier, with automatic failover, is Brinks armored transport. All standard mail, U S P S, and consumer-grade shipping have been completely removed from the platform. Carrier assignment is deterministic, selected automatically based on the notional value of the shipment, the delivery corridor, and carrier availability.

**Question: Where does gold ship from?**
Answer: Gold ships from the AurumShield Vault, located at 1 Federal Reserve Plaza in New York. Shipments travel through pre-approved, certified logistics corridors to the buyer's designated receiving facility.

**Question: When does the legal title or ownership of the gold transfer?**
Answer: Legal ownership and title to the physical gold transfer instantaneously from the seller to the buyer the exact millisecond the Atomic Settlement executes successfully on our ledger, regardless of where the gold is physically located in transit. This means the buyer legally owns the gold before it physically arrives.

**Question: Who is liable if a physical shipment is lost, damaged, or stolen in transit?**
Answer: AurumShield is a software infrastructure and clearing agent, not a physical logistics carrier. Risk of loss, damage, or theft during physical transit is governed by, and explicitly capped at, the specific insurance rider attached to the logistics carrier, such as Brinks' institutional transit policy or Malca-Amit's coverage. AurumShield assumes no direct liability for physical loss in transit. However, such losses can be claimed through our Deterministic Claims Engine and the Reinsurance Capital Waterfall.

**Question: Can I track my shipment?**
Answer: Yes. AurumShield provides full real-time chain-of-custody tracking for every shipment. Tracking events from the logistics provider are ingested directly into the settlement lifecycle, so you can monitor the physical delivery status alongside the financial settlement status within your platform dashboard.

**Question: What is the Kinetic Risk that AurumShield addresses?**
Answer: Kinetic Risk refers to the physical dangers inherent in transporting high-value bullion, including extortion, physical interception, and counterfeit injection. AurumShield eliminates kinetic risk by using exclusively sovereign-grade armored carriers, Malca-Amit and Brinks, who provide armed transport, vault-to-vault chain-of-custody, and comprehensive transit insurance. This completely removes logistical danger from the clearing process.

---

## SECTION 8: RISK MANAGEMENT & REINSURANCE

**Question: What happens if there is a settlement failure, missing delivery, or an assay dispute?**
Answer: In the event of a dispute, counterparties file a claim through the platform within 48 hours of the recorded delivery event. These claims are not adjudicated manually. They are routed into our Deterministic Claims Engine, which automatically ingests and evaluates cryptographic chain-of-custody data, A P I telemetry from logistics providers, banking settlement logs, and biometric receiving receipts to resolve the issue impartially. The findings of the engine are legally binding.

**Question: What is the Reinsurance Capital Waterfall?**
Answer: To protect the clearinghouse from systemic defaults, losses are absorbed in a strict, immutable, four-tier sequence. Tier one: the defaulting party's locked escrow capital, posted margin, or physical inventory is seized. Tier two: for physical losses, claims are routed to the specific insurance policy underwritten for the logistics carrier. Tier three: if tiers one and two are exhausted, losses are absorbed by AurumShield's proprietary, capitalized Default Fund, established solely for clearinghouse protection. Tier four: catastrophic systemic losses exceeding the Default Fund are covered by our aggregate institutional reinsurance policies.

**Question: What is the maximum liability AurumShield assumes?**
Answer: Under no circumstances shall AurumShield's total aggregate liability to any counterparty, whether in contract, tort, or otherwise, exceed the total recoverable limits of our active institutional reinsurance policies explicitly covering the specific failure event at the time the claim was filed. AurumShield does not accept liability for indirect, incidental, punitive, or consequential damages, including lost profits or reputational damage.

**Question: What is Force Majeure in the context of AurumShield?**
Answer: AurumShield shall not be held liable for any delay, settlement failure, or loss caused by events beyond our reasonable control. This includes acts of God, sovereign embargoes, global banking network outages such as S W I F T or Moov failures, systemic internet failures, or acts of war.

---

## SECTION 9: SECURITY & DATA PROTECTION

**Question: How does AurumShield protect data at rest?**
Answer: All data at rest is encrypted. Our database runs on R D S PostgreSQL 15 with A E S 256 encryption via A W S K M S. Database credentials are auto-managed by R D S and stored in A W S Secrets Manager, never in environment variables or configuration files. Document storage in S 3 uses server-side encryption.

**Question: How does AurumShield protect data in transit?**
Answer: All external traffic terminates at our A W S Application Load Balancer with A C M provisioned T L S certificates. Webhook payloads from banking partners are verified using H M A C S H A 256 with timing-safe comparison to prevent timing attacks. Clearing certificates are signed with A W S K M S E C D S A for non-repudiation. For international data transfers, we utilize Standard Contractual Clauses and T L S 1.3 with A E S 256 encryption.

**Question: What is the audit logging architecture?**
Answer: AurumShield produces append-only, structured J S O N audit events for every significant platform action. Each event carries a deterministic S H A 256 event I D computed from the timestamp, event name, and payload, ensuring the same event cannot be emitted twice and providing tamper-evident verification. Policy snapshots are S H A 256 hashed at order creation so any later tampering of the policy is detectable. All events are structured for ingestion by S I E M systems and are captured via CloudWatch and Datadog.

**Question: Does AurumShield operate under a fail-closed security model?**
Answer: Yes. AurumShield operates under a strict fail-closed security model. This means that any ambiguity in authorization state results in denial, never approval. If a user's role, compliance status, or Legal Entity Identifier cannot be verified at the time of a request, the action is automatically blocked.

**Question: What network security does the infrastructure implement?**
Answer: AurumShield implements three-tier Security Group isolation on A W S. The Application Load Balancer accepts public internet traffic on ports 80 and 443. The application containers only accept traffic from the Load Balancer. The database only accepts connections from the application containers. E C S tasks run in private subnets with no public I P address, and outbound traffic routes through a N A T Gateway. The database is never publicly accessible.

**Question: What is AurumShield's privacy policy regarding data sales?**
Answer: AurumShield does not and will never sell counterparty data. We share data strictly with certified enterprise sub-processors required to operate the platform's infrastructure, including Persona for identity verification, Moov for banking, Malca-Amit and Brinks for logistics, and DocuSign for contract management.

**Question: Can I request deletion of my data under G D P R?**
Answer: Because AurumShield is a heavily regulated financial platform, your Right to Erasure is explicitly superseded by our legal obligations under Anti-Money Laundering laws and the Bank Secrecy Act, as well as the technical realities of our immutable audit ledgers. Data committed to the clearing ledger cannot be structurally deleted. Deletion requests will only be honored for marketing communications or data not tied to compliance or financial execution.

---

## SECTION 10: NAVIGATION, USER ROLES & PLATFORM ACCESS

**Question: Where can I view my transaction history, balances, or ledger states?**
Answer: All real-time ledger states, live transaction statuses, wire updates, and historical records are immutably logged and can be viewed on the Audit tab within your platform dashboard.

**Question: What user roles exist on the platform?**
Answer: Accounts utilize Role-Based Access Controls. The primary roles are: Trader, also called Maker, who can initiate orders and lock prices. Treasury, also called Checker or Approver, who reviews, approves, and executes D V P settlements via Web Authn signature. Risk Officer, who monitors capital adequacy and exposure. Operations, who manages logistics and delivery coordination. Supervisory Administrator, who oversees all platform activity. Institutional Buyer and Institutional Seller roles define the counterparty type.

**Question: How do I request access to the platform?**
Answer: You must submit an application through our Institutional Access Gate at aurumshield.vip forward slash login. This is a multi-step vetting process. In step one, you provide your full legal name, institutional email address, and entity classification. A free email provider such as G mail will be rejected unless you are an individual broker dealer. In step two, you provide your anticipated settlement volume, primary use case, and operational mandate. In step three, your application is confirmed with a classified reference code and enters Pending Review status. Our compliance and risk architecture teams will review your application and contact you if your entity qualifies.

**Question: Can individual brokers use the platform?**
Answer: Yes. Individual broker-dealers may apply through the Institutional Access Gate. Unlike corporate entities, individual brokers are permitted to use personal email addresses such as G mail during the application process. However, they are still subject to the full vetting and compliance verification process before being granted platform access.

**Question: What happens after I submit an access request?**
Answer: After submission, your application enters Pending Review status. You will receive a classified application reference code, for example A S dash followed by 8 alphanumeric characters. Our compliance and risk architecture teams will review your submission. If your entity qualifies for platform access, you will be contacted at the email address you provided. Do not resubmit your application.

**Question: I submitted an application but have not heard back. What should I do?**
Answer: AurumShield conducts thorough due diligence on all applicants, which may take time. We intentionally do not disclose review timelines or criteria. If you have been waiting an extended period, ensure you have not submitted duplicate applications, as this may delay processing. If your entity qualifies, you will be contacted. We cannot provide status updates on pending applications.

---

## SECTION 11: LEGAL & REGULATORY FRAMEWORK

**Question: What legal agreements govern the use of AurumShield?**
Answer: The use of AurumShield is governed by our Master Service Agreement and Terms of Use, our Privacy and Data Protection Policy, our Anti-Money Laundering and Know Your Customer Policy, and our Risk Management and Reinsurance Protocol. All four documents are available on our website under the Legal section.

**Question: What governing law applies to AurumShield agreements?**
Answer: All agreements are governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.

**Question: How are disputes resolved?**
Answer: Disputes related to delivery or settlement are first adjudicated by our Deterministic Claims Engine, which provides mathematically driven, binding resolution. Any dispute that cannot be resolved by the engine is settled by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.

**Question: What compliance frameworks does AurumShield align with?**
Answer: AurumShield maps to multiple regulatory frameworks: L B M A Good Delivery Standards for refiner verification and evidence gating. K Y C and A M L regulations including the Bank Secrecy Act, U S A PATRIOT Act, FinCEN directives, and F A T F recommendations. S O C 2 requirements for audit trails, access control, and change management. P C I D S S standards for payment routing, idempotent transactions, and webhook integrity. G D P R and C C P A for data protection and privacy rights. O E C D responsible sourcing standards for chain of custody documentation.

---

## SECTION 12: TECHNICAL SPECIFICATIONS

**Question: What technology stack does AurumShield use?**
Answer: AurumShield is built on Next.js 16 with the App Router and React 19 with Server Components for the frontend. The backend uses Next.js Server Actions and A P I Routes with PostgreSQL 15 on A W S R D S for the database. The infrastructure runs on A W S E C S Fargate in private subnets with an Application Load Balancer, deployed via GitHub Actions C I C D pipeline.

**Question: What is the system uptime and infrastructure architecture?**
Answer: AurumShield runs on A W S with high-availability architecture spanning two Availability Zones with two public and two private subnets. Compute runs on E C S Fargate with rolling deployments. The database is backed up daily with seven-day retention. All infrastructure is defined as code using Terraform.

---

## SECTION 13: FEES, COSTS & COMMERCIAL TERMS

**Question: What are the fees for using AurumShield?**
Answer: Fee structures are disclosed during the institutional onboarding process and are specific to each counterparty's anticipated volume and use case. I am not able to quote specific fee schedules. Please submit an access request through our Institutional Access Gate, and our team will include fee disclosures as part of the vetting and agreement process.

**Question: Is there a minimum transaction size?**
Answer: Minimum transaction sizes and volume requirements are established during the institutional onboarding process based on your entity classification and anticipated settlement volume. These details are part of the commercial terms discussed with qualified counterparties.

---

## SECTION 14: AGENT BEHAVIORAL GUIDELINES

**Instruction: Tone and Positioning**
When responding to inquiries, maintain a professional, measured, and authoritative tone. AurumShield is institutional infrastructure, not a consumer product. Never use casual language. Never speculate on information not contained in this knowledge base. If you do not know the answer to a question, state that you will escalate the inquiry to the appropriate team.

**Instruction: Confidentiality**
Never disclose internal system architecture details, specific vendor contract terms, insurance coverage limits, reinsurance policy details, or specific capital reserve figures. If asked about these topics, explain that such information is classified and available only to verified counterparties under N D A.

**Instruction: Regulatory Caution**
Never provide legal, tax, or investment advice. If a user asks for guidance on legal matters, direct them to consult with their own legal counsel. If a user asks about S A Rs, law enforcement inquiries, or regulatory investigations, inform them that you cannot comment on such matters due to legal obligations.

**Instruction: Escalation Triggers**
Immediately escalate to a human representative if: a user reports a suspected security breach or unauthorized access, a user reports a missing physical shipment, a user requests to file a formal dispute or assay claim, a user identifies themselves as press or media, a user identifies themselves as a regulator or law enforcement officer, or a user expresses anger or threatens legal action.

**Instruction: Prohibited Statements**
Never guarantee specific settlement times, delivery dates, or investment returns. Never confirm or deny the existence of Suspicious Activity Reports. Never disclose the names or details of other counterparties. Never compare AurumShield to specific competitors by name. Never estimate insurance coverage amounts or reinsurance limits.
