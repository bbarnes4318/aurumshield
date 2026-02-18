# AurumShield — Institutional Demo Walkthrough

> **Audience**: Investor, partner, or executive being presented a guided demonstration of the AurumShield sovereign clearing platform.
>
> **Live URL**: [https://aurumshield.vip](https://aurumshield.vip)
>
> **Duration**: 20–30 minutes for a full walkthrough; individual sections can be shown independently.

---

## Prerequisites

- A modern web browser (Chrome, Edge, Safari, or Firefox — latest version).
- Internet connection to [https://aurumshield.vip](https://aurumshield.vip).
- No login credentials are needed — the demo uses one-click role selection.

---

## 1. Entering Demo Mode

### Step 1.1 — Navigate to the demo login

Open your browser and go to:

```
https://aurumshield.vip/demo/login?demo=true
```

> **Important**: The `?demo=true` URL parameter must be present. Without it, the demo environment will not activate.

You will see the **Institutional Demonstration Mode** screen with the AurumShield logo and five role cards.

### Step 1.2 — Select the "Clearing Authority" role

Click the **Clearing Authority** card (labeled "Ad" on the left). This role has full visibility across every system function — marketplace, settlements, capital, governance, and supervisory controls.

> **Tip**: You can also demonstrate from the Buyer, Seller, Compliance, or Treasury role. Each role sees a different subset of the platform. For a comprehensive walkthrough, start with Clearing Authority.

The system will:

1. Create demo user accounts (if not already present).
2. Seed a deterministic demo scenario — a gold listing, a reservation, an order, an open settlement case, and all associated ledger entries.
3. Redirect you to the **Dashboard** at `/dashboard?demo=true`.

**What you'll see at the top of every page**: A gold banner reading _"AurumShield — Institutional Demonstration Environment"_ confirming demo mode is active.

---

## 2. Dashboard Overview

**URL**: `/dashboard?demo=true`

The dashboard is the command-and-control surface for the clearing authority. Point out the following to your audience:

| Section              | What to show                                   | Talking point                                                                                          |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Capital Summary**  | Capital base, gross exposure, ECR ratio        | "All capital metrics are derived in real time from actual settlement state — not static mock numbers." |
| **Settlement Queue** | Active settlement cases with status indicators | "Every settlement in the pipeline is tracked with deterministic status transitions."                   |
| **Breach Card**      | Current breach level (NONE / CAUTION / BREACH) | "Breach events are generated deterministically when capital thresholds are exceeded."                  |

---

## 3. Marketplace & Reservation Flow

### Step 3.1 — View the marketplace

Navigate to **Marketplace** in the sidebar (or click "Launch" on the Marketplace section of the Guided Walkthrough page).

**URL**: `/marketplace?demo=true`

You will see published gold listings with details:

- **Form**: Bar or Coin
- **Purity**: .995, .999, or .9999
- **Weight**: Total available ounces
- **Price per oz**: Locked at listing time
- **Vault location**: The custody hub holding the physical gold

### Step 3.2 — Create a reservation

1. Click on any published listing to view its details.
2. Click **Reserve** to initiate a reservation.
3. Enter a weight in ounces (e.g., `10`).
4. The system will run a pre-trade policy check:
   - **TRI Score** (Transaction Risk Index) — weighted composite of counterparty risk, corridor risk, amount concentration, and counterparty status.
   - **ECR Impact** — Exposure Coverage Ratio before and after the transaction.
   - **Hardstop Utilization** — what percentage of the capital limit this reservation would consume.
   - **Approval Tier** — AUTO, SENIOR_REVIEW, or COMMITTEE based on risk level.
   - **Policy Blockers** — any BLOCK, WARN, or INFO conditions.
5. If no blockers are present, the reservation is created with a 10-minute TTL.

> **Talking point**: "No exposure is created without passing the capital adequacy perimeter. The reservation locks bilateral exposure into the risk management system before any commercial commitment is made."

### Step 3.3 — Convert reservation to order

1. Navigate to **Reservations** in the sidebar.
2. Click on the active reservation.
3. Click **Convert to Order**.
4. The system freezes a **MarketplacePolicySnapshot** — TRI, ECR, hardstop utilization, approval tier, and all blocker states are permanently recorded at conversion time.
5. The order appears in the **Orders** list.

> **Talking point**: "The policy snapshot is frozen at conversion time and can never be altered. This creates an immutable audit trail of the risk conditions under which every order was approved."

---

## 4. Settlement Lifecycle

This is the core of the demonstration. The demo scenario pre-seeds a settlement case in the `ESCROW_OPEN` state.

### Step 4.1 — View the settlement

1. Navigate to **Settlements** in the sidebar.
2. Click on the active settlement case.

**URL**: `/settlements/[id]?demo=true`

You will see:

- **Settlement details**: Order ID, weight, price locked, notional value, corridor, settlement rail (WIRE or RTGS), vault hub.
- **Counterparty information**: Buyer and seller organizations with LEI identifiers.
- **Settlement requirements**: A checklist showing what must be completed before the next action is available.
- **Action buttons**: Role-gated buttons showing which actions the current user can perform.
- **Timeline**: An institutional timeline showing every ledger entry with canonical step labels and UTC timestamps.

### Step 4.2 — Walk through the settlement lifecycle

Execute each action in sequence. Each action requires a specific role — the Clearing Authority (admin) role can perform most actions:

| #   | Action                   | Button               | What happens                                                                                                                                                                                       |
| --- | ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Confirm Funds Final**  | `Confirm Funds`      | Treasury confirms fiat payment received. Marks `fundsConfirmedFinal = true`.                                                                                                                       |
| 2   | **Allocate Gold**        | `Allocate Gold`      | Vault operations confirms physical gold has been allocated from inventory. Marks `goldAllocated = true`.                                                                                           |
| 3   | **Clear Verification**   | `Clear Verification` | Compliance confirms all KYC/KYB verification checks have passed for both counterparties. Marks `verificationCleared = true`.                                                                       |
| 4   | **Authorize Settlement** | `Authorize`          | Clearing authority reviews all three prerequisites (funds, gold, verification) and authorizes the settlement for execution. A frozen capital snapshot is recorded. Status changes to `AUTHORIZED`. |
| 5   | **Execute DvP**          | `Execute DvP`        | Atomic Delivery-versus-Payment execution. Title and payment transfer simultaneously in a single deterministic operation. Status changes to `SETTLED`.                                              |

After each action, observe:

- The **timeline** updates with a new ledger entry showing the action, actor role, and UTC timestamp.
- The **status badge** changes to reflect the new settlement state.
- **Action buttons** update — only valid next actions are enabled; previous actions disappear.

> **Key talking point at DvP execution**: "This is the atomic settlement moment. Title transfer and payment transfer occur simultaneously in a single deterministic operation. There is no window where one party has delivered and the other has not. This eliminates the principal risk that is inherent in sequential bilateral transfers."

### Step 4.3 — View the clearing receipt

After the settlement reaches `SETTLED` status:

1. Navigate to the order that was settled.
2. Click **View Receipt**.

**URL**: `/orders/[id]/receipt?demo=true`

You will see:

- **Institutional header band** (demo only): "CLEARING CERTIFICATE ISSUED — VERIFIED DELIVERY" with certificate number and issuance timestamp.
- **Full clearing receipt**: Parties (with LEI identifiers), asset details, economics (notional, clearing fee 0.15%, custody fee 0.05%), controls (corridor, settlement hub, vault hub).
- **Deterministic checks snapshot**: Capital conditions frozen at both authorization and execution — ECR, hardstop utilization, funds confirmed, gold allocated, verification cleared.
- **Ledger excerpt**: The authorization and DvP execution ledger entries with full detail.
- **Clearing certification section**: Certificate number, signature hash (SHA-256), and a link to view the full certificate.

### Step 4.4 — View the full certificate

Click **View Full Certificate** to open a print-ready black-and-white certificate modal:

- Certificate number (format: `AS-GC-YYYYMMDD-<8HEX>-<4SEQ>`)
- Settlement ID and Order ID
- Issuance and execution timestamps (UTC)
- Asset details (weight, form, purity)
- Notional value and total fees
- Full signature hash (SHA-256 derived from canonical serialization)
- Ledger integrity statement

> **Talking point**: "This certificate is the authoritative proof of settlement finality. The signature hash is computed from a canonical serialization of all settlement parameters, counterparty identifiers, and economic terms. It can be independently verified against the ledger state at time of issuance."

Click **Print Certificate** to generate a clean print layout.

---

## 5. Capital Adequacy Console

### Step 5.1 — View intraday capital

Navigate to **Intraday** in the sidebar under the Capital section.

**URL**: `/intraday?demo=true`

The Intraday Capital Console shows:

- **Capital Base**: Total available capital.
- **Gross Exposure**: Sum of all active reservations, orders, and open settlements.
- **ECR (Exposure Coverage Ratio)**: Gross exposure divided by capital base. The target is displayed alongside the current value.
- **Hardstop Utilization**: Percentage of the absolute capital limit consumed.
- **TVaR₉₉ Buffer**: Capital buffer versus the 99th percentile tail risk estimate.
- **Breach Level**: NONE, CAUTION, or BREACH — computed deterministically.
- **Top Drivers**: The largest individual exposures contributing to gross exposure, ranked by notional value.

> **Talking point**: "Continuous monitoring replaces periodic reporting. Breach events are generated deterministically and immediately — not at the end of the day."

### Step 5.2 — View capital controls

Navigate to **Controls** in the sidebar.

**URL**: `/capital-controls?demo=true`

The Capital Controls console shows the current enforcement mode and the block matrix:

| Mode                    | Effect                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `NORMAL`                | All operations permitted.                                                               |
| `THROTTLE_RESERVATIONS` | New reservations are limited by maximum notional and weight constraints.                |
| `FREEZE_CONVERSIONS`    | Reservation-to-order conversions are blocked. Existing orders proceed.                  |
| `FREEZE_MARKETPLACE`    | All new marketplace activity is blocked. Existing settlements can complete.             |
| `EMERGENCY_HALT`        | All operations suspended. DvP execution is blocked. Manual override required to resume. |

The block matrix shows exactly which actions (Create Reservation, Convert Reservation, Publish Listing, Open Settlement, Execute DvP) are blocked under the current mode.

> **Talking point**: "Automated policy enforcement removes discretionary intervention from critical risk decisions. The escalation ladder is deterministic — it cannot be ignored or bypassed without a documented override."

---

## 6. Verification & Identity

Navigate to **Verification** in the sidebar.

**URL**: `/verification?demo=true`

The verification system implements a multi-step KYC/KYB identity perimeter:

**KYC Steps** (for individual users):

1. Email & Phone Confirmation
2. Government ID Capture
3. Liveness Check (biometric)
4. Sanctions & PEP Screening

**KYB Steps** (for company entities):

1. Company Registration Documents
2. Ultimate Beneficial Owner (UBO) Declaration
3. Proof of Registered Address
4. Source of Funds Declaration

Each step produces a deterministic outcome and evidence stub. The verification case has a computed status (PENDING, IN_PROGRESS, APPROVED, REJECTED) and a risk tier (LOW, ELEVATED, HIGH).

> **Talking point**: "Inventory integrity is a precondition for settlement finality. The clearing authority cannot guarantee delivery without verified provenance and counterparty identity."

---

## 7. Audit & Supervisory Oversight

### Step 7.1 — Audit console

Navigate to **Audit Console** in the sidebar under Governance.

**URL**: `/audit?demo=true`

The audit console provides a full event log of every action taken in the system — every settlement action, capital breach event, override request, and system event. Each entry includes:

- Timestamp
- Actor role and user ID
- Action type
- Resource type and ID
- Result (SUCCESS / FAILURE)
- Severity level
- Full message and metadata

### Step 7.2 — Supervisory mode

Navigate to **Supervisory Mode** in the sidebar.

**URL**: `/supervisory?demo=true`

The supervisory console presents settlement cases as **case dossiers** for regulatory review. Each case includes:

- Full settlement details
- Complete ledger history
- Capital snapshot frozen at time of authorization
- Append-only audit trail

> **Talking point**: "The supervisory console is designed for regulator-ready evidence packages. Every settlement can be independently examined with its complete governance trail, capital conditions, and authorization chain."

---

## 8. Seller Supply Controls

### Step 8.1 — View seller listings

Switch to the **Seller** role (navigate to `/demo/login?demo=true` and select "Seller"), or continue as Clearing Authority who also has access.

Navigate to **My Listings** in the sidebar under Supply.

### Step 8.2 — Create a listing (optional)

Navigate to **Create Listing** in the sidebar.

The listing wizard requires:

1. **Asset details**: Form (Bar/Coin), purity (.995/.999/.9999), weight in troy ounces, price per oz.
2. **Custody details**: Vault hub, jurisdiction.

After creating a draft listing, you must attach a three-part evidence pack:

1. **Certified Assay Report** — laboratory analysis confirming purity and composition.
2. **Chain of Custody Certificate** — documented provenance from mine to vault.
3. **Seller Attestation Declaration** — signed declaration of ownership and authority to sell.

The **Publish Gate** validates:

- Seller verification status (KYC/KYB must be approved)
- Evidence completeness (all three documents required)
- Capital control constraints (publish may be blocked under FREEZE_MARKETPLACE)

Only when all conditions pass can the listing be published to the marketplace.

> **Talking point**: "Three-part evidence packing with a deterministic publish gate ensures no unverified or under-documented inventory can enter the marketplace."

---

## 9. Presentation Mode

At any point during the demo, press **SHIFT + D** to toggle presentation mode:

| Feature         | Effect                                    |
| --------------- | ----------------------------------------- |
| Sidebar         | Hidden — full-width content area          |
| Breadcrumbs     | Hidden — cleaner visual                   |
| Font size       | Increased to 108%                         |
| Line height     | Increased to 1.55                         |
| Card padding    | Increased by 12%                          |
| Tabular numbers | Monospace alignment for financial figures |

Press **SHIFT + D** again to exit presentation mode and return to the standard layout.

> **Tip**: Use presentation mode when screen sharing to a projector or large display. The larger typography and simplified layout are optimized for readability at distance.

---

## 10. Presenter Notes Panel

While in demo mode, look for the **Notes** button in the bottom-right corner of the screen. Click it to open the **Presenter Notes** panel.

The panel provides structured talking points for each of the 8 walkthrough sections:

- 3 key bullet points per section
- A highlighted **Key Takeaway**
- A **Risk Prevention** statement

The presenter notes panel is automatically hidden when presentation mode is active (SHIFT+D), since the audience should not see your notes on a shared screen.

---

## Guided Walkthrough Hub

For a structured overview of all sections, navigate to:

**URL**: `/demo?demo=true`

This page provides the complete walkthrough hub with:

- All 8 sections with systemic risk framing
- Risk Addressed / Control Mechanism / Why It Matters for each section
- Direct "Launch" buttons to each section

---

## Role Permissions Reference

| Feature            | Buyer     | Seller    | Clearing Authority | Compliance | Treasury     |
| ------------------ | --------- | --------- | ------------------ | ---------- | ------------ |
| Dashboard          | ✅        | ✅        | ✅                 | ✅         | ✅           |
| Marketplace        | ✅        | ✅        | ✅                 | ✅         | ✅           |
| Reservations       | ✅        | ❌        | ✅                 | ✅         | ✅           |
| Orders             | ✅        | ✅        | ✅                 | ✅         | ✅           |
| Settlements        | ✅ (view) | ✅ (view) | ✅ (full)          | ✅ (view)  | ✅ (limited) |
| Confirm Funds      | ❌        | ❌        | ✅                 | ❌         | ✅           |
| Allocate Gold      | ❌        | ❌        | ✅                 | ❌         | ❌           |
| Clear Verification | ❌        | ❌        | ✅                 | ✅         | ❌           |
| Authorize          | ❌        | ❌        | ✅                 | ❌         | ❌           |
| Execute DvP        | ❌        | ❌        | ✅                 | ❌         | ❌           |
| Intraday Capital   | ❌        | ❌        | ✅                 | ✅         | ✅           |
| Capital Controls   | ❌        | ❌        | ✅                 | ✅         | ✅           |
| Create Listing     | ❌        | ✅        | ✅                 | ❌         | ❌           |
| Audit Console      | ❌        | ❌        | ✅                 | ✅         | ✅           |
| Supervisory Mode   | ❌        | ❌        | ✅                 | ✅         | ❌           |

---

## Troubleshooting

| Issue                                | Solution                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Demo data not loading                | Ensure `?demo=true` is in the URL. Navigate to `/demo/login?demo=true` and select a role.                |
| Settlement actions not available     | Check that you are logged in as the correct role. Only Clearing Authority can authorize and execute DvP. |
| Blank pages after navigation         | Refresh the page with `?demo=true` in the URL.                                                           |
| Presentation mode not toggling       | Press **SHIFT + D** (capital D, with Shift held). Must be in demo mode.                                  |
| Certificate not appearing on receipt | The settlement must reach `SETTLED` status first. Complete all 5 lifecycle actions.                      |
