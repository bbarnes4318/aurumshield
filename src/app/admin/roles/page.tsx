"use client";

import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useRoles } from "@/hooks/use-mock-queries";
import { cn } from "@/lib/utils";
import { Shield, Lock } from "lucide-react";

export default function RolesPage() {
  const rolesQ = useRoles();

  return (
    <>
      <PageHeader title="Roles & Permissions" description="Role-based access control — define and manage user roles and permission sets." />

      {rolesQ.isLoading && <LoadingState message="Loading roles…" />}
      {rolesQ.isError && <ErrorState message="Failed to load roles." onRetry={() => rolesQ.refetch()} />}

      {rolesQ.data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rolesQ.data.map((role) => (
            <div key={role.id} className="card-base p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2">
                    {role.isSystem ? <Shield className="h-4 w-4 text-gold" /> : <Lock className="h-4 w-4 text-text-muted" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text">{role.name}</h3>
                    <p className="text-xs text-text-faint">
                      {role.isSystem ? "System role" : "Custom role"} · {role.userCount} {role.userCount === 1 ? "user" : "users"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-text-muted">{role.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <span key={perm} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-text-faint">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
