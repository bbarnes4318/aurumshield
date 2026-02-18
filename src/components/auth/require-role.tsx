"use client";

/* ================================================================
   REQUIRE ROLE — Client-side role gate
   ================================================================
   - Wraps RequireAuth to guarantee a session exists
   - If user role ∉ allowedRoles → shows access-denied message
   - Otherwise renders children
   ================================================================ */

import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/lib/mock-data";
import { RequireAuth } from "./require-auth";
import { ShieldAlert } from "lucide-react";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/** Public wrapper — always requires auth first, then checks role. */
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard>
    </RequireAuth>
  );
}

/** Internal guard — checks the user's role against allowedRoles. */
function RoleGuard({ allowedRoles, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-danger" />
        <h2 className="text-lg font-semibold text-text">Access Restricted</h2>
        <p className="max-w-md text-sm text-text-muted">
          Your role ({user.role}) does not have access to this page.
          Permitted roles: {allowedRoles.join(", ")}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
