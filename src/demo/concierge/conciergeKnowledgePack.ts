/* ================================================================
   CONCIERGE KNOWLEDGE PACK — Grounded Q&A context
   
   Structured knowledge derived from the actual AurumShield routes,
   labels, and UI states. Injected into the system instruction so
   the Gemini agent can answer real-time buyer questions within
   scope without hallucination.
   
   The agent answers ONLY from this grounded data plus the
   choreography script. For unknown specifics, it pivots back
   to the flow honestly.
   ================================================================ */

export const KNOWLEDGE_PACK = {
  platform: {
    name: "AurumShield",
    description:
      "AurumShield is a sovereign financial infrastructure platform for deterministic institutional gold settlement. " +
      "It operates as a Principal Market Maker, acquiring gold directly from originators and selling at institutional spot.",
    model: "Principal Market Maker — not a broker. AurumShield takes principal risk.",
    feeStructure:
      "1% platform fee (Fee Sweep) calculated during settlement, frozen into the immutable record.",
    custodyPartners: "Malca-Amit, Brink's Global Services — Tier-1 sovereign vaults.",
    insuranceCoverage: "Lloyd's Specie Policy — full transit and custody insurance.",
  },

  complianceProcess: {
    entityVerification:
      "Corporate registry check — verifies entity registration, incorporation documents, and good standing.",
    uboReview:
      "Identifies all beneficial owners holding 25%+ ownership. Checks PEP status, sanctions exposure, and adverse media.",
    sanctionsScreening:
      "Screens against OFAC (US), EU Consolidated, UN Security Council, UK HM Treasury, Australian DFAT, " +
      "and adverse media databases. Wallet addresses screened for illicit activity.",
    sourceOfFunds:
      "Reviews the funding source — wallet origin or bank origin. Determines operational readiness and risk level.",
    complianceDecision:
      "Final holistic review. If all checks pass, the entity is cleared for institutional trading. " +
      "Approval timestamp and reviewer desk label recorded.",
    timeline:
      "The platform's compliance engine processes checks in near real-time. " +
      "Traditional prime brokers take 3-5 business days for equivalent verification.",
  },

  fundingRails: {
    stablecoinBridge:
      "Phase 1: Institutional USDC/USDT via corporate custody wallet. " +
      "Provides instant clearing access through the Goldwire settlement engine. " +
      "T+0 settlement — no legacy banking friction.",
    fedwire:
      "Correspondent banking via Fedwire. Requires MSB compliance underwriting. " +
      "Expect 30–45 day delays for USD wire approvals. Same-day settlement once wired.",
    walletScreening:
      "All wallet addresses are screened for OFAC compliance before acceptance.",
  },

  assets: {
    "lbma-400oz":
      "400 troy oz LBMA Good Delivery Bar. 350–430 oz range, ≥995 fineness. " +
      "Allocated custody. The institutional standard for sovereign gold settlement. " +
      "Premium: +0.10% above spot.",
    "kilo-bar":
      "1 Kilogram Gold Bar (32.15 troy oz). 999.9 fineness. " +
      "Institutional standard format. Premium: +0.35%.",
    "10oz-cast":
      "10 troy oz Cast Gold Bar. 999.9 fineness. Cast ingot format. Premium: +0.75%.",
    "1oz-minted":
      "1 troy oz Minted Gold Bar. 999.9 fineness. Serialized minted bar. Premium: +1.50%.",
  },

  custodyAndDelivery: {
    vaultLocations: [
      "Zurich — Malca-Amit Hub 1 (EMEA)",
      "London — Brink's Sovereign (EMEA)",
      "Singapore — Malca-Amit Asia (APAC)",
      "New York — Brink's CONUS (AMER)",
      "Dubai — Brink's DMCC Freeport (MENA)",
    ],
    physicalDelivery:
      "Armored transit via Brink's. Fully insured under Lloyd's Specie Policy. " +
      "Delivery address verified and freight quoted before execution.",
    allocated:
      "All custody is ALLOCATED — your gold is sequestered, serialized, and legally titled to your entity.",
  },

  settlement: {
    stages: [
      "1. Settlement case opened — immediate, trade intent recorded, case reference generated.",
      "2. Binding quote issued — within 1 business day, operations locks the execution price.",
      "3. Settlement instructions sent — payment details and compliance confirmation.",
      "4. Funds received and verified — AML re-screening occurs at receipt.",
      "5. Gold allocated — specific bars assigned to your custody account.",
      "6. Custody certificate issued — SHA-256 signed clearing certificate.",
      "7. Insurance confirmation — Lloyd's coverage activated for stored allocation.",
      "8. Settlement complete — legal title transferred, case archived.",
    ],
    indicativeVsBinding:
      "All pricing shown during the demo is INDICATIVE — based on live spot. " +
      "Final execution price is determined during settlement when a binding quote is generated. " +
      "No funds move until settlement. No claims of locked pricing until the operations team confirms.",
    proofOfOwnership:
      "Upon settlement completion, the buyer receives: a SHA-256 signed clearing certificate, " +
      "custody allocation confirmation, and insurance documentation.",
  },

  boundaries: {
    notReal:
      "This is a demonstration walkthrough. Compliance evidence is demo case data, not a live entity. " +
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
    `Model: ${KNOWLEDGE_PACK.platform.model}`,
    `Fee: ${KNOWLEDGE_PACK.platform.feeStructure}`,
    `Custody: ${KNOWLEDGE_PACK.platform.custodyPartners}`,
    `Insurance: ${KNOWLEDGE_PACK.platform.insuranceCoverage}`,
    "",
    "COMPLIANCE PROCESS:",
    `  Entity Verification: ${KNOWLEDGE_PACK.complianceProcess.entityVerification}`,
    `  UBO Review: ${KNOWLEDGE_PACK.complianceProcess.uboReview}`,
    `  Sanctions Screening: ${KNOWLEDGE_PACK.complianceProcess.sanctionsScreening}`,
    `  Source of Funds: ${KNOWLEDGE_PACK.complianceProcess.sourceOfFunds}`,
    `  Decision: ${KNOWLEDGE_PACK.complianceProcess.complianceDecision}`,
    `  Timeline: ${KNOWLEDGE_PACK.complianceProcess.timeline}`,
    "",
    "FUNDING RAILS:",
    `  Stablecoin: ${KNOWLEDGE_PACK.fundingRails.stablecoinBridge}`,
    `  Fedwire: ${KNOWLEDGE_PACK.fundingRails.fedwire}`,
    `  Wallet Screening: ${KNOWLEDGE_PACK.fundingRails.walletScreening}`,
    "",
    "CUSTODY:",
    `  Vault Locations: ${KNOWLEDGE_PACK.custodyAndDelivery.vaultLocations.join("; ")}`,
    `  Physical Delivery: ${KNOWLEDGE_PACK.custodyAndDelivery.physicalDelivery}`,
    `  Allocation: ${KNOWLEDGE_PACK.custodyAndDelivery.allocated}`,
    "",
    "SETTLEMENT LIFECYCLE:",
    ...KNOWLEDGE_PACK.settlement.stages.map((s) => `  ${s}`),
    "",
    `  Indicative vs Binding: ${KNOWLEDGE_PACK.settlement.indicativeVsBinding}`,
    `  Proof of Ownership: ${KNOWLEDGE_PACK.settlement.proofOfOwnership}`,
    "",
    "STRICT BOUNDARIES:",
    `  ${KNOWLEDGE_PACK.boundaries.notReal}`,
    `  ${KNOWLEDGE_PACK.boundaries.noMarketData}`,
    `  ${KNOWLEDGE_PACK.boundaries.noLegalAdvice}`,
    "",
    "If asked a question you cannot answer from this knowledge pack, say:",
    "  'Our institutional desk team can provide those specifics. For now, let me continue",
    "   walking you through the platform.' Then resume the script.",
    "",
  ];
  return lines.join("\n");
}
