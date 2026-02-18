"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { Shield, Building2, KeyRound } from "lucide-react";

const VS_COLORS: Record<string, string> = {
  VERIFIED: "bg-success/10 text-success border-success/30",
  IN_PROGRESS: "bg-info/10 text-info border-info/30",
  NEEDS_REVIEW: "bg-warning/10 text-warning border-warning/30",
  NOT_STARTED: "bg-surface-3 text-text-faint border-border",
  REJECTED: "bg-danger/10 text-danger border-danger/30",
};

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const { user, org } = useAuth();

  return (
    <>
      <PageHeader title="Account" description="Institutional account profile, organization details, and security settings" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Profile */}
        <DashboardPanel title="Authorized Representative" tooltip="Your personal credentials" asOf={user?.createdAt ?? ""}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{user?.name ?? "—"}</p>
              <p className="text-xs font-mono text-text-faint">{user?.email ?? "—"}</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-faint">User ID</dt>
              <dd className="font-mono text-xs text-text">{user?.id ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Role</dt>
              <dd className="uppercase text-xs font-semibold tracking-wide text-text">{user?.role ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Verification</dt>
              <dd>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VS_COLORS[user?.verificationStatus ?? "NOT_STARTED"]}`}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {user?.verificationStatus?.replace(/_/g, " ") ?? "—"}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Created</dt>
              <dd className="text-xs tabular-nums text-text">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Last Login</dt>
              <dd className="text-xs tabular-nums text-text">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</dd>
            </div>
          </dl>
        </DashboardPanel>

        {/* Organization */}
        <DashboardPanel title="Legal Entity" tooltip="Your organization details" asOf={org?.createdAt ?? ""}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3">
              <Building2 className="h-5 w-5 text-text-faint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{org?.legalName ?? "—"}</p>
              <p className="text-xs text-text-faint capitalize">{org?.type ?? "—"}</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-faint">Org ID</dt>
              <dd className="font-mono text-xs text-text">{org?.id ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Entity Type</dt>
              <dd className="capitalize text-text">{org?.type ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Jurisdiction</dt>
              <dd className="text-text">{org?.jurisdiction ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Registered</dt>
              <dd className="text-xs tabular-nums text-text">{org?.createdAt ? new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</dd>
            </div>
          </dl>
        </DashboardPanel>

        {/* Security */}
        <DashboardPanel title="Security" tooltip="Session and security configuration" asOf={new Date().toISOString()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3">
              <KeyRound className="h-5 w-5 text-text-faint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Session Security</p>
              <p className="text-xs text-text-faint">12-hour TTL, deterministic token</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-faint">Session TTL</dt>
              <dd className="text-text">12 hours</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">Token Type</dt>
              <dd className="font-mono text-xs text-text">Deterministic (sess_*)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">MFA</dt>
              <dd className="text-xs text-text-faint">
                {/* TODO: MFA integration — interface defined, not yet wired */}
                Not configured
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-faint">API Keys</dt>
              <dd className="text-xs text-text-faint">
                {/* TODO: API key management — interface defined, not yet wired */}
                None issued
              </dd>
            </div>
          </dl>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-xs text-success font-medium">Session active</span>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
