/* ================================================================
   MIDDLEWARE — AurumShield (Host-Based Domain Split + Clerk Auth)
   ================================================================
   Enforces domain-level route gating:
   - aurumshield.vip / www.aurumshield.vip → marketing routes only
   - app.aurumshield.vip → app routes only

   Cross-domain requests are redirected (307) to the correct domain.
   In local development (localhost), no host gating is applied.

   Clerk auth is enforced on all non-public routes after domain gating.

   LEGACY BUYER ROUTE QUARANTINE:
   The /offtaker/* route family is DEPRECATED. All legacy buyer paths
   (/offtaker/*, /marketplace, /checkout, /perimeter/*) are intercepted
   HERE — before any page rendering — and 307-redirected to their
   canonical /institutional/* equivalents.

   The redirect map is defined ONCE in:
     src/lib/routing/institutional-routes.ts → LEGACY_BUYER_REDIRECTS
   and imported here. No other file handles legacy buyer routing.

   CORS FIX: RSC prefetch requests and Next.js router prefetches are
   NEVER cross-domain redirected. They receive a 204 No Content instead
   to prevent the browser from issuing CORS-blocked cross-origin fetches.
   ================================================================ */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LEGACY_BUYER_REDIRECTS } from "@/lib/routing/institutional-routes";

/* ── Domain configuration ── */
const ROOT_DOMAIN = "aurumshield.vip";
const APP_DOMAIN = "app.aurumshield.vip";
const ROOT_URL = process.env.NEXT_PUBLIC_ROOT_URL || `https://${ROOT_DOMAIN}`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `https://${APP_DOMAIN}`;

/* ── Check if Clerk is actually configured ── */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/* ── Marketing-only routes (served on root domain) ──
   NOTE: Root "/" is NOT included here. On the marketing host it is
   handled explicitly. On the app host "/" passes through to Clerk
   which redirects to /dashboard or /login — never cross-domain. */
const MARKETING_PATHS = ["/platform-overview", "/technical-overview", "/demo", "/legal", "/investor-brief"];

/* ── Routes that are available on BOTH domains (never redirected) ── */
const SHARED_PATHS = ["/health", "/api/webhooks", "/api/fix-schema", "/favicon.ico"];

/* ── Legacy buyer route redirect resolution ──
   Uses the centralized LEGACY_BUYER_REDIRECTS array imported from
   src/lib/routing/institutional-routes.ts — the single source of truth.
   No legacy paths are hardcoded in this file.

   QUARANTINE: /offtaker/* is deprecated. These redirects exist solely
   for backward compatibility with bookmarks, external links, and cached
   browser history. All new navigation MUST use /institutional/* paths. */

/**
 * Check if the pathname matches a legacy buyer route and return
 * the canonical /institutional/* redirect target, or null.
 *
 * Iterates the ordered LEGACY_BUYER_REDIRECTS array (most-specific
 * paths first). For startsWith matches, the remaining path suffix
 * is preserved (e.g. /offtaker/settings/profile → /institutional/profile).
 * Query string is preserved by the caller.
 */
function getLegacyRedirect(pathname: string): string | null {
  for (const [legacyPath, canonicalPath] of LEGACY_BUYER_REDIRECTS) {
    if (pathname === legacyPath || pathname.startsWith(legacyPath + "/")) {
      const suffix = pathname.slice(legacyPath.length);
      return canonicalPath + suffix;
    }
  }
  return null;
}

/* ── Public routes — accessible without authentication ── */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/health(.*)",
  "/api/webhooks/(.*)",
  "/api/fix-schema(.*)",
  "/api/admin/migrate-onboarding(.*)",
  "/api/admin/migrate-kycaid(.*)",
  "/demo/(.*)",
  "/dev/(.*)",
  "/",
  "/platform-overview(.*)",
  "/technical-overview(.*)",
  "/legal(.*)",
  "/investor-brief(.*)",
  "/institutional/(.*)",
]);

/* ── Helpers ── */
function isLocalhost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  );
}

function isMarketingHost(host: string): boolean {
  const h = host.split(":")[0]; // strip port
  return h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`;
}

function isAppHost(host: string): boolean {
  const h = host.split(":")[0];
  return h === APP_DOMAIN;
}

function isMarketingPath(pathname: string): boolean {
  // Root "/" is intentionally excluded — each domain handles it separately
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isSharedPath(pathname: string): boolean {
  return SHARED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Detect any form of Next.js internal prefetch / RSC request.
 * These MUST NEVER be 307-redirected cross-domain because the
 * browser's fetch will CORS-block the redirect response.
 */
function isPrefetchOrRSC(request: NextRequest): boolean {
  // RSC header (server component fetch)
  if (request.headers.get("RSC") === "1") return true;
  // _rsc search param (RSC data fetch)
  if (request.nextUrl.searchParams.has("_rsc")) return true;
  // Next.js router prefetch header
  if (request.headers.get("Next-Router-Prefetch") === "1") return true;
  // Generic prefetch purpose header
  if (request.headers.get("Purpose") === "prefetch") return true;
  if (request.headers.get("Sec-Purpose") === "prefetch") return true;
  return false;
}

/* ── Clerk middleware with auth enforcement ── */
const clerk = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

/* ── Main middleware export ── */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  /* ── LEGACY BUYER ROUTE REDIRECTS ──
     Intercept ALL old buyer-facing routes FIRST, before any other
     logic. This ensures /offtaker/*, /marketplace, /checkout, and
     /perimeter/* always resolve to their /institutional/* canonical
     paths, regardless of host or auth state. */
  const legacyTarget = getLegacyRedirect(pathname);
  if (legacyTarget) {
    const target = new URL(legacyTarget + request.nextUrl.search, request.url);
    return NextResponse.redirect(target, 307);
  }

  // Skip domain gating in local development
  if (isLocalhost(host)) {
    // Redirect bare parent paths to their canonical children (prevents 404)
    if (pathname === "/institutional/get-started") {
      return NextResponse.redirect(new URL("/institutional/get-started/welcome", request.url));
    }
    if (pathname === "/institutional/first-trade") {
      return NextResponse.redirect(new URL("/institutional/first-trade/asset", request.url));
    }
    if (!CLERK_ENABLED) {
      return NextResponse.next();
    }
    return clerk(request, {} as never);
  }

  // ── Redirect bare parent paths (no page.tsx) to canonical children ──
  if (pathname === "/institutional/get-started") {
    return NextResponse.redirect(new URL("/institutional/get-started/welcome", request.url));
  }
  if (pathname === "/institutional/first-trade") {
    return NextResponse.redirect(new URL("/institutional/first-trade/asset", request.url));
  }

  // Shared paths (health, webhooks) — always pass through
  if (isSharedPath(pathname)) {
    return NextResponse.next();
  }

  // ── GLOBAL PREFETCH GUARD ──
  // Detect RSC / prefetch requests BEFORE domain routing.
  // If a prefetch would result in a cross-domain redirect, return 204.
  const isPrefetch = isPrefetchOrRSC(request);

  // ── Marketing domain: aurumshield.vip / www.aurumshield.vip ──
  if (isMarketingHost(host)) {
    // Root "/" and marketing paths — serve directly, no auth
    if (pathname === "/" || isMarketingPath(pathname)) {
      return NextResponse.next();
    }
    // App route on marketing domain → redirect to app subdomain
    // Block redirect for prefetches to prevent CORS
    if (isPrefetch) {
      return new NextResponse(null, { status: 204 });
    }
    const target = new URL(pathname + request.nextUrl.search, APP_URL);
    return NextResponse.redirect(target, 307);
  }

  // ── App domain: app.aurumshield.vip ──
  if (isAppHost(host)) {
    if (isMarketingPath(pathname)) {
      // Marketing route on app domain → redirect to root domain
      // Block redirect for prefetches to prevent CORS
      if (isPrefetch) {
        return new NextResponse(null, { status: 204 });
      }
      const target = new URL(pathname + request.nextUrl.search, ROOT_URL);
      return NextResponse.redirect(target, 307);
    }
    // Root "/" and all app routes — enforce Clerk auth
    // "/" will be handled by Clerk → redirects to /dashboard or /login
    if (!CLERK_ENABLED) {
      return NextResponse.next();
    }
    return clerk(request, {} as never);
  }

  // Unknown host — pass through (safety net)
  if (!CLERK_ENABLED) {
    return NextResponse.next();
  }
  return clerk(request, {} as never);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets in /images, /fonts, etc.
     * - Static file extensions (.svg, .png, .jpg, .gif, .webp, .ico, .css, .js, .woff, .woff2, .ttf, .eot)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|images/|fonts/|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.ico$|.*\\.css$|.*\\.woff2?$|.*\\.ttf$|.*\\.eot$).*)",
  ],
};
