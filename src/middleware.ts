/* ================================================================
   CLERK MIDDLEWARE — AurumShield
   ================================================================
   Uses clerkMiddleware() from @clerk/nextjs/server.
   Placed in src/middleware.ts per Next.js App Router conventions.

   Public routes (login, signup, platform, demo) are not protected
   by default — clerkMiddleware() allows unauthenticated access
   unless explicitly restricted. Route protection is handled at the
   component level via RequireAuth / RequireRole wrappers.
   ================================================================ */

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
