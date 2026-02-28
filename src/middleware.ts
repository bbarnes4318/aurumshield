/* ================================================================
   MIDDLEWARE — AurumShield (Host-Based Domain Split + Clerk Auth)
   ================================================================
   Enforces domain-level route gating:
   - aurumshield.vip / www.aurumshield.vip → marketing routes only
   - app.aurumshield.vip → app routes only

   Cross-domain requests are redirected (307) to the correct domain.
   In local development (localhost), no host gating is applied.

   Clerk auth is enforced on all non-public routes after domain gating.
   ================================================================ */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

/* ── Marketing-only routes (served on root domain) ── */
const MARKETING_PATHS = ["/platform-overview", "/technical-overview", "/demo", "/legal"];

/* ── Routes that are available on BOTH domains (never redirected) ── */
const SHARED_PATHS = ["/health", "/api/webhooks", "/favicon.ico"];

/* ── Public routes — accessible without authentication ── */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/health(.*)",
  "/api/webhooks/(.*)",
  "/demo/(.*)",
  "/dev/(.*)",
  "/",
  "/platform-overview(.*)",
  "/technical-overview(.*)",
  "/legal(.*)",
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
  if (pathname === "/") return true;
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isSharedPath(pathname: string): boolean {
  return SHARED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
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

  // Skip domain gating in local development
  if (isLocalhost(host)) {
    if (!CLERK_ENABLED) {
      return NextResponse.next();
    }
    return clerk(request, {} as never);
  }

  // Shared paths (health, webhooks) — always pass through
  if (isSharedPath(pathname)) {
    return NextResponse.next();
  }

  // ── Marketing domain: aurumshield.vip / www.aurumshield.vip ──
  if (isMarketingHost(host)) {
    if (isMarketingPath(pathname)) {
      // Serve marketing page — no auth required
      return NextResponse.next();
    }
    // App route on marketing domain → redirect to app subdomain
    const target = new URL(pathname + request.nextUrl.search, APP_URL);
    return NextResponse.redirect(target, 307);
  }

  // ── App domain: app.aurumshield.vip ──
  if (isAppHost(host)) {
    if (isMarketingPath(pathname)) {
      // Marketing route on app domain → redirect to root domain
      const target = new URL(pathname + request.nextUrl.search, ROOT_URL);
      return NextResponse.redirect(target, 307);
    }
    // App route — enforce Clerk auth
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
