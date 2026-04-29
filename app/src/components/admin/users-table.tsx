"use client";

import { useState, useTransition } from "react";
import { updateUserRoles, setUserActive, triggerUserPasswordReset } from "@/lib/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
}

interface UsersTableProps {
  users: UserRow[];
}

const ALL_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "acquisition_manager", label: "Acq. Mgr" },
  { value: "disposition_manager", label: "Disp. Mgr" },
  { value: "lead_manager", label: "Lead Mgr" },
  { value: "transaction_coordinator", label: "TC" },
  { value: "sales", label: "Sales" },
  { value: "assistant", label: "Assistant" },
];

function roleLabel(role: string): string {
  return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
}

interface UserRowEditProps {
  user: UserRow;
}

function UserRowEdit({ user }: UserRowEditProps) {
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [rolesEditing, setRolesEditing] = useState(false);

  function toggleRole(role: string) {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    setRoles(next);
  }

  function handleSaveRoles() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoles(user.id, roles);
      if (!result.success) {
        setError(result.error ?? "Failed to update roles");
      } else {
        setRolesEditing(false);
      }
    });
  }

  function handleToggleActive() {
    setError(null);
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      const result = await setUserActive(user.id, next);
      if (!result.success) {
        setIsActive(!next); // revert
        setError(result.error ?? "Failed to update status");
      }
    });
  }

  function handlePasswordReset() {
    setError(null);
    setResetUrl(null);
    startTransition(async () => {
      const result = await triggerUserPasswordReset(user.id);
      if (!result.success) {
        setError(result.error ?? "Failed to trigger reset");
      } else if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      } else {
        // Email sent
        setResetUrl("Email sent");
      }
    });
  }

  return (
    <tr className={`border-b border-border text-sm ${!isActive ? "opacity-60" : ""}`}>
      <td className="py-3 px-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{user.name}</p>
            {user.roles.length === 0 && (
              <span
                className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800"
                title="Auto-provisioned via Google sign-in. Assign roles to grant access."
              >
                Pending
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </td>
      <td className="py-3 px-4">
        {rolesEditing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((r) => (
                <label key={r.value} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="rounded"
                    disabled={isPending}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveRoles} disabled={isPending} className="text-xs h-7">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setRoles(user.roles); setRolesEditing(false); }} className="text-xs h-7">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 items-center">
            {roles.length === 0 ? (
              <span className="text-muted-foreground text-xs">No roles</span>
            ) : (
              roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">
                  {roleLabel(r)}
                </Badge>
              ))
            )}
            <button
              type="button"
              onClick={() => setRolesEditing(true)}
              className="text-[10px] text-primary hover:underline ml-1"
              disabled={isPending}
            >
              Edit
            </button>
          </div>
        )}
      </td>
      <td className="py-3 px-4">
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isPending}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${
            isActive ? "bg-primary" : "bg-muted-foreground/30"
          }`}
          aria-label={isActive ? "Deactivate user" : "Activate user"}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
              isActive ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </td>
      <td className="py-3 px-4 text-muted-foreground text-xs">
        {format(new Date(user.createdAt), "MMM d, yyyy")}
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            disabled={isPending}
            onClick={handlePasswordReset}
          >
            Reset PW
          </Button>
          {resetUrl && resetUrl !== "Email sent" && (
            <div className="text-[9px] text-muted-foreground break-all max-w-[200px]">
              <span className="font-semibold">URL:</span> {resetUrl}
            </div>
          )}
          {resetUrl === "Email sent" && (
            <span className="text-[10px] text-green-600">Email sent</span>
          )}
          {error && (
            <span className="text-[10px] text-destructive">{error}</span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No users found.</p>
    );
  }

  // Sort: pending users (roles=[]) first, then by createdAt descending
  const sorted = [...users].sort((a, b) => {
    const aPending = a.roles.length === 0 ? 0 : 1;
    const bPending = b.roles.length === 0 ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-2.5 px-4">User</th>
            <th className="py-2.5 px-4">Roles</th>
            <th className="py-2.5 px-4">Active</th>
            <th className="py-2.5 px-4">Created</th>
            <th className="py-2.5 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((user) => (
            <UserRowEdit key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
