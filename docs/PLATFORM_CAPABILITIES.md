# AurumShield Platform

## Sovereign Clearing Infrastructure for Institutional Precious Metals

---

**Document Classification**: Confidential — Investor & Partner Distribution Only

**Version**: 1.3.0 · February 2026

**Prepared by**: AurumShield Engineering

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem: Systemic Risk in Physical Gold Markets](#2-the-problem-systemic-risk-in-physical-gold-markets)
3. [Platform Architecture](#3-platform-architecture)
4. [Core Clearing Engine](#4-core-clearing-engine)
5. [Capital Adequacy Framework](#5-capital-adequacy-framework)
6. [Policy & Risk Engine](#6-policy--risk-engine)
7. [Verification & Identity Perimeter](#7-verification--identity-perimeter)
8. [Marketplace Infrastructure](#8-marketplace-infrastructure)
9. [Certificate Engine & Settlement Finality](#9-certificate-engine--settlement-finality)
10. [Governance, Audit & Supervisory Architecture](#10-governance-audit--supervisory-architecture)
11. [Role-Based Access Control](#11-role-based-access-control)
12. [Security Architecture](#12-security-architecture)
13. [Technical Stack & Infrastructure](#13-technical-stack--infrastructure)
14. [Competitive Positioning](#14-competitive-positioning)
15. [Regulatory Alignment](#15-regulatory-alignment)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

AurumShield is a sovereign clearing platform purpose-built for the institutional physical gold market. It addresses the fundamental structural risk that has plagued precious metals trading for decades: **the absence of a central clearing mechanism for physical gold transactions**.

Today, institutional gold trades settle bilaterally — buyer and seller complete their respective obligations (payment and physical delivery) independently, often with significant temporal gaps. This creates **principal risk**: the possibility that one party delivers while the other defaults. In standardized financial markets, central clearing counterparties (CCPs) eliminated this risk decades ago. Physical gold markets have no equivalent infrastructure.

AurumShield fills this gap by providing:

- **Atomic Delivery-versus-Payment (DvP)**: Title and payment transfer simultaneously in a single deterministic operation — no settlement gap.
- **Continuous Capital Adequacy Monitoring**: Real-time exposure tracking with deterministic breach detection and automated enforcement.
- **Deterministic Policy Enforcement**: Transaction risk scoring, capital validation, and approval tiering that cannot be bypassed or discretionally overridden.
- **Cryptographic Settlement Finality**: SHA-256 signed clearing certificates proving settlement completion with immutable ledger integrity.
- **Institutional Verification Perimeter**: Multi-step KYC/KYB with sanctions screening, liveness checks, and beneficial ownership verification.
- **Three-Part Evidence Packing**: Assay reports, chain-of-custody certificates, and seller attestations required before any gold enters the marketplace.
- **Sovereign Audit Architecture**: Append-only ledger with full actor and role attribution, frozen capital snapshots, and regulator-ready case dossier generation.

The platform is fully operational and deployed in production at [aurumshield.vip](https://aurumshield.vip), running on AWS ECS Fargate with zero-downtime rolling deployments, HTTPS termination, and continuous health monitoring.

---

## 2. The Problem: Systemic Risk in Physical Gold Markets

### 2.1 The Settlement Gap

In traditional bilateral gold transactions, payment and delivery occur as separate events. The buyer wires funds; days later, the seller arranges physical delivery (or vault-to-vault title transfer). During this gap — which can last from hours to weeks — one party has performed while the other has not. This is **principal risk**, and it is the single largest unmitigated risk category in physical precious metals markets.

**Quantification**: The LBMA (London Bullion Market Association) clears approximately $30 billion in gold trades per day. At current settlement cycles (T+2 average), this implies roughly $60 billion in outstanding bilateral exposure at any given time with no central clearing mechanism.

### 2.2 Counterparty Opacity

Physical gold markets operate with limited standardized counterparty risk assessment. Due diligence is bespoke, inconsistent, and often incomplete. There is no equivalent to a credit rating agency's real-time monitoring. Counterparty defaults are discovered after the fact — when a delivery fails or a payment bounces.

### 2.3 Inventory Integrity

The provenance and integrity of physical gold inventory is verified through fragmented, disconnected processes. Assay reports, chain-of-custody documents, and ownership attestations are exchanged as unstructured PDFs or emails. There is no systematic gating mechanism that prevents unverified or under-documented gold from entering the trading pipeline.

### 2.4 Capital Blind Spots

Traditional dealers manage capital exposure through periodic (often end-of-day) reporting. Intraday exposure accumulation — through multiple concurrent reservations, orders, and open settlements — is monitored manually or not at all. Capital limit breaches are discovered retroactively, after the exposure has already been created.

### 2.5 Regulatory Evidence Gaps

When regulators examine gold trading operations, they encounter fragmented records across multiple systems — CRM systems, email threads, spreadsheets, and banking records. There is no unified, append-only audit trail that links a transaction from initial counterparty verification through market listing, reservation, order, settlement, and certificate issuance.

---

## 3. Platform Architecture

### 3.1 Design Principles

AurumShield is built on five non-negotiable architectural principles:

| Principle          | Implementation                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Determinism**    | Every computation — risk scores, capital snapshots, breach events, certificate hashes — produces the same output given the same inputs. No randomness. No timestamps from system clocks in computation logic (time is always passed as an explicit parameter). |
| **Immutability**   | All engine functions return new state objects; existing state is never mutated. Ledger entries are append-only. Once a policy snapshot is frozen, it cannot be altered.                                                                                        |
| **Idempotency**    | Every operation can be safely retried. Certificate issuance, breach event generation, and demo seeding all check for existing artifacts before creating new ones. Deterministic ID generation ensures that duplicate operations produce identical results.     |
| **Pure Functions** | All core engines (settlement, capital, policy, certificate, marketplace, verification) are implemented as pure functions with no side effects. State persistence is handled separately from computation.                                                       |
| **Zero Trust**     | Every action is gated by role-based access control. Every state transition is validated against preconditions. Every capital limit is enforced by the capital control system, not by operator discretion.                                                      |

### 3.2 Engine Architecture

The platform consists of seven pure deterministic engines, each responsible for a specific domain:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  Dashboard · Marketplace · Settlements · Capital · Audit    │
├─────────────────────────────────────────────────────────────┤
│                     API / HOOK LAYER                        │
│  TanStack Query (React) · Mock Endpoints · LocalStorage     │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│ SETTLEMENT  │  CAPITAL    │  POLICY     │  CERTIFICATE      │
│ ENGINE      │  ENGINE     │  ENGINE     │  ENGINE           │
│             │             │             │                   │
│ Open → Auth │ ECR · HU    │ TRI Score   │ SHA-256 Signing   │
│ → DvP       │ TVaR₉₉      │ Blockers    │ Certificate #     │
│ Ledger      │ Breach      │ Approval    │ Canonical Serial  │
│ Append-only │ Detection   │ Capital Val │ Idempotent Issue  │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ MARKETPLACE │ CAPITAL     │ VERIFY      │ BREACH            │
│ ENGINE      │ CONTROLS    │ ENGINE      │ MONITOR           │
│             │             │             │                   │
│ Listing     │ Mode Eval   │ KYC Steps   │ ECR Checks        │
│ Reservation │ Block Matrix│ KYB Steps   │ Hardstop Checks   │
│ Order       │ Override    │ Risk Tier   │ TVaR₉₉ Buffer     │
│ Publish Gate│ Enforcement │ Sanctions   │ Audit Emission    │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

---

## 4. Core Clearing Engine

### 4.1 Settlement Lifecycle

The settlement engine implements a **six-stage deterministic lifecycle** for every gold transaction:

```
ESCROW_OPEN → AWAITING_FUNDS → AWAITING_GOLD → AWAITING_VERIFICATION → READY_TO_SETTLE → AUTHORIZED → SETTLED
```

Each transition is governed by:

- **Action Role Map**: A deterministic mapping of which roles can perform which actions (e.g., only `admin` and `treasury` can confirm funds final; only `admin` can authorize and execute DvP).
- **Precondition Validation**: Before any action is applied, the engine validates that all required preconditions are met (e.g., funds confirmed + gold allocated + verification cleared before authorization is possible).
- **Append-Only Ledger**: Every state transition produces a ledger entry with a deterministic ID, timestamp, actor role, actor user ID, and full detail message.

### 4.2 Settlement Action Types

| Action                | Allowed Roles     | Effect                                                   | Ledger Entry            |
| --------------------- | ----------------- | -------------------------------------------------------- | ----------------------- |
| `CONFIRM_FUNDS_FINAL` | Admin, Treasury   | Marks fiat payment as received and confirmed             | `FUNDS_CONFIRMED_FINAL` |
| `ALLOCATE_GOLD`       | Admin, Vault Ops  | Marks physical gold as allocated from inventory          | `GOLD_ALLOCATED`        |
| `CLEAR_VERIFICATION`  | Admin, Compliance | Confirms counterparty identity verification              | `VERIFICATION_CLEARED`  |
| `AUTHORIZE`           | Admin             | Pre-execution authorization with frozen capital snapshot | `AUTHORIZED`            |
| `EXECUTE_DVP`         | Admin             | Atomic delivery-versus-payment execution                 | `DVP_EXECUTED`          |
| `CANCEL`              | Admin             | Settlement cancellation with reason                      | `SETTLEMENT_CANCELLED`  |

### 4.3 Atomic DvP Execution

The centerpiece of the clearing engine is the two-step DvP mechanism:

**Step 1 — Authorization**: The clearing authority reviews all preconditions and authorizes the settlement. At this moment, a complete capital snapshot is frozen into the authorization ledger entry, capturing ECR, hardstop utilization, capital base, and breach level at the exact moment of authorization.

**Step 2 — DvP Execution**: Title transfer and payment transfer occur simultaneously in a single atomic operation. The settlement status transitions directly from `AUTHORIZED` to `SETTLED`. There is no intermediate state where one party has delivered and the other has not.

This mechanism eliminates **principal risk** — the primary category of counterparty credit risk in physical gold settlement.

### 4.4 Settlement Requirements Advisory

The engine provides a real-time requirements advisory that surfaces the current readiness state for each settlement:

- **Blockers**: Actions that must be completed before the next transition is available.
- **Warnings**: Conditions that do not block progress but warrant attention (e.g., high corridor risk level).
- **Required Actions**: The specific actions required to advance the settlement.

This advisory is computed by a pure function (`computeSettlementRequirements`) and serves as presentation logic — it does not drive state transitions, which are governed exclusively by the action processor.

---

## 5. Capital Adequacy Framework

### 5.1 Intraday Capital Engine

AurumShield implements continuous intraday capital monitoring through a deterministic computation engine. The `computeIntradayCapitalSnapshot` function derives a complete capital snapshot from the current system state:

| Metric                            | Definition                                                                              | Significance                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Capital Base**                  | Total available capital for clearing operations.                                        | The denominator for all adequacy ratios.                                                 |
| **Gross Exposure Notional**       | Sum of all active reservations, pending orders, and open settlements by notional value. | The total bilateral exposure the platform is currently backstopping.                     |
| **Reserved Notional**             | Exposure from active reservations (pre-order).                                          | Represents committed but not yet converted exposure.                                     |
| **Allocated Notional**            | Exposure from confirmed orders.                                                         | Represents exposure that has progressed past the policy gate.                            |
| **Settlement Notional Open**      | Exposure from settlements in progress (ESCROW_OPEN through AUTHORIZED).                 | Represents exposure in the clearing pipeline.                                            |
| **Settled Notional Today**        | Notional value of settlements completed today.                                          | Throughput metric for daily clearing volume.                                             |
| **ECR (Exposure Coverage Ratio)** | Gross Exposure ÷ Capital Base. Expressed as a multiple (e.g., 0.42x).                   | The primary adequacy indicator. Lower is better. Target ECR is configurable.             |
| **Hardstop Utilization**          | Gross Exposure ÷ Hardstop Limit. Expressed as a percentage.                             | Absolute ceiling utilization. Approaching 95% triggers critical breach.                  |
| **Buffer vs TVaR₉₉**              | Capital Base − (Gross Exposure × (1 + TVaR addon factor)).                              | Stress buffer against 99th percentile tail risk. Negative indicates insufficient buffer. |
| **Breach Level**                  | NONE / CAUTION / BREACH. Computed deterministically from ECR and HU thresholds.         | Current risk posture classification.                                                     |
| **Breach Reasons**                | Human-readable explanation of why the current breach level was set.                     | Governance transparency — no black boxes.                                                |
| **Top Drivers**                   | Ranked list of individual exposures contributing to gross exposure, by notional value.  | Identifies concentration risk and the largest individual exposures.                      |

### 5.2 Breach Monitor

The breach monitor (`evaluateBreachEvents`) is a deterministic, idempotent event generator that evaluates the capital snapshot and produces governance alerts:

| Breach Type        | Trigger Condition                        | Severity |
| ------------------ | ---------------------------------------- | -------- |
| `ECR_CAUTION`      | ECR ≥ Target ECR                         | WARN     |
| `ECR_BREACH`       | ECR ≥ Target ECR × 1.2 (20% over target) | CRITICAL |
| `HARDSTOP_CAUTION` | Hardstop Utilization ≥ 80%               | WARN     |
| `HARDSTOP_BREACH`  | Hardstop Utilization ≥ 95%               | CRITICAL |
| `BUFFER_NEGATIVE`  | TVaR₉₉ Buffer < $0                       | WARN     |

Each breach event receives a **deterministic ID** derived from the breach type, minute bucket, breach level, and key metric values (FNV-1a hash). This ensures that the same breach condition in the same minute always produces the same ID, enabling idempotent deduplication — the same event is never recorded twice.

Every breach event is automatically cross-posted to the audit log with full metadata (hardstop utilization, ECR, top driver IDs).

### 5.3 Capital Controls Enforcement

The capital controls engine (`evaluateCapitalControls`) translates the capital snapshot and breach history into an enforceable control decision with five escalation modes:

| Mode                    | Severity Level | Enforcement                                                                                                             |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NORMAL`                | 0              | All operations permitted. No restrictions.                                                                              |
| `THROTTLE_RESERVATIONS` | 1              | New reservations limited by maximum notional and weight constraints. Existing orders proceed.                           |
| `FREEZE_CONVERSIONS`    | 2              | Reservation-to-order conversions blocked. Existing orders and settlements continue to completion.                       |
| `FREEZE_MARKETPLACE`    | 3              | All new marketplace activity blocked — no new listings, reservations, or orders. Existing settlements can be completed. |
| `EMERGENCY_HALT`        | 4              | All operations suspended, including DvP execution. Manual override required to resume.                                  |

**Block Matrix**: Each mode produces a deterministic block matrix specifying exactly which of five gated actions (CREATE_RESERVATION, CONVERT_RESERVATION, PUBLISH_LISTING, OPEN_SETTLEMENT, EXECUTE_DVP) are blocked. This block matrix is enforced at the API level — it cannot be bypassed from the UI.

**Override Governance**: Overrides are permitted for `THROTTLE_RESERVATIONS` and `FREEZE_CONVERSIONS` modes only. Each override requires:

- A documented reason.
- Actor identity (role + user ID).
- The FNV-1a snapshot hash of the capital state at the time of override (ensuring the override was made against the correct state, not stale data).
- Automatic audit trail emission on both grant and expiry.

Overrides have a maximum TTL and automatically expire. `FREEZE_MARKETPLACE` and `EMERGENCY_HALT` modes cannot be overridden — they require the underlying capital condition to be resolved.

---

## 6. Policy & Risk Engine

### 6.1 Transaction Risk Index (TRI)

The TRI is a weighted composite score that quantifies the risk profile of any individual transaction. It is computed deterministically from four components:

| Component                | Weight | Inputs                                                                         | Scoring                                                        |
| ------------------------ | ------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Counterparty Risk**    | 40%    | Counterparty risk level (low/medium/high/critical)                             | Mapped to numerical score: low=0, medium=3, high=6, critical=9 |
| **Corridor Risk**        | 25%    | Corridor risk classification                                                   | Mapped to numerical score by risk level                        |
| **Amount Concentration** | 20%    | Transaction notional ÷ capital base                                            | Higher concentration = higher risk                             |
| **Counterparty Status**  | 15%    | Counterparty operational status (active/pending/under-review/closed/suspended) | Inactive or suspended counterparties score higher              |

The weighted sum produces a composite TRI score classified into three bands:

| Band      | TRI Range  | Implication                             |
| --------- | ---------- | --------------------------------------- |
| **Green** | 0 – 3.0    | Low risk. Auto-approval eligible.       |
| **Amber** | 3.0 – 6.0  | Moderate risk. Senior review required.  |
| **Red**   | 6.0 – 10.0 | High risk. Committee approval required. |

**Formula Transparency**: The TRI computation exposes its full formula as a human-readable string (e.g., `TRI = 0.40 × 0 + 0.25 × 3 + 0.20 × 1.5 + 0.15 × 0 = 1.05`), enabling auditors to independently verify the score.

### 6.2 Capital Validation

Every transaction is validated against the current capital position before it can proceed:

- **Current ECR**: Current exposure coverage ratio before the transaction.
- **Post-Transaction ECR**: ECR after adding the transaction's notional value to gross exposure.
- **Current Hardstop Utilization**: Current percentage of the capital limit consumed.
- **Post-Transaction Hardstop Utilization**: Utilization after the transaction.
- **Hardstop Remaining**: Dollar value remaining below the hardstop limit after the transaction.

### 6.3 Policy Blockers

Blockers are generated with three severity levels:

| Severity  | Effect                                      | Examples                                                                       |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| **BLOCK** | Transaction cannot proceed. Hard stop.      | Hardstop breach, suspended corridor, suspended counterparty, KYC not verified. |
| **WARN**  | Transaction can proceed with senior review. | ECR above target, high corridor risk, large concentration.                     |
| **INFO**  | Advisory information. No action required.   | Approaching concentration threshold, counterparty pending review.              |

### 6.4 Approval Tiers

The approval tier is determined by the TRI score and transaction amount:

| Tier              | Condition                                 | Operational Meaning             |
| ----------------- | ----------------------------------------- | ------------------------------- |
| **AUTO**          | TRI < 3.0 and amount < $100K              | No manual approval required.    |
| **SENIOR_REVIEW** | TRI between 3.0–6.0 or amount $100K–$500K | Senior desk head must sign off. |
| **COMMITTEE**     | TRI > 6.0 or amount > $500K               | Risk committee review required. |

### 6.5 PolicySnapshot — Immutable Record

At the moment a reservation is converted to an order, a `MarketplacePolicySnapshot` is frozen and permanently attached to the order:

- TRI score and band
- ECR before and after
- Hardstop utilization before and after
- Approval tier
- All active blockers at conversion time
- Exact timestamp

This snapshot can never be modified and serves as the authoritative record of the risk conditions under which the order was approved. It can be retrieved for any order at any time for audit or regulatory inquiry.

### 6.6 Compliance Checks

A full compliance checklist is run at order conversion:

| Check                 | What it validates                                                  |
| --------------------- | ------------------------------------------------------------------ |
| Counterparty Verified | Counterparty's verification status is "active"                     |
| Corridor Open         | Settlement corridor is not suspended or closed                     |
| Hub Operational       | Hub processing capacity is available                               |
| ECR Tolerance         | Post-transaction ECR within acceptable limits                      |
| Hardstop Tolerance    | Post-transaction hardstop utilization within limits                |
| Concentration Check   | Transaction does not create unacceptable single-name concentration |

---

## 7. Verification & Identity Perimeter

### 7.1 Architecture

The verification engine implements a mandatory identity perimeter. No counterparty can participate in the marketplace without completing the appropriate verification track. The system supports two tracks:

**KYC (Know Your Customer)** — for individuals:

1. **Email & Phone Confirmation** — verified contact information.
2. **Government ID Capture** — passport, driver's license, or national ID card.
3. **Liveness Check** — biometric verification that the person submitting documents is the person in the ID.
4. **Sanctions & PEP Screening** — automated screening against international sanctions lists and politically exposed persons databases.

**KYB (Know Your Business)** — for company entities:

1. **Company Registration Documents** — certificate of incorporation, articles of association.
2. **Ultimate Beneficial Owner (UBO) Declaration** — disclosure of all individuals with 25%+ ownership.
3. **Proof of Registered Address** — recent utility bill or bank statement.
4. **Source of Funds Declaration** — documented origin of trading capital.

### 7.2 Deterministic Outcomes

Each verification step produces a deterministic outcome based on the entity's identifiers. This enables consistent, repeatable behavior:

- **Sanctions & PEP**: Outcome derived from the organization ID — specific IDs deterministically produce PASS, WARN, or FAIL results.
- **Liveness Check**: Outcome derived from the user ID.
- **UBO Declaration**: Company entities must declare at least one UBO; individuals are exempt.

### 7.3 Risk Tier Computation

The verification case computes an aggregate risk tier from all completed steps:

| Tier         | Condition                 | Impact                                    |
| ------------ | ------------------------- | ----------------------------------------- |
| **LOW**      | All steps passed          | No additional restrictions                |
| **ELEVATED** | One or more steps in WARN | Enhanced monitoring, may affect TRI score |
| **HIGH**     | One or more steps FAILED  | May trigger a BLOCK-level policy blocker  |

### 7.4 Evidence Architecture

Every verification step produces an evidence stub — a structured attestation document with:

- Deterministic document ID
- Step ID, user ID, and creation timestamp
- Document title and type classification
- Source classifier (SYSTEM_GENERATED)

Evidence items are persisted in a separate evidence store and can be retrieved by step ID or user ID for audit purposes.

---

## 8. Marketplace Infrastructure

### 8.1 Sell-Side Controls

The marketplace implements a full sell-side pipeline with three stages:

**Stage 1 — Draft Listing**: Sellers create a draft listing with:

- Asset details: form (bar/coin), purity (.995/.999/.9999), total weight in troy ounces, price per ounce.
- Custody details: vault hub, vault name, jurisdiction.
- Seller identity: user ID, org ID, org name.

**Stage 2 — Evidence Packing**: Before publishing, the seller must attach a three-part evidence pack:

| Evidence Type                      | Purpose                                                                                                                                                       | Mandatory   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Certified Assay Report**         | Laboratory analysis confirming purity and composition of the gold. Typically issued by an accredited refinery or independent assay laboratory.                | ✅ Required |
| **Chain of Custody Certificate**   | Documented provenance from mine/refinery to the current vault. Establishes an unbroken chain of title and physical possession.                                | ✅ Required |
| **Seller Attestation Declaration** | Signed declaration by the seller confirming legal ownership, authority to sell, absence of liens or encumbrances, and compliance with applicable regulations. | ✅ Required |

Each evidence item is recorded with a deterministic ID, timestamp, and uploader identity.

**Stage 3 — Publish Gate**: A deterministic gate function evaluates three conditions before allowing publication:

1. **Seller Verified**: The seller's KYC/KYB verification case must be approved.
2. **Evidence Complete**: All three evidence types must be present.
3. **Capital Controls**: Publishing must not be blocked by the current capital control mode.

If any condition fails, the gate returns the specific blockers preventing publication. The listing remains in draft status until all conditions are met.

### 8.2 Reservation System

Reservations implement a bilateral exposure lock:

- **Time-To-Live**: Reservations expire after 10 minutes if not converted to an order.
- **Weight Allocation**: The reserved weight is deducted from available inventory immediately, preventing double-booking.
- **Expiry Processing**: The `expireReservations` function runs deterministically, checking all reservations with `ACTIVE` status against the current time. Expired reservations have their weight returned to the inventory pool.

### 8.3 Order Conversion

Conversion from reservation to order is the critical policy enforcement point:

1. **TRI Computation**: Transaction Risk Index calculated against the counterparty, corridor, amount, and capital.
2. **Capital Validation**: Post-transaction ECR and hardstop utilization computed.
3. **Blocker Evaluation**: All policy blockers checked. If any BLOCK-level blocker exists, conversion is denied.
4. **Approval Tier Determination**: AUTO, SENIOR_REVIEW, or COMMITTEE.
5. **Marketplace Policy Snapshot**: All risk parameters frozen into the order record.
6. **State Transition**: Reservation moves to CONVERTED; order is created.

---

## 9. Certificate Engine & Settlement Finality

### 9.1 Clearing Certificate Issuance

When a settlement reaches `SETTLED` status via DvP execution, the certificate engine automatically issues a **Gold Clearing Certificate** — the authoritative proof of settlement finality.

**Preconditions** (enforced programmatically):

- Settlement status must be `SETTLED`.
- A DVP_EXECUTED ledger entry must exist.

**Idempotency**: If a certificate already exists for a given settlement ID, the existing certificate is returned unchanged. The system cannot produce duplicate certificates for the same settlement.

### 9.2 Certificate Contents

| Field                         | Description                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Certificate Number**        | Format: `AS-GC-YYYYMMDD-<8HEX>-<4SEQ>`. The hex portion is derived from SHA-256 of (settlementId + orderId + dvpLedgerEntryId + date). The sequence number is derived from FNV-1a of (settlementId + date). |
| **Issuance Timestamp**        | UTC timestamp of certificate generation.                                                                                                                                                                    |
| **Settlement & Order IDs**    | Cross-references to the underlying settlement case and market order.                                                                                                                                        |
| **Counterparties**            | Buyer and seller organization IDs, names, LEI identifiers, and jurisdictions.                                                                                                                               |
| **Asset Details**             | Form (bar/coin), purity, weight in troy ounces, vault location.                                                                                                                                             |
| **Economics**                 | Price per oz locked at order time, total notional, clearing fee (0.15% of notional), custody fee (0.05% of notional), total fees.                                                                           |
| **Settlement Rail**           | WIRE or RTGS, depending on corridor risk level.                                                                                                                                                             |
| **Settlement Infrastructure** | Corridor ID, settlement hub ID, vault hub ID.                                                                                                                                                               |
| **DvP Ledger Entry ID**       | Reference to the specific ledger entry recording the DvP execution.                                                                                                                                         |
| **Signature Hash**            | SHA-256 hash of the canonically serialized certificate payload.                                                                                                                                             |

### 9.3 Cryptographic Signature

The signature hash provides cryptographic proof of certificate integrity:

1. **Canonical Serialization**: A deterministic serialization function converts all certificate fields into a stable string representation. This uses a well-defined key order (not JSON.stringify, which is not guaranteed to be stable across implementations).

2. **SHA-256 Hashing**: The canonical payload is hashed using SHA-256 via the Web Crypto API (browser) or Node.js `crypto.createHash` (server). If neither is available, a deterministic fallback hash is used.

3. **Verification**: Any party holding the certificate can independently verify the signature by re-serializing the certificate payload in canonical order and computing the SHA-256 hash. If the computed hash matches the signature hash on the certificate, the certificate has not been altered.

### 9.4 Fee Structure

| Fee Type     | Rate      | Basis                           |
| ------------ | --------- | ------------------------------- |
| Clearing Fee | 0.15%     | Applied to total notional value |
| Custody Fee  | 0.05%     | Applied to total notional value |
| **Total**    | **0.20%** | All-in cost of settlement       |

---

## 10. Governance, Audit & Supervisory Architecture

### 10.1 Append-Only Audit Trail

Every significant system action generates an audit event with:

| Field         | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| Occurred At   | UTC timestamp                                                                              |
| Actor Role    | System role of the actor (buyer, seller, admin, compliance, treasury, vault_ops, system)   |
| Actor User ID | Unique identifier of the human operator (null for system-generated events)                 |
| Action        | Canonical action type (e.g., SETTLEMENT_ACTION, CAPITAL_BREACH_DETECTED, OVERRIDE_GRANTED) |
| Resource Type | The type of resource affected (SETTLEMENT, CAPITAL, OVERRIDE, etc.)                        |
| Resource ID   | Unique identifier of the affected resource                                                 |
| IP Address    | Client IP address (when available)                                                         |
| User Agent    | Browser identification (when available)                                                    |
| Result        | SUCCESS or FAILURE                                                                         |
| Severity      | info, warning, critical                                                                    |
| Message       | Human-readable description of the event                                                    |
| Metadata      | Structured key-value pairs with action-specific context                                    |

The audit trail is append-only — entries cannot be modified or deleted after creation.

### 10.2 Supervisory Console

The supervisory console presents settlement cases as **case dossiers** for regulatory examination. Each dossier includes:

- Complete settlement details (counterparties, asset, economics, rail, corridor).
- Full ledger history with every action, actor, and timestamp.
- Capital snapshot frozen at authorization time.
- All policy snapshots from the original order conversion.
- Cross-references to verification cases for both counterparties.

This format is designed for regulator-ready evidence packages — a compliance officer or external examiner can review the complete governance trail for any settlement without accessing multiple systems.

### 10.3 Breach Event Governance

Capital breach events are treated as governance artifacts with full lifecycle tracking:

1. **Detection**: Deterministic thresholds trigger events.
2. **Classification**: Events are assigned a severity (INFO, WARN, CRITICAL).
3. **Audit Emission**: Every breach event is cross-posted to the audit log with full metadata.
4. **Deduplication**: Deterministic IDs ensure the same breach condition in the same minute is never recorded twice.
5. **Control Response**: The capital controls engine translates breach events into enforcement actions.

---

## 11. Role-Based Access Control

AurumShield implements fine-grained role-based access control across six institutional roles:

| Role                           | Scope                                                 | Key Permissions                                                                                                            |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Buyer**                      | Acquisition desk operations. Institutional purchaser. | View marketplace, create reservations, place orders, view own settlements (read-only).                                     |
| **Seller**                     | Supply-side custody operations. Gold provider.        | Create draft listings, attach evidence, publish listings, view own settlements (read-only).                                |
| **Admin (Clearing Authority)** | Full clearing and operational authority.              | All settlement actions (confirm, allocate, authorize, DvP, cancel). Full access to all consoles. Override grant authority. |
| **Compliance**                 | Regulatory oversight and verification authority.      | Clear verification, view audit console, supervisory mode access. Cannot execute financial actions.                         |
| **Treasury**                   | Capital management and funds confirmation.            | Confirm funds final, view intraday capital, view capital controls. Cannot authorize settlements or execute DvP.            |
| **Vault Ops**                  | Physical custody operations.                          | Allocate gold, view intraday capital. Cannot perform any other settlement actions.                                         |

**Sidebar Visibility**: The navigation sidebar dynamically shows only the sections accessible to the current role. Buyers do not see Capital or Governance sections. Sellers do not see Capital, Governance, or Trading sections (except their own listings). This is enforced at both the UI and API level.

**Action-Level Enforcement**: Each settlement action type has a deterministic role map. The settlement engine rejects actions from unauthorized roles with a structured `FORBIDDEN_ROLE` error that includes the list of allowed roles.

---

## 12. Security Architecture

### 12.1 Settlement Security

| Control                      | Implementation                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No Settlement Gap**        | Atomic DvP execution eliminates the window where one party has performed while the other has not.                                                   |
| **Precondition Enforcement** | Every settlement action validates against a set of programmatic preconditions. Actions cannot be applied out of sequence.                           |
| **Role-Gated Actions**       | Each action type maps to specific authorized roles. The role map is defined in the settlement engine source code and cannot be modified at runtime. |
| **Duplicate Prevention**     | Opening a settlement for an order that already has a settlement is rejected at the engine level with a `SETTLEMENT_PRECONDITION` error.             |
| **Frozen Capital Snapshots** | Authorization freezes the capital state into the ledger entry. The capital conditions at the moment of authorization are permanently recorded.      |

### 12.2 Capital Security

| Control                      | Implementation                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Continuous Monitoring**    | Capital position is recomputed from current state on every access — not cached or periodically updated.                                                                     |
| **Automated Enforcement**    | Capital controls are evaluated deterministically. Human operators cannot override FREEZE_MARKETPLACE or EMERGENCY_HALT modes.                                               |
| **Override Governance**      | Overrides are limited to lower-severity modes, require documented justification, and automatically expire. Override grants and expirations are recorded in the audit trail. |
| **Snapshot Hash Validation** | Overrides are issued against a specific FNV-1a hash of the capital snapshot. If the capital state changes, the override hash becomes invalid.                               |

### 12.3 Identity Security

| Control                    | Implementation                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Mandatory Verification** | No counterparty can trade without completing KYC (individuals) or KYB (companies).                               |
| **Sanctions Screening**    | Automated screening against sanctions lists and PEP databases at onboarding.                                     |
| **Liveness Verification**  | Biometric liveness check confirms the person submitting identity documents is the actual document holder.        |
| **UBO Disclosure**         | Company entities must declare all ultimate beneficial owners with 25%+ ownership.                                |
| **Inventory Integrity**    | Three-part evidence packing (assay, chain-of-custody, attestation) required before any listing can be published. |

### 12.4 Certificate Security

| Control                     | Implementation                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **SHA-256 Signature**       | Every certificate is signed with a SHA-256 hash of its canonically serialized payload.                                                  |
| **Canonical Serialization** | Deterministic field ordering ensures the same certificate always produces the same hash, regardless of JSON serialization order.        |
| **Idempotent Issuance**     | Duplicate certificate issuance for the same settlement returns the existing certificate unchanged.                                      |
| **Deterministic Numbering** | Certificate numbers are derived from settlement parameters through SHA-256 and FNV-1a hashing. They cannot be predicted or manipulated. |

### 12.5 Audit Security

| Control                    | Implementation                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Append-Only Ledger**     | Ledger entries and audit events cannot be modified or deleted after creation.                                                                        |
| **Full Actor Attribution** | Every action records the actor's role, user ID, IP address, and user agent. System-generated events are explicitly attributed to the `system` actor. |
| **Breach Cross-Posting**   | Capital breach events are automatically recorded in both the breach store and the general audit log.                                                 |
| **Deterministic IDs**      | Audit event IDs are generated deterministically, preventing injection of fabricated events.                                                          |

### 12.6 Infrastructure Security

| Control                   | Implementation                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **HTTPS Only**            | All traffic encrypted via TLS. HTTP requests are redirected to HTTPS at the ALB level.           |
| **Private Subnets**       | Database (RDS PostgreSQL) runs in private subnets with no public internet access.                |
| **OIDC Authentication**   | CI/CD pipeline authenticates to AWS via OIDC — no static access keys stored anywhere.            |
| **Container Isolation**   | Application runs in AWS ECS Fargate containers with no SSH access to underlying hosts.           |
| **Health Monitoring**     | Continuous health checks via ALB target groups. Unhealthy containers are automatically replaced. |
| **Zero-Downtime Deploys** | Rolling updates ensure at least one healthy container is serving traffic during deployments.     |

---

## 13. Technical Stack & Infrastructure

### 13.1 Application Stack

| Layer                | Technology                                                                         |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Framework**        | Next.js 16 (React, TypeScript, App Router)                                         |
| **State Management** | TanStack Query (React Query) for async data, React Context for auth and demo state |
| **Validation**       | Zod schema validation on all forms                                                 |
| **Styling**          | Custom CSS design system with CSS custom properties, dark theme, HSL color palette |
| **Typography**       | Inter (primary), JetBrains Mono (monospace/financial figures)                      |
| **Icons**            | Lucide React                                                                       |

### 13.2 Infrastructure

| Component              | Technology                                                   |
| ---------------------- | ------------------------------------------------------------ |
| **Compute**            | AWS ECS Fargate (2 tasks, auto-scaling ready)                |
| **Container Registry** | AWS ECR                                                      |
| **Load Balancer**      | AWS ALB with HTTPS termination (ACM certificate)             |
| **Database**           | AWS RDS PostgreSQL 15 (private subnets)                      |
| **DNS**                | AWS Route 53                                                 |
| **Domain**             | aurumshield.vip (GoDaddy registration, Route 53 nameservers) |
| **CI/CD**              | GitHub Actions with OIDC authentication                      |
| **IaC**                | Terraform                                                    |
| **Monitoring**         | CloudWatch Logs, ALB health checks                           |

### 13.3 Deployment

- **Trigger**: Git tag push (`v*` format) triggers the CI/CD pipeline.
- **Build**: Docker multi-stage build in GitHub Actions (Ubuntu runner).
- **Deploy**: ECR push → ECS rolling update → ALB health check → traffic shift.
- **Rollback**: Previous task definition is retained. Force new deployment with previous image tag.
- **Cadence**: Zero-downtime rolling deployments, typically 3-5 minutes from tag push to healthy targets.

---

## 14. Competitive Positioning

### 14.1 Market Gap

| Existing Solutions         | Limitation                                                                            | AurumShield Advantage                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **LBMA clearing**          | Bilateral, no atomic DvP, no continuous capital monitoring                            | Atomic DvP, continuous intraday capital, deterministic policy enforcement                        |
| **CME gold futures**       | Paper claims, no physical delivery infrastructure, no provenance verification         | Physical gold with three-part evidence packing, vault-level custody tracking                     |
| **OTC gold dealers**       | Manual risk management, periodic reporting, no standardized clearing                  | Automated risk scoring (TRI), real-time capital adequacy, institutional verification             |
| **Blockchain gold tokens** | Custody questions, regulatory uncertainty, no institutional counterparty verification | Sovereign clearing with KYC/KYB, LEI-identified counterparties, and regulator-ready audit trails |

### 14.2 Unique Value Propositions

1. **First sovereign clearing platform for physical gold**: Purpose-built infrastructure — not a general-purpose exchange adapted for gold.
2. **Deterministic, auditable behavior**: Every computation can be independently verified. No black boxes, no probabilistic models, no hidden logic.
3. **Complete governance trail**: From counterparty verification through market listing, reservation, order, settlement, and certificate issuance — every step is recorded with full actor attribution.
4. **Institutional-grade security**: Role-based access control, cryptographic certificates, automated capital enforcement, and append-only audit trails.
5. **Regulatory readiness**: Supervisory console and case dossier format designed for examiner access from day one.

---

## 15. Regulatory Alignment

AurumShield's architecture is designed to align with the following regulatory frameworks:

| Framework                                                  | Alignment                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **PFMI (Principles for Financial Market Infrastructures)** | Continuous capital monitoring, deterministic settlement finality, breach event governance.                 |
| **LBMA Good Delivery Standards**                           | Three-part evidence packing (assay, chain-of-custody, attestation) enforces provenance documentation.      |
| **EU AMLD / BSA AML**                                      | Multi-step KYC/KYB with sanctions screening, PEP checks, UBO disclosure, and source of funds verification. |
| **Basel III Capital Adequacy**                             | Intraday capital computation with ECR, hardstop limits, and TVaR₉₉ stress buffer.                          |
| **MiFID II / Reg NMS**                                     | Full transaction audit trail, pre-trade risk checks, post-trade reporting capability.                      |
| **SOC 2 Type II**                                          | Append-only audit log, role-based access, deterministic behavior, infrastructure security controls.        |

---

## 16. Appendices

### A. Settlement Status Reference

| Status                  | Description                                                            | Required For Transition                                  |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `ESCROW_OPEN`           | Settlement created, escrow account opened.                             | Order exists, no duplicate settlement.                   |
| `AWAITING_FUNDS`        | Waiting for buyer's fiat payment confirmation.                         | Funds confirmation from Treasury.                        |
| `AWAITING_GOLD`         | Waiting for physical gold allocation by vault.                         | Gold allocation from Vault Ops.                          |
| `AWAITING_VERIFICATION` | Waiting for counterparty identity verification clearance.              | Verification clearance from Compliance.                  |
| `READY_TO_SETTLE`       | All prerequisites met. Waiting for authorization.                      | Funds confirmed + Gold allocated + Verification cleared. |
| `AUTHORIZED`            | Clearing authority has authorized settlement. Capital snapshot frozen. | Authorization from Admin.                                |
| `SETTLED`               | DvP executed. Settlement is final and irrevocable.                     | DvP execution from Admin.                                |
| `CANCELLED`             | Settlement cancelled with documented reason.                           | Cancellation from Admin.                                 |

### B. Deterministic Hash Functions

| Function                     | Purpose                                      | Algorithm                             |
| ---------------------------- | -------------------------------------------- | ------------------------------------- |
| `sha256Hex`                  | Certificate signature hash                   | SHA-256 (WebCrypto or Node.js crypto) |
| `fnv1a` (Capital Controls)   | Snapshot fingerprint for override validation | FNV-1a (32-bit)                       |
| `fnv1a` (Certificate Engine) | Certificate sequence number generation       | FNV-1a (32-bit)                       |
| `deriveBreachId`             | Deterministic breach event IDs               | FNV-1a (32-bit)                       |

### C. Data Model Summary

| Engine           | Primary Entity            | Key Fields                                                                                              |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Settlement       | `SettlementCase`          | id, orderId, status, weightOz, pricePerOzLocked, notionalUsd, rail, capitalAtOpen, ecrAtOpen            |
| Settlement       | `LedgerEntry`             | id, settlementId, type, timestamp, actor, actorRole, actorUserId, detail, snapshot                      |
| Marketplace      | `Listing`                 | id, form, purity, totalWeightOz, pricePerOz, vaultHubId, status                                         |
| Marketplace      | `Reservation`             | id, listingId, buyerUserId, weightOz, state, expiresAt                                                  |
| Marketplace      | `Order`                   | id, listingId, reservationId, buyerUserId, sellerUserId, weightOz, pricePerOz, notional, policySnapshot |
| Capital          | `IntradayCapitalSnapshot` | capitalBase, grossExposureNotional, ecr, hardstopUtilization, breachLevel, topDrivers                   |
| Capital Controls | `CapitalControlDecision`  | mode, blocks, limits, snapshotHash, reasons                                                             |
| Certificate      | `ClearingCertificate`     | certificateNumber, signatureHash, asset, economics, counterparties                                      |
| Verification     | `VerificationCase`        | userId, track, steps, status, riskTier                                                                  |
| Breach           | `BreachEvent`             | id, type, level, message, snapshot                                                                      |

### D. API Reference Count

| Category                | Endpoints                                                      |
| ----------------------- | -------------------------------------------------------------- |
| Marketplace (Buy-side)  | 8 endpoints (listings, reservations, orders, search)           |
| Marketplace (Sell-side) | 6 endpoints (draft, update, evidence, publish gate, publish)   |
| Settlements             | 5 endpoints (list, detail, open, action, requirements)         |
| Capital                 | 4 endpoints (intraday snapshot, controls, breaches, overrides) |
| Verification            | 4 endpoints (init, submit step, get case, get evidence)        |
| Certificates            | 3 endpoints (by settlement, by number, list all)               |
| Audit                   | 2 endpoints (list events, detail)                              |
| Infrastructure          | 1 endpoint (health check)                                      |
| **Total**               | **33 API endpoints**                                           |

---

_AurumShield — Sovereign Clearing Infrastructure for Institutional Precious Metals_

_© 2026 AurumShield. All rights reserved._
