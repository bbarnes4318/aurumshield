"use client";

/* ================================================================
   REQUIRE AUTH — Client-side route guard (Clerk + Demo compatible)
   ================================================================
   - When Clerk is configured: checks Clerk session + falls back
     to mock session for demo users
   - When Clerk is NOT configured: uses mock auth only
   - Renders <LoadingState> while session resolves
   - Redirects to /login?next=<pathname+search> if no session
   - Wraps in <Suspense> to satisfy Next.js useSearchParams rule
   ================================================================ */

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState } from "@/components/ui/state-views";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Public wrapper — wraps the guard in Suspense so useSearchParams
 * won't blow up during SSR or static prerender.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <AuthGuard>{children}</AuthGuard>
    </Suspense>
  );
}

/** Internal guard — uses client-only hooks. */
function AuthGuard({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      logout();
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isAuthenticated, isLoading, pathname, searchParams, router, logout]);

  // Use a single consistent message for all pre-auth states to prevent
  // SSR/client hydration mismatch (server has no localStorage session).
  if (isLoading || !isAuthenticated) {
    return <LoadingState message="Loading…" />;
  }

  return <>{children}</>;
}
