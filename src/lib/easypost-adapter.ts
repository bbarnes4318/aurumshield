/* ================================================================
   EASYPOST ADAPTER — USPS Registered Mail Rate Quoting & Tracking
   ================================================================
   Direct REST client for the EasyPost API. Uses native fetch()
   calls exclusively — the easypost-node SDK is NOT used because
   it causes known Webpack hydration/dependency errors in Next.js
   App Router environments.

   Capabilities:
   1. Create shipment & get USPS Registered Mail rate quote
   2. Purchase the selected rate (returns tracking number)
   3. Track an existing shipment by tracker ID

   Auth: Basic auth with EASYPOST_API_KEY
   API Base: https://api.easypost.com/v2

   All functions gracefully fall back to mock data when the API
   key is absent (demo mode).
   ================================================================ */

/* ---------- Types ---------- */

export interface EasyPostAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface EasyPostParcel {
  /** Length in inches */
  length: number;
  /** Width in inches */
  width: number;
  /** Height in inches */
  height: number;
  /** Weight in ounces */
  weight: number;
}

export interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  /** Estimated delivery days */
  estDeliveryDays: number | null;
  /** List price before negotiated discount */
  listRate: string;
}

export interface EasyPostShipment {
  id: string;
  status: string;
  trackingCode: string | null;
  rates: EasyPostRate[];
  selectedRate: EasyPostRate | null;
  fromAddress: EasyPostAddress;
  toAddress: EasyPostAddress;
  parcel: EasyPostParcel;
  /** Pre-filtered USPS Registered Mail rate (convenience field) */
  registeredMailRate: EasyPostRate | null;
}

export interface EasyPostTrackingEvent {
  datetime: string;
  message: string;
  status: string;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
}

export interface EasyPostTracker {
  id: string;
  trackingCode: string;
  carrier: string;
  status: string;
  estDeliveryDate: string | null;
  trackingDetails: EasyPostTrackingEvent[];
}

/* ---------- Configuration ---------- */

const EASYPOST_API_BASE = "https://api.easypost.com/v2";

function getApiKey(): string | null {
  if (typeof process !== "undefined" && process.env) {
    return process.env.EASYPOST_API_KEY ?? null;
  }
  return null;
}

function getAuthHeader(): string {
  const key = getApiKey();
  if (!key) throw new Error("EASYPOST_API_KEY is not configured");
  // EasyPost uses HTTP Basic auth: API key as username, empty password
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/* ---------- Internal Helpers ---------- */

async function easyPostFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${EASYPOST_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `EasyPost API error ${response.status}: ${response.statusText}. ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/* ---------- Mock Data (Demo Mode) ---------- */

const MOCK_REGISTERED_RATE: EasyPostRate = {
  id: "rate_mock_usps_registered",
  carrier: "USPS",
  service: "RegisteredMail",
  rate: "28.50",
  currency: "USD",
  estDeliveryDays: 7,
  listRate: "32.00",
};

function createMockShipment(
  from: EasyPostAddress,
  to: EasyPostAddress,
  parcel: EasyPostParcel,
): EasyPostShipment {
  return {
    id: `shp_mock_${Date.now()}`,
    status: "unknown",
    trackingCode: null,
    rates: [
      MOCK_REGISTERED_RATE,
      {
        id: "rate_mock_usps_priority",
        carrier: "USPS",
        service: "Priority",
        rate: "18.75",
        currency: "USD",
        estDeliveryDays: 3,
        listRate: "22.00",
      },
      {
        id: "rate_mock_fedex_ground",
        carrier: "FedEx",
        service: "FEDEX_GROUND",
        rate: "15.20",
        currency: "USD",
        estDeliveryDays: 5,
        listRate: "19.50",
      },
    ],
    selectedRate: null,
    fromAddress: from,
    toAddress: to,
    parcel,
    registeredMailRate: MOCK_REGISTERED_RATE,
  };
}

function createMockTracker(trackingCode: string): EasyPostTracker {
  const now = new Date();
  return {
    id: `trk_mock_${Date.now()}`,
    trackingCode,
    carrier: "USPS",
    status: "in_transit",
    estDeliveryDate: new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    trackingDetails: [
      {
        datetime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Shipment accepted by USPS at origin facility",
        status: "pre_transit",
        city: "New York",
        state: "NY",
        country: "US",
        zip: "10001",
      },
      {
        datetime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Departed USPS regional facility",
        status: "in_transit",
        city: "Newark",
        state: "NJ",
        country: "US",
        zip: "07101",
      },
      {
        datetime: now.toISOString(),
        message: "In transit to destination",
        status: "in_transit",
        city: "Philadelphia",
        state: "PA",
        country: "US",
        zip: "19101",
      },
    ],
  };
}

/* ---------- Standard Gold Parcel ---------- */

/**
 * Compute parcel dimensions for gold bullion.
 * Uses industry-standard packaging for USPS Registered Mail.
 * Gold density: ~19.32 g/cm³, so a 1 oz (31.1g) bar ≈ 1.6 cm³
 */
export function goldParcel(weightOz: number): EasyPostParcel {
  // Pack gold in padded, tamper-evident case
  // Minimum parcel size for Registered Mail: 6" × 4" × 2"
  const baseWeight = weightOz * 31.1 * 0.03527396; // troy oz → avoirdupois oz
  const packagingWeight = 8; // ~8 oz for padded case + tamper seals
  return {
    length: 8, // inches
    width: 6,
    height: 3,
    weight: Math.ceil(baseWeight + packagingWeight),
  };
}

/* ---------- AurumShield Vault Address ---------- */

/** Default origin address: AurumShield vault facility */
export const VAULT_ORIGIN_ADDRESS: EasyPostAddress = {
  name: "AurumShield Vault Operations",
  street1: "1 Federal Reserve Plaza",
  street2: "Suite 4200",
  city: "New York",
  state: "NY",
  zip: "10045",
  country: "US",
  phone: "+12125551234",
  email: "vault-ops@aurumshield.com",
};

/* ---------- Public API ---------- */

/**
 * Create a shipment and get a USPS Registered Mail rate quote.
 *
 * Falls back to mock data when EASYPOST_API_KEY is not configured.
 *
 * @param toAddress   Destination address
 * @param weightOz    Weight of gold in troy ounces
 * @param fromAddress Origin address (defaults to AurumShield vault)
 * @returns Shipment object with rates and pre-filtered registeredMailRate
 */
export async function createShipmentQuote(
  toAddress: EasyPostAddress,
  weightOz: number,
  fromAddress: EasyPostAddress = VAULT_ORIGIN_ADDRESS,
): Promise<EasyPostShipment> {
  const parcel = goldParcel(weightOz);

  // Demo mode fallback
  if (!getApiKey()) {
    console.info(
      "[AurumShield] EasyPost demo mode — returning mock USPS Registered Mail quote",
    );
    return createMockShipment(fromAddress, toAddress, parcel);
  }

  // Live EasyPost API call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await easyPostFetch<any>("/shipments", {
    method: "POST",
    body: JSON.stringify({
      shipment: {
        from_address: {
          name: fromAddress.name,
          street1: fromAddress.street1,
          street2: fromAddress.street2,
          city: fromAddress.city,
          state: fromAddress.state,
          zip: fromAddress.zip,
          country: fromAddress.country,
          phone: fromAddress.phone,
          email: fromAddress.email,
        },
        to_address: {
          name: toAddress.name,
          street1: toAddress.street1,
          street2: toAddress.street2,
          city: toAddress.city,
          state: toAddress.state,
          zip: toAddress.zip,
          country: toAddress.country,
          phone: toAddress.phone,
          email: toAddress.email,
        },
        parcel: {
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
          weight: parcel.weight,
        },
        options: {
          // Request USPS Registered Mail specifically
          special_rates_eligibility: "USPS.REGISTEREDMAIL",
        },
      },
    }),
  });

  // Map API response to our interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rates: EasyPostRate[] = (response.rates ?? []).map((r: any) => ({
    id: r.id,
    carrier: r.carrier,
    service: r.service,
    rate: r.rate,
    currency: r.currency,
    estDeliveryDays: r.est_delivery_days ?? null,
    listRate: r.list_rate ?? r.rate,
  }));

  // Find USPS Registered Mail rate
  const registeredMailRate =
    rates.find(
      (r) =>
        r.carrier === "USPS" &&
        r.service.toLowerCase().includes("registered"),
    ) ?? null;

  return {
    id: response.id,
    status: response.status ?? "unknown",
    trackingCode: response.tracking_code ?? null,
    rates,
    selectedRate: null,
    fromAddress,
    toAddress,
    parcel,
    registeredMailRate,
  };
}

/**
 * Purchase a rate on an existing shipment.
 * Returns the shipment with tracking code populated.
 */
export async function purchaseRate(
  shipmentId: string,
  rateId: string,
): Promise<{ trackingCode: string; shipmentId: string }> {
  if (!getApiKey()) {
    console.info("[AurumShield] EasyPost demo mode — mock purchase");
    return {
      trackingCode: `9400111899223${Date.now().toString().slice(-7)}`,
      shipmentId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await easyPostFetch<any>(
    `/shipments/${shipmentId}/buy`,
    {
      method: "POST",
      body: JSON.stringify({ rate: { id: rateId } }),
    },
  );

  return {
    trackingCode: response.tracking_code ?? "",
    shipmentId: response.id,
  };
}

/**
 * Track an existing shipment by tracking code.
 */
export async function trackShipment(
  trackingCode: string,
  carrier: string = "USPS",
): Promise<EasyPostTracker> {
  if (!getApiKey()) {
    console.info("[AurumShield] EasyPost demo mode — mock tracking");
    return createMockTracker(trackingCode);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await easyPostFetch<any>("/trackers", {
    method: "POST",
    body: JSON.stringify({
      tracker: {
        tracking_code: trackingCode,
        carrier,
      },
    }),
  });

  return {
    id: response.id,
    trackingCode: response.tracking_code,
    carrier: response.carrier,
    status: response.status,
    estDeliveryDate: response.est_delivery_date ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trackingDetails: (response.tracking_details ?? []).map((d: any) => ({
      datetime: d.datetime,
      message: d.message,
      status: d.status,
      city: d.tracking_location?.city ?? null,
      state: d.tracking_location?.state ?? null,
      country: d.tracking_location?.country ?? null,
      zip: d.tracking_location?.zip ?? null,
    })),
  };
}
