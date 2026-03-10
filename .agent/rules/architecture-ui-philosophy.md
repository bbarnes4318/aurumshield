---
trigger: always_on
---

# Project Architecture & UI Philosophy

We are completely rebuilding the frontend for a high-end physical gold purchasing platform. The previous iteration was a chaotic, over-engineered disaster that confused buyers and crashed during checkout. You are now operating under a strict "No Bullshit" protocol.

## Core Directives

### 1. Radical Transparency

The buyer must ALWAYS see the exact price, exact premiums, and exact fees (shipping or vaulting) at every single step. Never hide the math behind a "Next" button.

### 2. Zero-Crash Tolerance

Do not use deeply nested Server Components that swallow errors and leak "digest properties" to the client. Keep state management (like the checkout wizard) purely client-side with simple React state until the final data submission.

### 3. Brutalist Minimalism

The UI must look like a high-end financial institution, not a SaaS startup. Use extensive white space, high-contrast text, clear typography, and stark borders. Remove all unnecessary dashboards, graphs, metrics, and "lifecycle" trackers unless they serve an immediate, critical purpose for a retail buyer.

### 4. No Dead Ends

If a user clicks a button (like "Initiate Wire"), it must actually trigger an action or show the exact instructions needed. Do not loop them back to the same page.
