/* ================================================================
   KYCAID ADAPTER — Server-Side KYC/KYB/AML Provider
   ================================================================
   Unified server-side adapter for the KYCaid identity verification
   platform. Handles all three compliance verticals:

     - KYC (individual identity verification via PERSON applicants)
     - KYB (business verification via COMPANY applicants + affiliated persons)
     - AML (sanctions/PEP screening via database_screening verifications)

   API Reference: https://docs-v1.kycaid.com/
   Auth: Token-based — "Authorization: Token {API_TOKEN}"

   Environment Variables:
     KYCAID_TEST_API_KEY      — Test-mode API token
     KYCAID_PRODUCTION_API_KEY — Production API token
     KYCAID_ENV               — "test" (default) or "production"
     KYCAID_FORM_ID_KYC       — Form ID for KYC verification flows
     KYCAID_FORM_ID_KYB       — Form ID for KYB verification flows

   Fail-closed: All methods throw on API errors. No silent pass-through.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import "server-only";

/* ================================================================
   Types
   ================================================================ */

/** KYCaid applicant type. PERSON for KYC, COMPANY for KYB. */
export type KycaidApplicantType = "PERSON" | "COMPANY";

/** KYCaid affiliated person type. */
export type KycaidAffiliatedPersonType = "AUTHORISED" | "BENEFICIAL";

/** KYCaid verification statuses (from GET /verifications/{id}). */
export type KycaidVerificationStatus = "unused" | "pending" | "completed";

/** Normalized internal status derived from KYCaid responses. */
export type NormalizedKycaidStatus =
  | "APPROVED"
  | "REJECTED"
  | "PENDING_PROVIDER"
  | "PENDING_USER";

/** Per-type verification result from the verifications object. */
export interface KycaidVerificationTypeResult {
  verified: boolean;
  comment: string;
  decline_reasons?: string[];
}

/** Full verification response from GET /verifications/{id}. */
export interface KycaidVerificationResponse {
  applicant_id: string;
  verification_id: string;
  status: KycaidVerificationStatus;
  verified: boolean | null;
  verifications: Record<string, KycaidVerificationTypeResult> | null;
}

/** Result from createApplicant(). */
export interface KycaidApplicantResult {
  provider: "KYCAID";
  applicantId: string;
}

/** Result from createVerification(). */
export interface KycaidVerificationResult {
  provider: "KYCAID";
  verificationId: string;
}

/** Result from getFormUrl(). */
export interface KycaidFormUrlResult {
  provider: "KYCAID";
  formId: string;
  url: string;
}

/** Standardized session result for the compliance engine routing layer. */
export interface KycaidSessionResult {
  provider: "KYCAID";
  applicantId: string;
  verificationId: string;
  sessionUrl: string;
}

/** Result from createAffiliatedPerson(). */
export interface KycaidAffiliatedPersonResult {
  provider: "KYCAID";
  affiliatedPersonId: string;
}

/* ── Input types ── */

export interface CreatePersonApplicantInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  dob: string;           // YYYY-MM-DD
  gender?: "M" | "F";
  pep?: boolean;
  residenceCountry: string; // ISO 3166-2
  nationality?: string;     // ISO 3166-2
  phone?: string;
  email?: string;
  externalApplicantId?: string; // AurumShield userId
}

export interface CreateCompanyApplicantInput {
  companyName: string;
  registrationCountry: string; // ISO 3166-2
  registrationNumber?: string;
  /** KYCaid business_activity_id — REQUIRED by API. Use getDefaultBusinessActivityId(). */
  businessActivityId: string;
  phone: string;
  email: string;
  externalApplicantId?: string; // AurumShield userId/orgId
}

export interface CreateAffiliatedPersonInput {
  type: KycaidAffiliatedPersonType;
  applicantId: string;
  firstName: string;
  lastName: string;
  title?: string;
  share?: number;
  dob?: string;
  residenceCountry?: string;
  nationality?: string;
  email?: string;
}

/* ================================================================
   Constants
   ================================================================ */

const KYCAID_API_BASE = "https://api.kycaid.com";

/* ================================================================
   Internal Helpers
   ================================================================ */

/**
 * Resolve the active KYCaid API token from environment.
 * Fail-closed: throws if no token is configured.
 */
function getApiToken(): string {
  const env = (process.env.KYCAID_ENV ?? "test").toLowerCase();
  const token =
    env === "production"
      ? process.env.KYCAID_PRODUCTION_API_KEY
      : process.env.KYCAID_TEST_API_KEY;

  if (!token) {
    throw new Error(
      `[KYCAID] CRITICAL: KYCAID_${env === "production" ? "PRODUCTION" : "TEST"}_API_KEY is not configured. ` +
        `Cannot communicate with KYCaid API. Set the environment variable and redeploy.`,
    );
  }

  return token;
}

/**
 * Make an authenticated request to the KYCaid API.
 * Throws on non-2xx responses with detailed error context.
 */
async function kycaidFetch<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getApiToken();
  const url = `${KYCAID_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body");
    console.error(
      `[KYCAID] API request FAILED: ${method} ${path} → HTTP ${response.status} — ${errorBody}`,
    );
    throw new Error(
      `KYCaid API error: ${method} ${path} returned HTTP ${response.status} — ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/* ================================================================
   Applicant Operations
   ================================================================ */

/**
 * Create a PERSON applicant for individual KYC verification.
 *
 * @param input - Person details (name, dob, residenceCountry required)
 * @returns The KYCaid applicant_id
 */
export async function createPersonApplicant(
  input: CreatePersonApplicantInput,
): Promise<KycaidApplicantResult> {
  console.log(
    `[KYCAID] Creating PERSON applicant: name="${input.firstName} ${input.lastName}" ` +
      `country=${input.residenceCountry} externalId=${input.externalApplicantId ?? "none"}`,
  );

  const body: Record<string, unknown> = {
    type: "PERSON",
    first_name: input.firstName,
    last_name: input.lastName,
    dob: input.dob,
    residence_country: input.residenceCountry,
  };

  if (input.middleName) body.middle_name = input.middleName;
  if (input.gender) body.gender = input.gender;
  if (input.pep !== undefined) body.pep = input.pep;
  if (input.nationality) body.nationality = input.nationality;
  if (input.phone) body.phone = input.phone;
  if (input.email) body.email = input.email;
  if (input.externalApplicantId) body.external_applicant_id = input.externalApplicantId;

  const data = await kycaidFetch<{ applicant_id: string }>("POST", "/applicants", body);

  console.log(`[KYCAID] PERSON applicant created: applicant_id=${data.applicant_id}`);

  return {
    provider: "KYCAID",
    applicantId: data.applicant_id,
  };
}

/**
 * Create a COMPANY applicant for KYB verification.
 *
 * @param input - Company details (name, registrationCountry required)
 * @returns The KYCaid applicant_id
 */
export async function createCompanyApplicant(
  input: CreateCompanyApplicantInput,
): Promise<KycaidApplicantResult> {
  console.log(
    `[KYCAID] Creating COMPANY applicant: name="${input.companyName}" ` +
      `country=${input.registrationCountry} externalId=${input.externalApplicantId ?? "none"}`,
  );

  const body: Record<string, unknown> = {
    type: "COMPANY",
    company_name: input.companyName,
    registration_country: input.registrationCountry,
    business_activity_id: input.businessActivityId,
    phone: input.phone,
    email: input.email,
  };

  if (input.registrationNumber) body.registration_number = input.registrationNumber;
  if (input.externalApplicantId) body.external_applicant_id = input.externalApplicantId;

  const data = await kycaidFetch<{ applicant_id: string }>("POST", "/applicants", body);

  console.log(`[KYCAID] COMPANY applicant created: applicant_id=${data.applicant_id}`);

  return {
    provider: "KYCAID",
    applicantId: data.applicant_id,
  };
}

/**
 * Get applicant data by ID.
 */
export async function getApplicant(
  applicantId: string,
): Promise<Record<string, unknown>> {
  return kycaidFetch<Record<string, unknown>>("GET", `/applicants/${applicantId}`);
}

/* ================================================================
   Affiliated Persons (UBOs & Authorized Signers)
   ================================================================ */

/**
 * Create an affiliated person (UBO or authorized signer) linked to
 * a COMPANY applicant. Required for KYB verification flows.
 *
 * @param input - Person details with type (AUTHORISED or BENEFICIAL)
 * @returns The KYCaid affiliated_person_id
 */
export async function createAffiliatedPerson(
  input: CreateAffiliatedPersonInput,
): Promise<KycaidAffiliatedPersonResult> {
  console.log(
    `[KYCAID] Creating ${input.type} affiliated person: ` +
      `name="${input.firstName} ${input.lastName}" applicantId=${input.applicantId}`,
  );

  const body: Record<string, unknown> = {
    type: input.type,
    applicant_id: input.applicantId,
    first_name: input.firstName,
    last_name: input.lastName,
  };

  if (input.title) body.title = input.title;
  if (input.share !== undefined) body.share = input.share;
  if (input.dob) body.dob = input.dob;
  if (input.residenceCountry) body.residence_country = input.residenceCountry;
  if (input.nationality) body.nationality = input.nationality;
  if (input.email) body.email = input.email;

  const data = await kycaidFetch<{ affiliated_person_id: string }>(
    "POST",
    "/affiliated-persons",
    body,
  );

  console.log(
    `[KYCAID] Affiliated person created: id=${data.affiliated_person_id} type=${input.type}`,
  );

  return {
    provider: "KYCAID",
    affiliatedPersonId: data.affiliated_person_id,
  };
}

/* ================================================================
   Verification Operations
   ================================================================ */

/**
 * Create a new verification for an applicant.
 *
 * @param applicantId - The KYCaid applicant_id
 * @param formId - The KYCaid form_id (configured per verification type)
 * @returns The verification_id
 */
export async function createVerification(
  applicantId: string,
  formId: string,
): Promise<KycaidVerificationResult> {
  console.log(
    `[KYCAID] Creating verification: applicantId=${applicantId} formId=${formId}`,
  );

  const data = await kycaidFetch<{ verification_id: string }>(
    "POST",
    "/verifications",
    {
      applicant_id: applicantId,
      form_id: formId,
    },
  );

  console.log(
    `[KYCAID] Verification created: verification_id=${data.verification_id}`,
  );

  return {
    provider: "KYCAID",
    verificationId: data.verification_id,
  };
}

/**
 * Get verification status and results.
 *
 * @param verificationId - The KYCaid verification_id
 * @returns Full verification response including per-type results
 */
export async function getVerification(
  verificationId: string,
): Promise<KycaidVerificationResponse> {
  return kycaidFetch<KycaidVerificationResponse>(
    "GET",
    `/verifications/${verificationId}`,
  );
}

/**
 * Get the hosted form URL for a verification.
 * This is the URL the user is redirected to for completing verification.
 *
 * @param formId - The KYCaid form_id
 * @param verificationId - The verification_id to bind to the form
 * @returns The redirect URL
 */
export async function getFormUrl(
  formId: string,
  verificationId: string,
): Promise<KycaidFormUrlResult> {
  const data = await kycaidFetch<{ form_url: string }>(
    "GET",
    `/forms/${formId}/url?verification_id=${verificationId}`,
  );

  return {
    provider: "KYCAID",
    formId,
    url: data.form_url,
  };
}

/* ================================================================
   Status Normalization
   ================================================================ */

/**
 * Normalize KYCaid verification status to internal compliance status.
 *
 * FAIL-CLOSED: any status other than `completed + verified=true`
 * is treated as non-approved.
 *
 * Mapping:
 *   completed + verified=true  → APPROVED
 *   completed + verified=false → REJECTED
 *   pending                    → PENDING_PROVIDER
 *   unused                     → PENDING_USER
 */
export function normalizeVerificationStatus(
  status: KycaidVerificationStatus,
  verified: boolean | null,
): NormalizedKycaidStatus {
  if (status === "completed") {
    return verified === true ? "APPROVED" : "REJECTED";
  }
  if (status === "pending") {
    return "PENDING_PROVIDER";
  }
  // "unused" or any other unknown status
  return "PENDING_USER";
}

/* ================================================================
   High-Level Session Orchestration
   ================================================================ */

/**
 * Orchestrate a full KYC session: create applicant → create verification → get form URL.
 *
 * This is the primary entry point used by the compliance engine routing layer.
 *
 * @param input - Person or company applicant data
 * @param isCompany - Whether this is a KYB (company) flow
 * @returns Session result with redirect URL
 */
export async function initiateKycaidSession(
  input: CreatePersonApplicantInput | CreateCompanyApplicantInput,
  isCompany: boolean,
): Promise<KycaidSessionResult> {
  // Step 1: Create applicant
  let applicantId: string;
  if (isCompany) {
    const result = await createCompanyApplicant(input as CreateCompanyApplicantInput);
    applicantId = result.applicantId;
  } else {
    const result = await createPersonApplicant(input as CreatePersonApplicantInput);
    applicantId = result.applicantId;
  }

  // Step 2: Resolve the correct form ID
  const formId = isCompany
    ? process.env.KYCAID_FORM_ID_KYB
    : process.env.KYCAID_FORM_ID_KYC;

  if (!formId) {
    throw new Error(
      `[KYCAID] CRITICAL: KYCAID_FORM_ID_${isCompany ? "KYB" : "KYC"} is not configured. ` +
        `Set this in the KYCaid dashboard and add to env variables.`,
    );
  }

  // Step 3: Create verification
  const verification = await createVerification(applicantId, formId);

  // Step 4: Get form URL
  const formUrl = await getFormUrl(formId, verification.verificationId);

  console.log(
    `[KYCAID] Session initiated: applicant=${applicantId} ` +
      `verification=${verification.verificationId} type=${isCompany ? "KYB" : "KYC"} ` +
      `url=${formUrl.url}`,
  );

  return {
    provider: "KYCAID",
    applicantId,
    verificationId: verification.verificationId,
    sessionUrl: formUrl.url,
  };
}

/* ================================================================
   Form ID Helpers
   ================================================================ */

/**
 * Get the configured KYC form ID.
 * Throws if not configured.
 */
export function getKycFormId(): string {
  const formId = process.env.KYCAID_FORM_ID_KYC;
  if (!formId) {
    throw new Error("[KYCAID] KYCAID_FORM_ID_KYC is not configured.");
  }
  return formId;
}

/**
 * Get the configured KYB form ID.
 * Throws if not configured.
 */
export function getKybFormId(): string {
  const formId = process.env.KYCAID_FORM_ID_KYB;
  if (!formId) {
    throw new Error("[KYCAID] KYCAID_FORM_ID_KYB is not configured.");
  }
  return formId;
}

/* ================================================================
   Business Activity Helpers
   ================================================================ */

/** Flattened business activity entry (from the nested category→activity structure). */
export interface KycaidBusinessActivity {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

/** Raw KYCaid /business-activities response shape. */
interface KycaidBusinessActivityCategory {
  business_category_id: string;
  labels: Array<{ label: string; language_code: string }>;
  activities: Array<{
    business_activity_id: string;
    labels: Array<{ label: string; language_code: string }>;
  }>;
}

/** Cached business activities list to avoid repeated API calls. */
let cachedBusinessActivities: KycaidBusinessActivity[] | null = null;

/**
 * Fetch the list of valid business activities from KYCaid.
 * GET /business-activities
 *
 * The API returns a nested array of categories, each containing activities.
 * This function flattens them into a simple {id, name} array.
 * Caches the result in memory for the process lifetime.
 */
export async function getBusinessActivities(): Promise<KycaidBusinessActivity[]> {
  if (cachedBusinessActivities) return cachedBusinessActivities;

  const raw = await kycaidFetch<KycaidBusinessActivityCategory[]>(
    "GET",
    "/business-activities",
  );

  const flattened: KycaidBusinessActivity[] = [];
  for (const cat of raw) {
    const catLabel = cat.labels?.find((l) => l.language_code === "EN")?.label ?? cat.labels?.[0]?.label ?? "Unknown";
    for (const act of cat.activities ?? []) {
      const actLabel = act.labels?.find((l) => l.language_code === "EN")?.label ?? act.labels?.[0]?.label ?? "Unknown";
      flattened.push({
        id: act.business_activity_id,
        name: actLabel,
        categoryId: cat.business_category_id,
        categoryName: catLabel,
      });
    }
  }

  cachedBusinessActivities = flattened;
  console.log(`[KYCAID] Fetched ${flattened.length} business activities (from ${raw.length} categories)`);
  return flattened;
}

/**
 * Resolve the default business_activity_id for COMPANY applicants.
 *
 * Priority:
 *   1. KYCAID_BUSINESS_ACTIVITY_ID env var (explicit override)
 *   2. Dynamic lookup from GET /business-activities, matching
 *      "Financial" or first available entry
 *
 * Fail-closed: throws if no business activity can be resolved.
 */
export async function getDefaultBusinessActivityId(): Promise<string> {
  // Priority 1: Explicit env var
  const envId = process.env.KYCAID_BUSINESS_ACTIVITY_ID;
  if (envId) {
    console.log(`[KYCAID] Using KYCAID_BUSINESS_ACTIVITY_ID from env: ${envId}`);
    return envId;
  }

  // Priority 2: Dynamic lookup
  const activities = await getBusinessActivities();
  if (activities.length === 0) {
    throw new Error(
      "[KYCAID] CRITICAL: No business activities returned from KYCaid API. " +
        "Set KYCAID_BUSINESS_ACTIVITY_ID env var as a fallback.",
    );
  }

  // Try to find the best match for a gold/commodity dealing financial activity
  const financial =
    activities.find((a) => /commodity/i.test(a.name)) ??
    activities.find((a) => /security dealing/i.test(a.name)) ??
    activities.find((a) => /financial intermediation/i.test(a.name)) ??
    activities.find((a) => /financial|banking|investment|trading/i.test(a.name));

  const selected = financial ?? activities[0];
  console.log(
    `[KYCAID] Auto-selected business_activity_id: ${selected.id} (${selected.name})`,
  );
  return selected.id;
}
