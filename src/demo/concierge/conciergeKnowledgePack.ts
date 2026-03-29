/* ================================================================
   CONCIERGE KNOWLEDGE PACK — Comprehensive Institutional Gold Intelligence

   Structured knowledge derived from:
     1. AurumShield platform architecture & routes
     2. Institutional Gold Procurement Briefing (57-page whitepaper)
     3. AurumShield Institutional Buyer Journey document
     4. Complete endpoint map

   The concierge agent grounds ALL answers in this pack.
   This is the single source of truth for the voice agent's
   institutional gold expertise.
   ================================================================ */

export const KNOWLEDGE_PACK = {
  platform: {
    name: "AurumShield",
    description:
      "AurumShield is sovereign financial infrastructure for deterministic institutional gold settlement. " +
      "It operates as a Principal Market Maker — not a broker, not an exchange. " +
      "AurumShield takes legal title to the gold itself before selling to the buyer. " +
      "The buyer purchases from a single, identifiable, legally accountable counterparty.",
    model:
      "Principal Market Maker. Gold is sourced directly from mine originators at wholesale pricing. " +
      "AurumShield captures a ~4-5% sourcing spread + 1% platform fee. " +
      "There is no order-matching uncertainty, no anonymous sellers, no decentralized protocol risk.",
    feeStructure:
      "1% Platform Fee (Fee Sweep) — the ONLY fee. " +
      "Calculated deterministically: platformFeeUsd = notionalUsd × 0.01. " +
      "Visible during cost derivation before commitment. " +
      "Frozen into the immutable settlement record — cannot be changed after execution. " +
      "No management fees, no custody fees, no AUM fees, no exit fees. " +
      "At $500M: your fee is $5M, stated upfront. Compare to gold ETFs (0.40% annual compounding forever), " +
      "prime broker custody (negotiated, opaque), or traditional dealers (spread + commissions + storage + insurance surcharges).",
    custodyPartners:
      "Malca-Amit (Zurich, Singapore) and Brink's Global Services (London, New York, Dubai). " +
      "These are the same custodians used by central banks, sovereign wealth funds, and the LBMA itself.",
    insuranceCoverage:
      "Lloyd's of London Specie Policy — the gold standard for precious metals insurance. " +
      "Same coverage class used by Bank of England's gold vault, the Perth Mint, and the Swiss National Bank. " +
      "Covers: theft, damage, natural disaster, facility failure, transit accidents. " +
      "At $500M: you are insured against total loss — this is a Lloyd's underwriting syndicate policy, not a platform warranty.",
  },

  whyMoneyIsSafe: {
    principalRisk:
      "AurumShield takes PRINCIPAL risk, not broker risk. " +
      "You buy from a single, known counterparty you can diligence, sue, and hold accountable. " +
      "No anonymous sellers, no decentralized protocol, no order-matching uncertainty. " +
      "At $500M: counterparty risk is the #1 concern. A broker introduces intermediary risk. " +
      "A marketplace introduces anonymous seller risk. Neither is acceptable at this scale.",

    allocatedCustody:
      "Every ounce is ALLOCATED — specific, serialized bars physically separated and titled to your entity. " +
      "Bar serial numbers, assay certificates, refiner marks, and vault slot locations on record. " +
      "This is NOT unallocated gold (where banks pool metal and you're an unsecured creditor if they fail). " +
      "This is NOT paper gold (ETFs — no right to specific bars, redemption at trust's discretion). " +
      "At $500M (~12-14 LBMA 400oz bars): you know exactly which bars are yours, exactly where they are, " +
      "and you have legal claim to those specific bars — not a proportional share of a commingled pool.",

    lloydInsurance:
      "Lloyd's Specie Policy covers transit, custody, and delivery — door-to-door. " +
      "From moment of dispatch from refinery to delivery at your designated vault. " +
      "Continuously while stored at Malca-Amit or Brink's. " +
      "If a vault is compromised, you are made whole. " +
      "At $500M: insured against theft, damage, natural disaster, and facility failure.",

    failClosedCompliance:
      "Fail-closed architecture: every state transition requires DB-verified compliance approval. " +
      "If ANY gate fails, the entire transaction is BLOCKED — not flagged for review, not overridden. " +
      "KYB: 8 corporate documents minimum. UBO: every 25%+ owner screened. " +
      "AML: 7 sanctions lists + Chainalysis KYT for stablecoin. " +
      "Every step timestamped, auditable, produces verifiable record. " +
      "At $500M: you prove to your board, investors, and regulators that the counterparty has a defensible process.",

    deterministicSettlement:
      "8-stage deterministic pipeline — no 'pending' black box. " +
      "Every stage produces a tamper-evident audit event. " +
      "SHA-256 signed clearing certificate is cryptographic proof of settlement. " +
      "Traditional LBMA settlement involves phone calls, manual confirmations, multi-day windows " +
      "where Herstatt Risk is real (one party delivers while the other defaults). " +
      "Stablecoin bridge enables T+0 settlement — title transfers same day as fund receipt. " +
      "At $500M: eliminating one day of settlement exposure eliminates significant counterparty risk.",

    feeTransparency:
      "1% platform fee — visible, calculated deterministically, frozen into immutable record. " +
      "Full cost derivation displayed line-by-line: Spot Value + Asset Premium + Vault Transit + Platform Fee. " +
      "At $500M: your $5M fee is stated upfront, not buried in a prospectus footnote.",

    physicalRedemption:
      "Your gold is NOT trapped on a platform. Two exit paths at any time: " +
      "Option A — Fiat Liquidation (T+0): instant conversion to fiat/USDC via regional OTC refining partners. " +
      "Option B — Physical Delivery: armored transit via Brink's ($1,500 dispatch + $4.50/mile + 15bps insurance). " +
      "At $500M: Manhattan delivery from NYC Brink's ≈ $76,500 in logistics — 0.015% of position. " +
      "The ability to take physical possession is the ultimate proof this is real gold, not a synthetic product.",

    infrastructureSecurity:
      "Auth: Clerk with hardware key support. 3-gate trade auth. " +
      "Encryption: TLS 1.3 in transit, AES-256 at rest. " +
      "Infra: 3-tier AWS isolation, no shared tenancy. " +
      "Audit: every action produces tamper-evident hash. " +
      "Idempotency: SHA-256 idempotency keys prevent double-execution.",
  },

  goldMarketExpertise: {
    lbmaGoodDelivery:
      "The 400oz Good Delivery bar is THE institutional standard, dating to London's 19th-century role as global settlement hub. " +
      "Weight: 350-430 troy oz (~12.44 kg). Fineness: minimum 995 parts per thousand. " +
      "Stamped: refiner hallmark, serial number, fineness, year. Each bar unique and individually tracked. " +
      "At $5,171/oz: a single bar = ~$2.06M in dense capital. " +
      "Strategic advantage: no fabrication margin, no artistic premium, no retail workmanship. " +
      "Minimizes handling, reduces audit complexity, smallest vault footprint, lowest custody cost per kilo.",

    pricingMechanics:
      "Institutional acquisition cost = Spot Price + Premium + Execution Fees. " +
      "400oz bars: premium of 0.05-0.15% (just basis points). " +
      "Compare: 1oz coins 3-5%, 1kg bars 0.50-1.50%. " +
      "At $100M: total friction ~0.10% — 99.90% of capital goes directly into underlying value.",

    allocatedVsUnallocated:
      "UNALLOCATED: 90%+ of interbank gold clears unallocated. No specific bars owned. " +
      "Bank uses pooled metal for its own trading/lending. If bank fails: you're an unsecured creditor. " +
      "ALLOCATED: specific bars physically segregated, titled to you. Cannot be pooled, leased, or seized. " +
      "Vault acts as bailee under bailment law — your bars remain your sovereign property in bankruptcy. " +
      "Under English Law and UCC Article 7: absolute bankruptcy remoteness.",

    tungstenThreat:
      "Tungsten density (19.25 g/cm³) is nearly identical to gold (19.30 g/cm³). " +
      "A hollowed bar with tungsten inserts looks and weighs identical to genuine gold. " +
      "Defense: LBMA accredited refiners + ultrasonic testing + electrical conductivity scanning. " +
      "Ultrasonic: sound travels at different velocities through gold vs tungsten — detects inserts instantly. " +
      "Within the institutional closed-loop ecosystem: risk effectively zero.",

    chainOfCustody:
      "Gold moves within a closed-loop ecosystem: LBMA refinery → bonded armored carrier → approved vault. " +
      "Serial numbers scanned and logged at every transfer. " +
      "If gold leaves the recognized ecosystem: chain is broken, market rejects the bars. " +
      "Re-entry requires: transport to accredited refiner, complete melt, re-assay, recast with new serials. " +
      "Cardinal rule: keep assets in professional, accredited vaulting to preserve liquidity and integrity.",

    refineries:
      "LBMA Good Delivery List: Valcambi, PAMP, Argor-Heraeus, Umicore SA, Metalor, Shandong Zhaojin. " +
      "Accreditation requires: 3-5 year operating history, £15M+ net worth, massive annual production. " +
      "Continuous independent scrutiny, mandatory proficiency testing, OECD due diligence compliance.",

    logistics:
      "Global secure logistics oligopoly: Brink's, Loomis International, Malca-Amit, Ferrari Group, G4S. " +
      "Cross-border shipments: armored extraction → restricted airport zones → airfreight or charter cargo → vault intake. " +
      "GPS telemetry, temperature/humidity monitoring, sealed packaging integrity throughout transit. " +
      "Transit costs: typically 0.20-0.40% of value, scaling down with tonnage.",

    bailmentJurisprudence:
      "Bailment: bailor (gold owner) delivers property to bailee (vault) with condition it will be safeguarded and returned. " +
      "Physical possession transfers but legal ownership remains with the corporation. " +
      "English Law and UCC Article 7 uphold bailor's ownership. " +
      "Bankruptcy remoteness: customer bailments are NOT assets of failed business, cannot be seized by creditors.",
  },

  complianceProcess: {
    entityVerification:
      "Corporate registry cross-reference: incorporation docs, articles of association, register of directors, " +
      "shareholder registry, proof of good standing, board resolution, signatory ID, proof of address. " +
      "8 corporate documents authenticated against issuing registries.",
    uboReview:
      "Every beneficial owner holding ≥25% ownership identified and screened. " +
      "PEP status, sanctions exposure, adverse media coverage. " +
      "Demo entity: 3 UBOs — founding CIO (42%), managing partner (31%), family trust (27%).",
    sanctionsScreening:
      "Concurrent checks: OFAC (US), EU Consolidated, UN Security Council, UK HM Treasury, Australian DFAT, adverse media. " +
      "For stablecoin: on-chain wallet screening via Chainalysis KYT for illicit activity. " +
      "7 jurisdictions, all-clear or flagged.",
    complianceDecision:
      "Holistic review. Approval timestamp and reviewer desk label recorded. " +
      "Fail-closed: any missing gate rejects advancement. " +
      "State machine: OPEN → PENDING_USER → PENDING_PROVIDER → UNDER_REVIEW → APPROVED.",
    timeline:
      "Automated screening processes most checks near real-time. " +
      "Most institutional entities clear within hours, not weeks. " +
      "Compare: traditional prime brokers take 3-5 business days.",
  },

  fundingRails: {
    stablecoinBridge:
      "Phase 1 preferred: USDC/USDT via institutional stablecoin bridge. " +
      "T+0 instant clearing — bypasses legacy banking friction entirely. " +
      "Corporate custody wallet required. Wallet address screened against OFAC before acceptance. " +
      "Deposits convert to allocated gold title at live spot within the Goldwire clearing engine.",
    fedwire:
      "Correspondent banking via Fedwire RTGS. " +
      "Requires MSB compliance approval — 30-45 day underwriting. " +
      "Bank account verification. Same-day settlement once wired.",
    walletScreening:
      "All wallet addresses screened for OFAC compliance before acceptance.",
  },

  assets: {
    "lbma-400oz":
      "400 oz LBMA Good Delivery Bar — the undisputed institutional standard. " +
      "350-430 oz range, ≥995 fineness. Cast ingot, stamped with refiner hallmark, serial, fineness, year. " +
      "Premium: +0.10% (10 basis points). Allocated custody. " +
      "Same bars that settle on the London Bullion Market and are held by central banks worldwide.",
    "kilo-bar":
      "1 Kilogram Gold Bar (32.15 troy oz). 999.9 fineness. " +
      "High-net-worth/light institutional format. Good middle-ground for divisibility and liquidity. " +
      "Premium: +0.35% (35 basis points).",
    "10oz-cast":
      "10 oz Cast Gold Bar. 999.9 fineness. Premium: +0.75% (75 basis points).",
    "1oz-minted":
      "1 oz Minted Gold Bar. 999.9 fineness. Serialized. Premium: +1.50% (150 basis points).",
  },

  custodyAndDelivery: {
    vaultLocations: [
      "Zurich — Malca-Amit Hub 1 (EMEA, Swiss Freeport — tax-advantaged jurisdiction)",
      "London — Brink's Sovereign (EMEA — English Law bailment, gold standard for bullion contracts)",
      "Singapore — Malca-Amit Asia (APAC — Southeast Asian hub, efficient for Asian allocations)",
      "New York — Brink's CONUS (AMER — closest to COMEX settlement, USD-centric)",
      "Dubai — Brink's DMCC Freeport (MENA — zero import duty, strategic for Middle East allocators)",
    ],
    physicalDelivery:
      "Armored transit via Brink's Global Services. Heavy armored fleets, reinforced bullion containers, " +
      "trained armed security. Fully insured under Lloyd's Specie Policy — door-to-door. " +
      "Pricing: $1,500 base dispatch + $4.50/mile + 15bps insurance on notional. " +
      "Residential capped at $100K notional — larger requires commercial/bank address. " +
      "Network limit: 3,000 driving miles from NYC vault. " +
      "Real-time tracking: Brink's API pings, waybill generation, carrier dispatch, delivery signature.",
    allocated:
      "ALL custody is ALLOCATED — bars sequestered, serialized, and legally titled to your entity. " +
      "Not pooled, not leased, not appearing on vault's balance sheet. " +
      "Zero credit exposure to the custodian. " +
      "Your bars are independently auditable via third-party firms (Inspectorate, Bureau Veritas).",
  },

  settlement: {
    stages: [
      "1. Case Opened — trade intent recorded, case reference generated, indicative snapshot immutably logged. Immediate.",
      "2. Binding Quote Issued — operations locks execution price from live XAU/USD. Signed quote document produced. ≤1 business day.",
      "3. Settlement Instructions — payment details confirmed, written instructions sent. Same day as quote.",
      "4. Funds Received — USDC arrives (T+0) or Fedwire received (T+1). AML re-screening at point of receipt.",
      "5. Gold Allocated — specific bars assigned from inventory. Serial numbers, assay certificates, vault location recorded. Same day.",
      "6. Title Transfer — cryptographic title minted and assigned. SHA-256 signed clearing certificate issued. Immediate.",
      "7. Insurance Activation — Lloyd's Specie Policy coverage activated for specific bars. Same day.",
      "8. Settlement Complete — legal title transferred, case archived. Full ownership documentation. Same day.",
    ],
    indicativeVsBinding:
      "All pricing during the demo is INDICATIVE — based on live spot. " +
      "Final execution price determined at settlement when a binding quote is generated. " +
      "No funds move until settlement. Key difference: indicative = estimate, binding = locked.",
    proofOfOwnership:
      "SHA-256 signed clearing certificate — cryptographic, tamper-evident proof of settlement. " +
      "Custody allocation confirmation with bar serial numbers. " +
      "Lloyd's insurance documentation for specific bars. " +
      "Every state transition produces a tamper-evident audit event.",
    revenue:
      "1% Fee Sweep extracted during funds clearing. " +
      "platformFeeUsd = Math.round(notionalUsd × 0.01 × 100) / 100. " +
      "Fee and net clearing amount frozen into the settlement_cases record.",
    totalTimeline:
      "Entity registration: 2 minutes. KYB/AML: hours (not weeks). Funding config: 2 minutes. " +
      "Asset selection: 5 minutes. Review: 2 minutes. Authorization: 1 minute. " +
      "Settlement → binding quote: ≤1 business day. Fund receipt: T+0 (stablecoin). " +
      "Gold allocation + settlement complete: same day. " +
      "Total: first click to legal title — as fast as 1-2 business days with stablecoin funding.",
  },

  boundaries: {
    notReal:
      "This is a demonstration walkthrough. Compliance evidence is demo case data. " +
      "Pricing is indicative. No actual trade is being executed.",
    noMarketData:
      "The agent does not have access to real-time market data beyond what the platform displays. " +
      "All price references come from the platform's own spot oracle.",
    noLegalAdvice:
      "The agent does not provide legal, tax, or regulatory advice. " +
      "For specifics, the institutional desk team is the appropriate contact.",
  },
} as const;

/**
 * Build the grounded Q&A instruction block for injection into the system prompt.
 * This is a comprehensive knowledge base that enables the concierge to answer
 * detailed institutional buyer questions with authority.
 */
export function buildKnowledgePackInstruction(): string {
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════════════",
    "GROUNDED KNOWLEDGE — Answer questions ONLY from this data",
    "═══════════════════════════════════════════════════════════",
    "",
    `Platform: ${KNOWLEDGE_PACK.platform.name}`,
    `Description: ${KNOWLEDGE_PACK.platform.description}`,
    `Business Model: ${KNOWLEDGE_PACK.platform.model}`,
    `Fee Structure: ${KNOWLEDGE_PACK.platform.feeStructure}`,
    `Custody Partners: ${KNOWLEDGE_PACK.platform.custodyPartners}`,
    `Insurance: ${KNOWLEDGE_PACK.platform.insuranceCoverage}`,
    "",
    "══════════════════════════════════════════════════════════════",
    "WHY IS MY MONEY SAFE WITH AURUMSHIELD? (8 PILLARS OF TRUST)",
    "══════════════════════════════════════════════════════════════",
    "",
    `1. PRINCIPAL RISK: ${KNOWLEDGE_PACK.whyMoneyIsSafe.principalRisk}`,
    "",
    `2. ALLOCATED CUSTODY: ${KNOWLEDGE_PACK.whyMoneyIsSafe.allocatedCustody}`,
    "",
    `3. LLOYD'S INSURANCE: ${KNOWLEDGE_PACK.whyMoneyIsSafe.lloydInsurance}`,
    "",
    `4. FAIL-CLOSED COMPLIANCE: ${KNOWLEDGE_PACK.whyMoneyIsSafe.failClosedCompliance}`,
    "",
    `5. DETERMINISTIC SETTLEMENT: ${KNOWLEDGE_PACK.whyMoneyIsSafe.deterministicSettlement}`,
    "",
    `6. FEE TRANSPARENCY: ${KNOWLEDGE_PACK.whyMoneyIsSafe.feeTransparency}`,
    "",
    `7. PHYSICAL REDEMPTION: ${KNOWLEDGE_PACK.whyMoneyIsSafe.physicalRedemption}`,
    "",
    `8. INFRASTRUCTURE SECURITY: ${KNOWLEDGE_PACK.whyMoneyIsSafe.infrastructureSecurity}`,
    "",
    "══════════════════════════════════════════════════════════════",
    "INSTITUTIONAL GOLD MARKET EXPERTISE",
    "══════════════════════════════════════════════════════════════",
    "",
    `LBMA GOOD DELIVERY STANDARD: ${KNOWLEDGE_PACK.goldMarketExpertise.lbmaGoodDelivery}`,
    "",
    `PRICING MECHANICS: ${KNOWLEDGE_PACK.goldMarketExpertise.pricingMechanics}`,
    "",
    `ALLOCATED vs UNALLOCATED: ${KNOWLEDGE_PACK.goldMarketExpertise.allocatedVsUnallocated}`,
    "",
    `TUNGSTEN THREAT & DEFENSE: ${KNOWLEDGE_PACK.goldMarketExpertise.tungstenThreat}`,
    "",
    `CHAIN OF CUSTODY: ${KNOWLEDGE_PACK.goldMarketExpertise.chainOfCustody}`,
    "",
    `REFINERIES: ${KNOWLEDGE_PACK.goldMarketExpertise.refineries}`,
    "",
    `LOGISTICS: ${KNOWLEDGE_PACK.goldMarketExpertise.logistics}`,
    "",
    `BAILMENT LAW: ${KNOWLEDGE_PACK.goldMarketExpertise.bailmentJurisprudence}`,
    "",
    "══════════════════════════════════════════════════════════════",
    "COMPLIANCE PROCESS",
    "══════════════════════════════════════════════════════════════",
    "",
    `Entity Verification: ${KNOWLEDGE_PACK.complianceProcess.entityVerification}`,
    `UBO Review: ${KNOWLEDGE_PACK.complianceProcess.uboReview}`,
    `Sanctions Screening: ${KNOWLEDGE_PACK.complianceProcess.sanctionsScreening}`,
    `Decision: ${KNOWLEDGE_PACK.complianceProcess.complianceDecision}`,
    `Timeline: ${KNOWLEDGE_PACK.complianceProcess.timeline}`,
    "",
    "FUNDING RAILS:",
    `  Stablecoin Bridge: ${KNOWLEDGE_PACK.fundingRails.stablecoinBridge}`,
    `  Fedwire: ${KNOWLEDGE_PACK.fundingRails.fedwire}`,
    "",
    "CUSTODY & DELIVERY:",
    `  Vault Locations: ${KNOWLEDGE_PACK.custodyAndDelivery.vaultLocations.join("; ")}`,
    `  Physical Delivery: ${KNOWLEDGE_PACK.custodyAndDelivery.physicalDelivery}`,
    `  Allocation: ${KNOWLEDGE_PACK.custodyAndDelivery.allocated}`,
    "",
    "SETTLEMENT LIFECYCLE:",
    ...KNOWLEDGE_PACK.settlement.stages.map((s) => `  ${s}`),
    "",
    `  Indicative vs Binding: ${KNOWLEDGE_PACK.settlement.indicativeVsBinding}`,
    `  Proof of Ownership: ${KNOWLEDGE_PACK.settlement.proofOfOwnership}`,
    `  Revenue: ${KNOWLEDGE_PACK.settlement.revenue}`,
    `  Total Timeline: ${KNOWLEDGE_PACK.settlement.totalTimeline}`,
    "",
    "STRICT BOUNDARIES:",
    `  ${KNOWLEDGE_PACK.boundaries.notReal}`,
    `  ${KNOWLEDGE_PACK.boundaries.noMarketData}`,
    `  ${KNOWLEDGE_PACK.boundaries.noLegalAdvice}`,
    "",
    "If asked a question you cannot answer from this knowledge pack, say:",
    "  'Our institutional desk team can provide those specifics. For now, let me continue",
    "   walking you through the platform.' Then resume naturally.",
    "",
  ];
  return lines.join("\n");
}
