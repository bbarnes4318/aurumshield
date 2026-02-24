/* ================================================================
   MIDDLEWARE — AurumShield (Clerk-powered)
   ================================================================
   Uses clerkMiddleware() to enforce authentication on all routes
   except explicitly public ones. When Clerk is not configured,
   degrades gracefully to a pass-through.

   Public routes (no auth required):
   - /login, /signup, /forgot-password — auth pages
   - /health — ECS health checks
   - /api/webhooks/(.*) — inbound webhooks (Clerk, Stripe, etc.)
   - /demo/(.*) — demo/walkthrough pages
   ================================================================ */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ── Check if Clerk is actually configured ── */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

/* ── Public routes — accessible without authentication ── */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/health(.*)",
  "/api/webhooks/(.*)",
  "/demo/(.*)",
  "/",
]);

/* ── Clerk middleware with auth enforcement ── */
const clerk = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

/* ── Export: use Clerk when configured, pass-through otherwise ── */
export function middleware(request: NextRequest) {
  if (!CLERK_ENABLED) {
    // Clerk not provisioned — pass-through for demo mode.
    return NextResponse.next();
  }
  // Delegate to Clerk middleware
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
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|images/|fonts/).*)",
  ],
};
