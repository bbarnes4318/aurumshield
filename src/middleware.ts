/* ================================================================
   MIDDLEWARE — AurumShield
   ================================================================
   Minimal Next.js middleware. Does NOT use Clerk (not installed).
   Auth is handled at the component level via RequireAuth wrappers
   and the mock auth system in auth-provider.tsx.

   This middleware is a no-op pass-through that ensures all routes
   function correctly, including the /health endpoint used by
   ECS health checks.
   ================================================================ */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Only match routes that actually need middleware processing.
  // Currently none — auth is client-side. This avoids intercepting
  // health checks, static files, and API routes unnecessarily.
  matcher: [],
};
