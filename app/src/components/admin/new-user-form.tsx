"use client";

import { useState, useTransition } from "react";
import { createUser } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "acquisition_manager", label: "Acquisition Manager" },
  { value: "disposition_manager", label: "Disposition Manager" },
  { value: "lead_manager", label: "Lead Manager" },
  { value: "transaction_coordinator", label: "Transaction Coordinator" },
  { value: "sales", label: "Sales" },
  { value: "assistant", label: "Assistant" },
  { value: "jv_partner", label: "JV Partner" },
];

export function NewUserForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResetUrl(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(fd);
      if (!result.success) {
        setError(result.error ?? "Failed to create user");
      } else {
        setSuccess("User created successfully.");
        if (result.resetUrl) {
          setResetUrl(result.resetUrl);
        }
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 w-fit"
          onClick={() => setOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          New User
        </Button>
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}
        {resetUrl && (
          <div className="rounded-md bg-muted p-3 text-xs space-y-1">
            <p className="font-semibold text-muted-foreground">RESEND not configured — share this password-reset URL manually:</p>
            <p className="break-all text-foreground font-mono">{resetUrl}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New User</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="new-user-email">Email</Label>
          <Input
            id="new-user-email"
            name="email"
            type="email"
            placeholder="stacee@no-bshomes.com"
            required
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-0.5">Must end @no-bshomes.com</p>
        </div>
        <div>
          <Label htmlFor="new-user-name">Full Name</Label>
          <Input
            id="new-user-name"
            name="name"
            type="text"
            placeholder="Stacee Smith"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label>Roles</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="roles"
                  value={role.value}
                  className="rounded border-border"
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Creating..." : "Create User"}
        </Button>
      </form>
    </div>
  );
}
