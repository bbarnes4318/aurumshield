"use server";

/* ================================================================
   BRINKS ARMORED FREIGHT CALCULATOR — Mock Service
   ================================================================
   Simulates a pricing ping to the Brink's Global Services API
   for armored physical delivery of allocated bullion.

   Fee structure:
     - Flat base fee:   $2,500 (armored transport & insurance)
     - Ad-valorem fee:  0.15% of notional USD commitment

   TODO: Replace with live Brink's / Malca-Amit API integration
         once sovereign logistics contracts are finalized.
   ================================================================ */

export interface ArmoredFreightQuote {
  /** Fixed armored transport & insurance base fee (USD) */
  flatFee: number;
  /** Ad-valorem percentage fee (0.15% of notional, USD) */
  percentageFee: number;
  /** Total logistics premium = flatFee + percentageFee */
  totalPremium: number;
  /** Carrier providing the quote */
  carrier: "brinks" | "malca_amit";
  /** Estimated transit window in business days */
  estimatedBusinessDays: number;
}

/**
 * Calculate the armored freight premium for physical delivery
 * of vaulted gold to a secure destination.
 *
 * @param usdAmount   Notional USD commitment
 * @param destination Secure delivery address (for routing/zone pricing)
 * @returns           ArmoredFreightQuote with fee breakdown
 */
export async function calculateArmoredFreight(
  usdAmount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destination: string,
): Promise<ArmoredFreightQuote> {
  // Simulate network latency to brinks-service
  await new Promise((resolve) => setTimeout(resolve, 50));

  const flatFee = 2_500;
  const percentageFee = usdAmount * 0.0015;

  // Route to Malca-Amit for shipments over $500k
  const carrier: "brinks" | "malca_amit" =
    usdAmount > 500_000 ? "malca_amit" : "brinks";

  const estimatedBusinessDays = carrier === "malca_amit" ? 5 : 3;

  return {
    flatFee,
    percentageFee,
    totalPremium: flatFee + percentageFee,
    carrier,
    estimatedBusinessDays,
  };
}
