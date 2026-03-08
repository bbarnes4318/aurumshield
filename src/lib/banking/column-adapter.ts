/* ================================================================
   COLUMN BANK ADAPTER — Direct Fedwire Settlement Rail
   ================================================================
   Typed service adapter for the Column Bank API. Replaces BaaS
   middleware with direct programmatic access to:
     1. Counterparty registration (corporate buyer onboarding)
     2. Virtual FBO account generation (per-settlement routing)
     3. Outbound Fedwire execution (DvP payout)

   Environment:
     COLUMN_API_KEY     — Column API bearer token
     COLUMN_API_URL     — Base URL (default: https://api.column.com)

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

/* ---------- Interfaces ---------- */

/** Entity details for counterparty registration. */
export interface ColumnCounterpartyInput {
  /** Legal entity name of the corporate buyer */
  entityName: string;
  /** Entity type classification */
  entityType: "corporation" | "llc" | "partnership" | "trust" | "individual";
  /** EIN / Tax ID (US) */
  ein: string;
  /** Registered address */
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  /** Primary contact email */
  email: string;
  /** Primary contact phone (E.164 format) */
  phone?: string;
}

/** Column counterparty record returned after registration. */
export interface ColumnCounterparty {
  /** Column-assigned counterparty ID */
  id: string;
  /** ABA routing number assigned to counterparty */
  routingNumber: string;
  /** Account number assigned to counterparty */
  accountNumber: string;
  /** Legal entity name */
  entityName: string;
  /** Entity type classification */
  entityType: "corporation" | "llc" | "partnership" | "trust" | "individual";
  /** Counterparty lifecycle status */
  status: "pending" | "active" | "suspended" | "closed";
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * Column virtual FBO (For Benefit Of) account.
 * Each settlement gets a unique routing/account pair so that
 * inbound Fedwires are automatically attributed to the correct trade.
 */
export interface ColumnVirtualAccount {
  /** Column-assigned virtual account ID */
  id: string;
  /** Parent counterparty this account belongs to */
  counterpartyId: string;
  /** Unique ABA routing number for this virtual account */
  routingNumber: string;
  /** Unique account number for this virtual account */
  accountNumber: string;
  /** Human-readable description (e.g. settlement ID) */
  description: string;
  /** Currency code (ISO 4217) */
  currency: "USD";
  /** Virtual account lifecycle status */
  status: "active" | "closed";
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/** Destination details for an outbound Fedwire. */
export interface ColumnWireDestination {
  /** Beneficiary ABA routing number */
  routingNumber: string;
  /** Beneficiary account number */
  accountNumber: string;
  /** Beneficiary legal name (required for Fedwire) */
  beneficiaryName: string;
  /** Optional beneficiary address (line 1) */
  beneficiaryAddress?: string;
}

/**
 * Column outbound wire transfer record.
 * Represents a Fedwire initiated via POST /transfers/wire.
 */
export interface ColumnWireTransfer {
  /** Column-assigned wire transfer ID */
  id: string;
  /** Source account ID (our FBO virtual account) */
  accountId: string;
  /** Wire amount in cents (smallest USD denomination) */
  amount: number;
  /** Currency code */
  currency: "USD";
  /** Wire lifecycle status */
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "reversed"
    | "cancelled";
  /** Destination routing number */
  destinationRoutingNumber: string;
  /** Destination account number */
  destinationAccountNumber: string;
  /** Beneficiary legal name on the wire */
  beneficiaryName: string;
  /** Fedwire reference message (OBI / originator-to-beneficiary info) */
  referenceMessage: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * Column webhook event payload.
 * Received at POST /api/webhooks/column when Column notifies us
 * of inbound Fedwires, transfer status changes, etc.
 */
export interface ColumnWebhookPayload {
  /** Column event ID (for idempotency) */
  id: string;
  /** Event type discriminator */
  type:
    | "transfer.incoming.completed"
    | "transfer.outgoing.completed"
    | "transfer.outgoing.failed"
    | "virtual_account.credited";
  /** Event data — shape varies by type but always includes these fields */
  data: {
    /** Virtual account ID that received / sent funds */
    virtual_account_id: string;
    /** Transfer amount in cents */
    amount: number;
    /** Currency code */
    currency: "USD";
    /** External transfer ID from Column */
    transfer_id: string;
    /** Transfer status at time of event */
    status: "completed" | "failed" | "reversed";
    /** Optional metadata we embedded when creating the transfer */
    metadata?: Record<string, string>;
  };
  /** ISO 8601 timestamp of the event */
  created_at: string;
}

/* ---------- Error Class ---------- */

/**
 * Structured error from the Column API.
 * Captures HTTP status, Column error code, and full response body
 * for forensic logging and operational alerting.
 */
export class ColumnApiError extends Error {
  public readonly httpStatus: number;
  public readonly columnErrorCode: string;
  public readonly responseBody: string;

  constructor(opts: {
    message: string;
    httpStatus: number;
    columnErrorCode: string;
    responseBody: string;
  }) {
    super(
      `COLUMN_API_ERROR [${opts.httpStatus}] ${opts.columnErrorCode}: ${opts.message}`,
    );
    this.name = "ColumnApiError";
    this.httpStatus = opts.httpStatus;
    this.columnErrorCode = opts.columnErrorCode;
    this.responseBody = opts.responseBody;
  }
}

/* ---------- Environment Key Names ---------- */

const ENV_API_KEY = "COLUMN_API_KEY";
const ENV_API_URL = "COLUMN_API_URL";
const DEFAULT_API_URL = "https://api.column.com";

/* ================================================================
   ColumnBankService Class
   ================================================================ */

export class ColumnBankService {
  readonly name = "Column Bank (Fedwire / Virtual Accounts)";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env[ENV_API_KEY] ?? "";
    this.baseUrl = (process.env[ENV_API_URL] ?? DEFAULT_API_URL).replace(
      /\/$/,
      "",
    );
  }

  /* ---------- Configuration Check ---------- */

  /**
   * Check if Column API credentials are present in the environment.
   * Must be true before any API calls are attempted.
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /* ---------- Internal HTTP Helper ---------- */

  /**
   * Execute an authenticated request against the Column API.
   * All Column endpoints use Bearer token auth and JSON bodies.
   *
   * @throws ColumnApiError on non-2xx responses
   */
  private async request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new ColumnApiError({
        message: `${ENV_API_KEY} is not configured. Cannot call Column API.`,
        httpStatus: 0,
        columnErrorCode: "CONFIGURATION_MISSING",
        responseBody: "",
      });
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    console.log(
      `[COLUMN] ${method} ${path}${body ? ` | payload_keys=${Object.keys(body).join(",")}` : ""}`,
    );

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorCode = "UNKNOWN";
      let errorMessage = responseText;
      try {
        const parsed = JSON.parse(responseText) as {
          error?: { code?: string; message?: string };
        };
        errorCode = parsed.error?.code ?? "UNKNOWN";
        errorMessage = parsed.error?.message ?? responseText;
      } catch {
        // Response body is not JSON — use raw text
      }

      console.error(
        `[COLUMN] API error: ${method} ${path} → ${response.status} ${errorCode}: ${errorMessage}`,
      );

      throw new ColumnApiError({
        message: errorMessage,
        httpStatus: response.status,
        columnErrorCode: errorCode,
        responseBody: responseText,
      });
    }

    const data = JSON.parse(responseText) as T;
    console.log(
      `[COLUMN] ${method} ${path} → ${response.status} OK`,
    );
    return data;
  }

  /* ================================================================
     createCounterparty — Register a corporate buyer with Column
     ================================================================
     Maps to: POST /counterparties
     Called during buyer onboarding before any settlement can begin.
     The returned counterparty ID is stored against the buyer entity
     and used as the parent for all virtual accounts.
     ================================================================ */

  async createCounterparty(
    entityDetails: ColumnCounterpartyInput,
  ): Promise<ColumnCounterparty> {
    console.log(
      `[COLUMN] Creating counterparty for entity: ${entityDetails.entityName} (${entityDetails.entityType})`,
    );

    const response = await this.request<{
      id: string;
      routing_number: string;
      account_number: string;
      entity_name: string;
      entity_type: string;
      status: string;
      created_at: string;
    }>("POST", "/counterparties", {
      entity_name: entityDetails.entityName,
      entity_type: entityDetails.entityType,
      ein: entityDetails.ein,
      address: {
        line_1: entityDetails.address.line1,
        line_2: entityDetails.address.line2 ?? null,
        city: entityDetails.address.city,
        state: entityDetails.address.state,
        postal_code: entityDetails.address.postalCode,
        country: entityDetails.address.country,
      },
      email: entityDetails.email,
      phone: entityDetails.phone ?? null,
    });

    const counterparty: ColumnCounterparty = {
      id: response.id,
      routingNumber: response.routing_number,
      accountNumber: response.account_number,
      entityName: response.entity_name,
      entityType: response.entity_type as ColumnCounterparty["entityType"],
      status: response.status as ColumnCounterparty["status"],
      createdAt: response.created_at,
    };

    console.log(
      `[COLUMN] Counterparty created: ${counterparty.id} (status=${counterparty.status})`,
    );

    return counterparty;
  }

  /* ================================================================
     createVirtualAccount — Generate a unique FBO routing/account pair
     ================================================================
     Maps to: POST /bank-accounts/virtual
     Each settlement gets its own virtual account so that inbound
     Fedwires are automatically routed and attributed to the correct
     trade. The virtual_account_id is stored in `escrow_holds.external_hold_id`
     (see 005_dvp_escrow.sql) for reconciliation.
     ================================================================ */

  async createVirtualAccount(
    counterpartyId: string,
    description?: string,
  ): Promise<ColumnVirtualAccount> {
    console.log(
      `[COLUMN] Creating virtual account for counterparty: ${counterpartyId}`,
    );

    const response = await this.request<{
      id: string;
      counterparty_id: string;
      routing_number: string;
      account_number: string;
      description: string;
      currency: string;
      status: string;
      created_at: string;
    }>("POST", "/bank-accounts/virtual", {
      counterparty_id: counterpartyId,
      description: description ?? `AurumShield Settlement FBO — ${counterpartyId}`,
      currency: "USD",
    });

    const virtualAccount: ColumnVirtualAccount = {
      id: response.id,
      counterpartyId: response.counterparty_id,
      routingNumber: response.routing_number,
      accountNumber: response.account_number,
      description: response.description,
      currency: response.currency as "USD",
      status: response.status as ColumnVirtualAccount["status"],
      createdAt: response.created_at,
    };

    console.log(
      `[COLUMN] Virtual account created: ${virtualAccount.id} ` +
        `(routing=${virtualAccount.routingNumber}, account=${virtualAccount.accountNumber})`,
    );

    return virtualAccount;
  }

  /* ================================================================
     initiateOutboundWire — Execute the final DvP Fedwire payout
     ================================================================
     Maps to: POST /transfers/wire
     This is the atomic settlement action: funds leave our FBO account
     and land in the seller's external account. In the state machine
     this corresponds to `DVP_EXECUTED → SETTLED`.

     The wire transfer ID is stored in:
       - `settlement_finality.external_transfer_id` (005_dvp_escrow.sql)
       - `payouts.external_id` (005_dvp_escrow.sql)
     for full reconciliation via Column webhooks.
     ================================================================ */

  async initiateOutboundWire(
    accountId: string,
    amount: number,
    destination: ColumnWireDestination,
    metadata?: Record<string, string>,
  ): Promise<ColumnWireTransfer> {
    if (amount <= 0) {
      throw new ColumnApiError({
        message: `Wire amount must be positive. Received: ${amount}`,
        httpStatus: 0,
        columnErrorCode: "INVALID_AMOUNT",
        responseBody: "",
      });
    }

    console.log(
      `[COLUMN] Initiating outbound wire: account=${accountId} amount=${amount} ` +
        `beneficiary=${destination.beneficiaryName}`,
    );

    const response = await this.request<{
      id: string;
      account_id: string;
      amount: number;
      currency: string;
      status: string;
      destination_routing_number: string;
      destination_account_number: string;
      beneficiary_name: string;
      reference_message: string;
      created_at: string;
    }>("POST", "/transfers/wire", {
      account_id: accountId,
      amount,
      currency: "USD",
      destination_routing_number: destination.routingNumber,
      destination_account_number: destination.accountNumber,
      beneficiary_name: destination.beneficiaryName,
      beneficiary_address: destination.beneficiaryAddress ?? null,
      reference_message: metadata?.settlementId
        ? `AURUMSHIELD-DVP-${metadata.settlementId}`
        : "AURUMSHIELD-DVP-SETTLEMENT",
      metadata: metadata ?? {},
    });

    const wireTransfer: ColumnWireTransfer = {
      id: response.id,
      accountId: response.account_id,
      amount: response.amount,
      currency: response.currency as "USD",
      status: response.status as ColumnWireTransfer["status"],
      destinationRoutingNumber: response.destination_routing_number,
      destinationAccountNumber: response.destination_account_number,
      beneficiaryName: response.beneficiary_name,
      referenceMessage: response.reference_message,
      createdAt: response.created_at,
    };

    console.log(
      `[COLUMN] Outbound wire initiated: ${wireTransfer.id} (status=${wireTransfer.status})`,
    );

    return wireTransfer;
  }
}

/* ---------- Singleton Export ---------- */

/** Pre-instantiated Column Bank service for convenience. */
export const columnBankService = new ColumnBankService();
