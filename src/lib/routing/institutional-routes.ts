/* ================================================================
   INSTITUTIONAL ROUTES — Single Source of Truth
   ================================================================
   Every buyer-facing route target in the app MUST import from here.
   No hardcoded "/offtaker/*", "/marketplace", "/checkout", or
   "/settlement" strings anywhere in buyer-facing code.

   Legacy /offtaker/* routes are preserved ONLY as redirect targets
   in the middleware. They are NOT imported by any component.
   ================================================================ */

/**
 * Canonical route map for the institutional buyer portal.
 * One buyer. One route family. One truth.
 */
export const INSTITUTIONAL_ROUTES = {
  /** Portal root — portfolio overview (completed users) */
  ROOT: "/institutional",

  /** Guided onboarding — Getting Started phase */
  GET_STARTED: "/institutional/get-started",
  GET_STARTED_WELCOME: "/institutional/get-started/welcome",
  GET_STARTED_ORGANIZATION: "/institutional/get-started/organization",
  GET_STARTED_VERIFICATION: "/institutional/get-started/verification",
  GET_STARTED_FUNDING: "/institutional/get-started/funding",

  /** Guided onboarding — First Trade phase */
  FIRST_TRADE: "/institutional/first-trade",
  FIRST_TRADE_ASSET: "/institutional/first-trade/asset",
  FIRST_TRADE_DELIVERY: "/institutional/first-trade/delivery",
  FIRST_TRADE_REVIEW: "/institutional/first-trade/review",
  FIRST_TRADE_AUTHORIZE: "/institutional/first-trade/authorize",

  /** Advanced workspace — post-onboarding */
  MARKETPLACE: "/institutional/marketplace",
  ORDERS: "/institutional/orders",
  COMPLIANCE: "/institutional/compliance",
  SETTLEMENT: "/institutional/settlement",
} as const;

/**
 * Legacy redirect map — used ONLY by middleware to redirect
 * old buyer-facing URLs to their canonical institutional equivalents.
 *
 * QUARANTINE NOTICE:
 * The /offtaker/* route family is DEPRECATED and exists only for
 * backward compatibility. These paths are intercepted at the middleware
 * level and 307-redirected before any page rendering occurs.
 * No component, nav item, or CTA should ever link to these paths.
 *
 * Order matters: most-specific paths first to prevent prefix collisions.
 * The middleware iterates this list in order with startsWith matching.
 */
export const LEGACY_BUYER_REDIRECTS: [string, string][] = [
  /* ── /offtaker/org/* — legacy organization selection ── */
  ["/offtaker/org/select",          INSTITUTIONAL_ROUTES.GET_STARTED_WELCOME],
  ["/offtaker/org",                 INSTITUTIONAL_ROUTES.GET_STARTED_WELCOME],

  /* ── /offtaker/onboarding/* — legacy wizard steps ── */
  ["/offtaker/onboarding/intake",   INSTITUTIONAL_ROUTES.GET_STARTED_ORGANIZATION],   // was: entity + LEI step
  ["/offtaker/onboarding/kyb",      INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION],   // was: KYB document upload
  ["/offtaker/onboarding/ubo",      INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION],   // was: UBO declaration
  ["/offtaker/onboarding/aml",      INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION],   // was: AML screening
  ["/offtaker/onboarding/funding",  INSTITUTIONAL_ROUTES.GET_STARTED_FUNDING],        // was: source of funds
  ["/offtaker/onboarding/mca",      INSTITUTIONAL_ROUTES.GET_STARTED_FUNDING],        // was: DocuSign MCA
  ["/offtaker/onboarding",          INSTITUTIONAL_ROUTES.GET_STARTED_WELCOME],        // bare onboarding entry

  /* ── /offtaker/* — legacy workspace pages ── */
  ["/offtaker/marketplace",         INSTITUTIONAL_ROUTES.MARKETPLACE],
  ["/offtaker/orders",              INSTITUTIONAL_ROUTES.ORDERS],
  ["/offtaker/ledger",              INSTITUTIONAL_ROUTES.COMPLIANCE],
  ["/offtaker/settings",            INSTITUTIONAL_ROUTES.ROOT],
  ["/offtaker",                     INSTITUTIONAL_ROUTES.ROOT],                       // catch-all for /offtaker

  /* ── Standalone legacy buyer paths ── */
  ["/marketplace",                  INSTITUTIONAL_ROUTES.MARKETPLACE],
  ["/checkout",                     INSTITUTIONAL_ROUTES.FIRST_TRADE_ASSET],

  /* ── /perimeter/* — legacy auth/registration ── */
  ["/perimeter/verify",             INSTITUTIONAL_ROUTES.GET_STARTED_VERIFICATION],
  ["/perimeter/register",           INSTITUTIONAL_ROUTES.GET_STARTED_WELCOME],
];

/** Type-safe route value extraction */
export type InstitutionalRoute =
  (typeof INSTITUTIONAL_ROUTES)[keyof typeof INSTITUTIONAL_ROUTES];
