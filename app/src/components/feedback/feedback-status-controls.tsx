"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateFeedbackStatus,
  updateFeedbackItem,
} from "@/lib/feedback-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackStatus = "new" | "planned" | "in_progress" | "shipped" | "wontfix" | "duplicate";
type FeedbackPriority = "low" | "medium" | "high" | "critical";

interface FeedbackItemSnapshot {
  id: string;
  status: string;
  priority: string;
  assigneeId: string | null;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface FeedbackStatusControlsProps {
  item: FeedbackItemSnapshot;
  users: UserOption[];
  isAdmin: boolean;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Status options (admin-gated)
// ---------------------------------------------------------------------------

const NON_ADMIN_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "new",         label: "New" },
  { value: "planned",     label: "Planned" },
  { value: "in_progress", label: "In Progress" },
];

const ADMIN_ONLY_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "shipped",   label: "Shipped" },
  { value: "wontfix",   label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

const ALL_STATUSES = [...NON_ADMIN_STATUSES, ...ADMIN_ONLY_STATUSES];

const PRIORITY_OPTIONS: { value: FeedbackPriority; label: string }[] = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

// Statuses that require a confirm dialog
const CONFIRM_STATUSES: FeedbackStatus[] = ["shipped", "wontfix", "duplicate"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackStatusControls({
  item,
  users,
  isAdmin,
  currentUserId,
}: FeedbackStatusControlsProps) {
  const statusOptions = isAdmin ? ALL_STATUSES : NON_ADMIN_STATUSES;

  // Optimistic state
  const [optStatus, setOptStatus] = useOptimistic(item.status);
  const [optPriority, setOptPriority] = useOptimistic(item.priority);
  const [optAssigneeId, setOptAssigneeId] = useOptimistic(item.assigneeId);
  const [, startTransition] = useTransition();

  // Error banner
  const [error, setError] = useState<string | null>(null);

  // Confirm dialog state for terminal statuses
  const [confirmStatus, setConfirmStatus] = useState<FeedbackStatus | null>(null);
  const [shipNote, setShipNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleStatusChange(value: string | null) {
    if (!value) return;
    const newStatus = value as FeedbackStatus;
    if (CONFIRM_STATUSES.includes(newStatus)) {
      setConfirmStatus(newStatus);
      setShipNote("");
      setConfirmOpen(true);
      return;
    }
    applyStatusChange(newStatus);
  }

  function applyStatusChange(newStatus: FeedbackStatus, note?: string) {
    const prevStatus = optStatus as FeedbackStatus;
    setError(null);
    startTransition(async () => {
      setOptStatus(newStatus);
      try {
        await updateFeedbackStatus(item.id, newStatus, note);
      } catch (err) {
        setOptStatus(prevStatus);
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  function handleConfirmStatusChange() {
    if (!confirmStatus) return;
    setConfirmOpen(false);
    applyStatusChange(confirmStatus, confirmStatus === "shipped" ? shipNote : undefined);
    setConfirmStatus(null);
  }

  function handlePriorityChange(value: string | null) {
    if (!value) return;
    const newPriority = value as FeedbackPriority;
    const prevPriority = optPriority as FeedbackPriority;
    setError(null);
    startTransition(async () => {
      setOptPriority(newPriority);
      try {
        await updateFeedbackItem(item.id, { priority: newPriority });
      } catch (err) {
        setOptPriority(prevPriority);
        setError(err instanceof Error ? err.message : "Failed to update priority");
      }
    });
  }

  function handleAssigneeChange(value: string | null) {
    const newAssigneeId = (!value || value === "unassigned") ? null : value;
    const prevAssigneeId = optAssigneeId;
    setError(null);
    startTransition(async () => {
      setOptAssigneeId(newAssigneeId);
      try {
        await updateFeedbackItem(item.id, { assigneeId: newAssigneeId });
      } catch (err) {
        setOptAssigneeId(prevAssigneeId);
        setError(err instanceof Error ? err.message : "Failed to update assignee");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const assigneeName =
    users.find((u) => u.id === optAssigneeId)?.name ??
    users.find((u) => u.id === optAssigneeId)?.email ??
    "Unassigned";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </label>
        <Select value={optStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {statusOptions.find((o) => o.value === optStatus)?.label ?? optStatus}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NON_ADMIN_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {isAdmin && (
              <>
                {ADMIN_ONLY_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Priority
        </label>
        <Select value={optPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {PRIORITY_OPTIONS.find((o) => o.value === optPriority)?.label ?? optPriority}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assignee
        </label>
        <Select
          value={optAssigneeId ?? "unassigned"}
          onValueChange={handleAssigneeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {assigneeName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name ?? user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Confirm dialog for terminal status changes */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
          <Dialog.Popup
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
              "rounded-2xl border border-border bg-card shadow-2xl p-5",
              "transition-all duration-150",
              "data-ending-style:opacity-0 data-ending-style:scale-95",
              "data-starting-style:opacity-0 data-starting-style:scale-95"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <Dialog.Title className="text-base font-semibold">
                {confirmStatus === "shipped"
                  ? "Mark as Shipped?"
                  : confirmStatus === "wontfix"
                  ? "Mark as Won't Fix?"
                  : "Mark as Duplicate?"}
              </Dialog.Title>
              <Dialog.Close
                className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              {confirmStatus === "shipped" ? (
                "This will notify the reporter by email. You can add an optional note."
              ) : (
                "Are you sure? This will mark the item as resolved."
              )}
            </Dialog.Description>

            {confirmStatus === "shipped" && (
              <textarea
                value={shipNote}
                onChange={(e) => setShipNote(e.target.value)}
                rows={2}
                placeholder="Optional ship note (e.g. 'Deployed in v1.3')…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none mb-4"
              />
            )}

            <div className="flex gap-2 justify-end">
              <Dialog.Close
                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </Dialog.Close>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
