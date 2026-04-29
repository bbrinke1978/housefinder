"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { X, UserPlus, ChevronDown } from "lucide-react";
import { updateDealAssignment } from "@/lib/deal-actions";
import type { ActiveUser } from "@/lib/deal-queries";

// ---- Types ----

type Slot = "acquisition" | "disposition" | "coordinator";

interface DealTeamPanelProps {
  dealId: string;
  acquisitionUserId: string | null;
  dispositionUserId: string | null;
  coordinatorUserId: string | null;
  users: ActiveUser[];
  currentUserId: string | null;
  /** Can reassign any slot (owner) */
  canReassignAny: boolean;
  /** Can reassign disposition + coordinator on own deals (acquisition_manager) */
  canReassignOwn: boolean;
  /** True when currentUser is the acquisition assignee on this deal */
  isOwnDeal: boolean;
}

// ---- Helpers ----

/** Generates a stable color per initials (avatar circle) */
function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Role labels shown in the dropdown to help pick the right person per slot */
const SLOT_ROLE_LABELS: Record<Slot, string> = {
  acquisition: "Acquisition",
  disposition: "Disposition",
  coordinator: "Coordinator",
};

// ---- Sub-components ----

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={cn("flex items-center justify-center rounded-full text-white font-bold shrink-0", avatarColor(name), sz)}>
      {initials(name)}
    </div>
  );
}

// ---- Main Component ----

export function DealTeamPanel({
  dealId,
  acquisitionUserId,
  dispositionUserId,
  coordinatorUserId,
  users,
  currentUserId,
  canReassignAny,
  canReassignOwn,
  isOwnDeal,
}: DealTeamPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [openSlot, setOpenSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local state mirrors — allows optimistic-style updates without full page reload
  const [localAssignees, setLocalAssignees] = useState<Record<Slot, string | null>>({
    acquisition: acquisitionUserId,
    disposition: dispositionUserId,
    coordinator: coordinatorUserId,
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  function canEditSlot(slot: Slot): boolean {
    if (canReassignAny) return true;
    if (canReassignOwn && isOwnDeal && slot !== "acquisition") return true;
    return false;
  }

  function handleSelect(slot: Slot, selectedUserId: string | null) {
    setOpenSlot(null);
    setError(null);
    const prevUserId = localAssignees[slot];
    // Optimistic update
    setLocalAssignees((prev) => ({ ...prev, [slot]: selectedUserId }));
    startTransition(async () => {
      const result = await updateDealAssignment(dealId, slot, selectedUserId);
      if (!result.success) {
        // Revert on failure
        setLocalAssignees((prev) => ({ ...prev, [slot]: prevUserId }));
        setError(result.error ?? "Failed to update assignment");
      }
    });
  }

  const slots: { key: Slot; label: string }[] = [
    { key: "acquisition", label: "Acquisition" },
    { key: "disposition", label: "Disposition" },
    { key: "coordinator", label: "Coordinator" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Deal Team
      </h3>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ key, label }) => {
          const assigneeId = localAssignees[key];
          const assignee = assigneeId ? userMap.get(assigneeId) : null;
          const editable = canEditSlot(key);

          return (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {SLOT_ROLE_LABELS[key]}
              </p>

              {editable ? (
                <Dialog.Root
                  open={openSlot === key}
                  onOpenChange={(open) => setOpenSlot(open ? key : null)}
                >
                  <Dialog.Trigger
                    render={
                      <button
                        type="button"
                        disabled={isPending}
                        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                      >
                        {assignee ? (
                          <>
                            <UserAvatar name={assignee.name} size="sm" />
                            <span className="flex-1 truncate font-medium">{assignee.name}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-7 w-7 flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 shrink-0">
                              <UserPlus className="h-3.5 w-3.5 text-muted-foreground/60" />
                            </div>
                            <span className="flex-1 text-muted-foreground">Unassigned</span>
                          </>
                        )}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    }
                  />

                  <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
                    <Dialog.Popup
                      className={cn(
                        "fixed left-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2",
                        "rounded-2xl border border-border bg-card shadow-2xl p-4",
                        "transition-all duration-150",
                        "data-ending-style:opacity-0 data-ending-style:scale-95",
                        "data-starting-style:opacity-0 data-starting-style:scale-95"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Dialog.Title className="text-sm font-semibold">
                          Assign {label}
                        </Dialog.Title>
                        <Dialog.Close
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </Dialog.Close>
                      </div>

                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {/* Unassigned option */}
                        <button
                          type="button"
                          onClick={() => handleSelect(key, null)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-muted transition-colors",
                            assigneeId === null ? "bg-primary/10 font-semibold" : ""
                          )}
                        >
                          <div className="h-7 w-7 flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 shrink-0">
                            <X className="h-3 w-3 text-muted-foreground/60" />
                          </div>
                          <span className="text-muted-foreground">Unassigned</span>
                        </button>

                        {users.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelect(key, user.id)}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left hover:bg-muted transition-colors",
                              assigneeId === user.id ? "bg-primary/10 font-semibold" : ""
                            )}
                          >
                            <UserAvatar name={user.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{user.roles.join(", ")}</p>
                            </div>
                            {assigneeId === user.id && (
                              <span className="text-primary text-xs">Current</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              ) : (
                /* Read-only view */
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 text-sm">
                  {assignee ? (
                    <>
                      <UserAvatar name={assignee.name} size="sm" />
                      <span className="flex-1 truncate font-medium">{assignee.name}</span>
                    </>
                  ) : (
                    <>
                      <div className="h-7 w-7 flex items-center justify-center rounded-full border border-muted-foreground/20 shrink-0">
                        <UserPlus className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
