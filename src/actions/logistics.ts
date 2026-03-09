"use server";

/* ================================================================
   LOGISTICS ROUTING — Server Action (Sovereign Carriers Only)
   ================================================================
   Routes post-settlement shipment creation through sovereign
   logistics carriers based on notional value:

     - notionalCents ≤ $500,000 → Brink's Global Services
     - notionalCents > $500,000  → Malca-Amit Global Ltd

   USPS/EasyPost have been removed. All shipments route through
   sovereign-grade armored carriers only.

   Broker-Dealer entities require commercial sub-custodian destination
   validation — residential addresses are rejected.

   This file runs ENTIRELY on the server — no API keys are ever
   exposed to the client.
   ================================================================ */

import {
  fetchDeliveryRate as brinksQuote,
  createShipment as brinksCreate,
} from "@/lib/delivery/brinks-service";
import {
  fetchDeliveryRate as malcaAmitQuote,
  createShipment as malcaAmitCreate,
} from "@/lib/delivery/malca-amit-service";
import type {
  DeliveryAddress,
  DeliveryRateQuote,
} from "@/lib/delivery/delivery-types";

/* ---------- Types ---------- */

export type SovereignCarrier = "brinks" | "malca_amit";

export interface LogisticsRoutingResult {
  /** Which carrier was selected */
  carrier: SovereignCarrier;
  /** Whether the shipment was successfully created */
  success: boolean;
  /** Tracking number (if available) */
  trackingNumber: string | null;
  /** External shipment/rate ID */
  externalId: string | null;
  /** Estimated delivery days */
  estimatedDays: number | null;
  /** Total shipping fee in USD */
  totalFeeUsd: number | null;
  /** Error message if shipment creation failed */
  error?: string;
}

/* ---------- Carrier Selection ---------- */

const MALCA_AMIT_THRESHOLD_CENTS = 50_000_000; // $500,000

function selectCarrier(notionalCents: number): SovereignCarrier {
  return notionalCents > MALCA_AMIT_THRESHOLD_CENTS ? "malca_amit" : "brinks";
}

/* ---------- Broker-Dealer Address Validation ---------- */

/**
 * Validate that a Broker-Dealer's shipping destination is a
 * commercial sub-custodian, not a residential address.
 *
 * Enforced rule: if entity_type === 'BROKER_DEALER', the
 * destination must be flagged as a commercial/institutional facility.
 */
function validateBrokerDealerDestination(
  address: DeliveryAddress,
  entityType?: string,
): void {
  if (entityType !== "BROKER_DEALER") return;

  // Broker-Dealers MUST ship to commercial sub-custodian facilities
  // Flag: residential addresses are rejected
  const isResidential = !address.company || address.company.trim() === "";

  if (isResidential) {
    throw new Error(
      `BROKER_DEALER_ADDRESS_VIOLATION: Broker-Dealer entities must ship to a ` +
        `commercial sub-custodian facility, not a residential address. ` +
        `Destination must include a company/facility name. ` +
        `Address: ${address.streetAddress}, ${address.city}, ${address.stateProvince}`,
    );
  }
}

/* ---------- Public Action ---------- */

/**
 * Route a shipment to the appropriate sovereign logistics carrier.
 *
 * @param settlementId    AurumShield settlement ID
 * @param orderId         Associated order ID
 * @param notionalCents   Total notional USD value in cents
 * @param weightOz        Weight of gold in troy ounces
 * @param address         Delivery address
 * @param entityType      Entity type for address validation
 */
export async function routeAndCreateShipment(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
  entityType?: string,
): Promise<LogisticsRoutingResult> {
  // Enforce Broker-Dealer address rules
  validateBrokerDealerDestination(address, entityType);

  const carrier = selectCarrier(notionalCents);

  console.log(
    `[AurumShield] Sovereign logistics routing for ${settlementId}: ` +
      `notional=$${(notionalCents / 100).toFixed(2)} → ${carrier}`,
  );

  if (carrier === "malca_amit") {
    return handleMalcaAmit(
      settlementId,
      orderId,
      notionalCents,
      weightOz,
      address,
    );
  }

  return handleBrinks(settlementId, orderId, notionalCents, weightOz, address);
}

/* ---------- Brink's Handler ---------- */

async function handleBrinks(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  try {
    const notionalUsd = notionalCents / 100;
    const rateQuote: DeliveryRateQuote = await brinksQuote(
      address,
      weightOz,
      notionalUsd,
    );
    const shipment = await brinksCreate(
      settlementId,
      orderId,
      address,
      rateQuote,
    );

    console.log(
      `[AurumShield] Brink's shipment created for ${settlementId}:`,
      `tracking=${shipment.trackingNumber} fee=$${rateQuote.totalFee.toFixed(2)}`,
    );

    return {
      carrier: "brinks",
      success: true,
      trackingNumber: shipment.trackingNumber,
      externalId: shipment.id,
      estimatedDays: rateQuote.estimatedDays,
      totalFeeUsd: rateQuote.totalFee,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[AurumShield] Brink's logistics failed for ${settlementId}:`,
      message,
    );
    return {
      carrier: "brinks",
      success: false,
      trackingNumber: null,
      externalId: null,
      estimatedDays: null,
      totalFeeUsd: null,
      error: message,
    };
  }
}

/* ---------- Malca-Amit Handler ---------- */

async function handleMalcaAmit(
  settlementId: string,
  orderId: string,
  notionalCents: number,
  weightOz: number,
  address: DeliveryAddress,
): Promise<LogisticsRoutingResult> {
  try {
    const notionalUsd = notionalCents / 100;
    const rateQuote: DeliveryRateQuote = await malcaAmitQuote(
      address,
      weightOz,
      notionalUsd,
    );
    const shipment = await malcaAmitCreate(
      settlementId,
      orderId,
      address,
      rateQuote,
    );

    console.log(
      `[AurumShield] Malca-Amit shipment created for ${settlementId}:`,
      `tracking=${shipment.trackingNumber} fee=$${rateQuote.totalFee.toFixed(2)}`,
    );

    return {
      carrier: "malca_amit",
      success: true,
      trackingNumber: shipment.trackingNumber,
      externalId: shipment.id,
      estimatedDays: rateQuote.estimatedDays,
      totalFeeUsd: rateQuote.totalFee,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[AurumShield] Malca-Amit logistics failed for ${settlementId}:`,
      message,
    );
    return {
      carrier: "malca_amit",
      success: false,
      trackingNumber: null,
      externalId: null,
      estimatedDays: null,
      totalFeeUsd: null,
      error: message,
    };
  }
}

/* ================================================================
   ADDRESS VERIFICATION & FREIGHT QUOTING ENGINE
   ================================================================
   Algorithmic pricing for armored physical delivery.

   Origin vault: New York City, ZIP 10005 (40.7074°N, 74.0113°W)

   Pricing formula:
     Base Dispatch:      $1,500
     Mileage Surcharge:  $4.50 per driving mile
     Lloyd's Insurance:  15 basis points (0.0015) of notional USD

   Business rules:
     - Residential addresses capped at $100,000 notional
     - Domestic network limit: 3,000 driving miles
   ================================================================ */

/* ---------- Types ---------- */

export interface FreightAddress {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  addressType: "commercial" | "residential";
}

export interface FreightQuoteResult {
  /** Base dispatch fee (USD) */
  freightCost: number;
  /** Lloyd's insurance premium — 15bps of notional (USD) */
  insurancePremium: number;
  /** Total logistics fee = freightCost + insurancePremium (USD) */
  totalLogisticsFee: number;
  /** Calculated driving distance in miles */
  distanceMiles: number;
  /** Mileage surcharge component (USD) */
  mileageSurcharge: number;
  /** Base dispatch constant (USD) */
  baseDispatch: number;
}

/* ---------- Origin Vault Coordinates ---------- */

const NYC_VAULT_LAT = 40.7074;
const NYC_VAULT_LNG = -74.0113;

/* ---------- Haversine Distance ---------- */

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- Zip → Approximate Lat/Lng ---------- */

/**
 * Deterministic zip-code → latitude/longitude approximation.
 *
 * Uses the first 3 digits of the zip (SCF) mapped to approximate
 * geographic centroids. This gives reliable distance estimates
 * without requiring an external geocoding API.
 *
 * The driving distance is approximated as 1.3× the Haversine
 * (great-circle) distance — a standard detour factor for US
 * interstate road networks.
 */
const ZIP3_COORDINATES: Record<string, [number, number]> = {
  // Northeast
  "100": [40.71, -74.01],
  "101": [40.93, -73.9],
  "102": [40.68, -73.98],
  "103": [40.58, -74.15],
  "104": [40.84, -73.87],
  "105": [41.03, -73.77],
  "106": [41.14, -73.83],
  "107": [41.04, -73.62],
  "108": [40.95, -73.59],
  "109": [41.2, -73.9],
  "110": [40.77, -73.74],
  "111": [40.75, -73.87],
  "112": [40.67, -73.95],
  "113": [40.72, -73.79],
  "114": [40.62, -73.73],
  "115": [40.71, -73.6],
  "116": [40.73, -73.45],
  "117": [40.77, -73.3],
  "118": [40.92, -73.12],
  "119": [40.97, -72.8],
  // Mid-Atlantic
  "150": [40.44, -79.99],
  "151": [40.44, -79.96],
  "152": [40.5, -79.85],
  "170": [40.04, -76.31],
  "171": [40.27, -76.88],
  "172": [39.96, -76.73],
  "190": [39.95, -75.16],
  "191": [39.95, -75.16],
  "192": [39.96, -75.13],
  // Southeast
  "200": [38.9, -77.04],
  "201": [38.9, -77.04],
  "202": [38.9, -77.04],
  "210": [39.29, -76.61],
  "211": [39.29, -76.61],
  "220": [38.8, -77.12],
  "221": [38.83, -77.3],
  "230": [37.54, -77.44],
  "231": [36.85, -75.98],
  "270": [35.78, -78.64],
  "271": [36.1, -79.82],
  "280": [35.23, -80.84],
  "281": [35.23, -80.84],
  "290": [34.0, -81.03],
  "291": [34.85, -82.39],
  "300": [33.75, -84.39],
  "301": [33.75, -84.39],
  "303": [33.75, -84.39],
  "305": [33.82, -84.37],
  "320": [30.33, -81.66],
  "321": [28.54, -81.38],
  "330": [25.76, -80.19],
  "331": [26.12, -80.14],
  "332": [25.76, -80.19],
  "334": [26.64, -81.87],
  "335": [27.95, -82.46],
  // Midwest
  "400": [38.25, -85.76],
  "430": [39.96, -82.99],
  "440": [41.5, -81.69],
  "441": [41.5, -81.69],
  "460": [39.77, -86.16],
  "461": [39.77, -86.16],
  "480": [42.33, -83.05],
  "481": [42.33, -83.05],
  "500": [41.59, -93.61],
  "530": [43.07, -89.4],
  "550": [44.98, -93.27],
  "551": [44.98, -93.27],
  "600": [41.88, -87.63],
  "601": [41.88, -87.63],
  "602": [41.85, -87.65],
  "606": [41.88, -87.63],
  "630": [38.63, -90.2],
  "631": [38.63, -90.2],
  "640": [39.1, -94.58],
  "641": [39.1, -94.58],
  // South
  "370": [36.16, -86.78],
  "371": [36.16, -86.78],
  "700": [29.95, -90.07],
  "701": [29.95, -90.07],
  "730": [35.47, -97.52],
  "731": [36.15, -95.99],
  "750": [32.78, -96.8],
  "751": [32.78, -96.8],
  "770": [29.76, -95.37],
  "771": [29.76, -95.37],
  "780": [29.42, -98.49],
  "786": [30.27, -97.74],
  // Mountain / West
  "800": [39.74, -104.99],
  "801": [39.74, -104.99],
  "802": [39.74, -104.99],
  "803": [38.83, -104.82],
  "810": [40.59, -105.08],
  "820": [41.14, -104.82],
  "830": [43.61, -116.2],
  "840": [40.76, -111.89],
  "850": [33.45, -112.07],
  "852": [33.45, -112.07],
  "856": [32.22, -110.93],
  "870": [35.08, -106.65],
  "871": [35.08, -106.65],
  "880": [32.35, -106.74],
  "890": [36.17, -115.14],
  "891": [36.17, -115.14],
  // Pacific
  "900": [34.05, -118.24],
  "901": [34.05, -118.24],
  "902": [33.77, -118.19],
  "906": [34.18, -118.31],
  "910": [34.14, -118.26],
  "913": [34.42, -118.53],
  "920": [32.72, -117.16],
  "921": [32.72, -117.16],
  "930": [34.42, -119.7],
  "935": [36.75, -119.77],
  "940": [37.78, -122.42],
  "941": [37.78, -122.42],
  "943": [37.34, -121.89],
  "945": [37.8, -122.27],
  "946": [37.8, -122.27],
  "950": [37.34, -121.89],
  "951": [33.95, -117.4],
  "952": [38.58, -121.49],
  "953": [38.58, -121.49],
  "956": [38.58, -121.49],
  "958": [38.44, -122.71],
  "970": [45.52, -122.68],
  "971": [45.52, -122.68],
  "972": [44.05, -123.09],
  "973": [44.94, -123.03],
  "974": [42.33, -122.86],
  "980": [47.61, -122.33],
  "981": [47.61, -122.33],
  "982": [47.25, -122.44],
  "983": [47.04, -122.9],
  "984": [47.66, -117.43],
  "995": [61.22, -149.9],
  "996": [64.84, -147.72],
  "967": [21.31, -157.86],
  "968": [21.31, -157.86],
};

function zipToCoordinates(zipCode: string): [number, number] | null {
  const prefix3 = zipCode.slice(0, 3);
  if (ZIP3_COORDINATES[prefix3]) return ZIP3_COORDINATES[prefix3];

  // Fallback: interpolate from first digit (broad US region)
  const regionCentroids: Record<string, [number, number]> = {
    "0": [42.36, -71.06], // Boston / Northeast
    "1": [40.71, -74.01], // New York / Mid-Atlantic
    "2": [38.9, -77.04], // DC / Southeast
    "3": [33.75, -84.39], // Atlanta / Deep South
    "4": [41.5, -81.69], // Cleveland / Great Lakes
    "5": [44.98, -93.27], // Minneapolis / Upper Midwest
    "6": [41.88, -87.63], // Chicago / Central
    "7": [29.76, -95.37], // Houston / Gulf States
    "8": [39.74, -104.99], // Denver / Mountain
    "9": [37.78, -122.42], // San Francisco / Pacific
  };
  const first = zipCode.charAt(0);
  return regionCentroids[first] ?? null;
}

/* ---------- Pricing Constants ---------- */

const BASE_DISPATCH_USD = 1_500;
const MILEAGE_RATE_PER_MILE = 4.5;
const INSURANCE_BPS = 0.0015; // 15 basis points
const DRIVING_DETOUR_FACTOR = 1.3;
const MAX_DOMESTIC_MILES = 3_000;
const RESIDENTIAL_NOTIONAL_CAP = 100_000;

/* ---------- Public Action: Address Verification & Quoting ---------- */

/**
 * Verify a delivery address and return an algorithmic freight quote.
 *
 * Calculates driving distance from the NYC vault (10005) to the
 * destination zip code, applies the sovereign logistics pricing
 * formula, and enforces business rules.
 *
 * @throws If residential + notional > $100k
 * @throws If distance > 3,000 miles (outside domestic network)
 */
export async function verifyAddressAndQuote(
  address: FreightAddress,
  notionalUsd: number,
): Promise<FreightQuoteResult> {
  // ── Business Rule: $100k Residential Cap ──
  if (
    address.addressType === "residential" &&
    notionalUsd > RESIDENTIAL_NOTIONAL_CAP
  ) {
    throw new Error(
      "Armored delivery exceeding $100,000 requires a Commercial or Bank delivery address.",
    );
  }

  // ── Zip Code → Coordinates ──
  const destCoords = zipToCoordinates(address.zipCode);
  if (!destCoords) {
    throw new Error(
      `Unable to resolve destination zip code: ${address.zipCode}. ` +
        `Please verify the address and retry.`,
    );
  }

  // ── Distance Calculation ──
  const straightLineMiles = haversineMiles(
    NYC_VAULT_LAT,
    NYC_VAULT_LNG,
    destCoords[0],
    destCoords[1],
  );
  const drivingMiles = Math.round(straightLineMiles * DRIVING_DETOUR_FACTOR);

  // ── Business Rule: 3,000 Mile Domestic Limit ──
  if (drivingMiles > MAX_DOMESTIC_MILES) {
    throw new Error(
      "Destination outside domestic network. Contact trade desk for air-freight.",
    );
  }

  // ── Pricing ──
  const mileageSurcharge = drivingMiles * MILEAGE_RATE_PER_MILE;
  const freightCost = BASE_DISPATCH_USD + mileageSurcharge;
  const insurancePremium = notionalUsd * INSURANCE_BPS;
  const totalLogisticsFee = freightCost + insurancePremium;

  console.log(
    `[AurumShield] Freight quote: ${address.zipCode} → ` +
      `${drivingMiles}mi, dispatch=$${BASE_DISPATCH_USD}, ` +
      `mileage=$${mileageSurcharge.toFixed(2)}, ` +
      `insurance=$${insurancePremium.toFixed(2)}, ` +
      `total=$${totalLogisticsFee.toFixed(2)}`,
  );

  return {
    freightCost,
    insurancePremium,
    totalLogisticsFee,
    distanceMiles: drivingMiles,
    mileageSurcharge,
    baseDispatch: BASE_DISPATCH_USD,
  };
}
