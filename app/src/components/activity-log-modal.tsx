"use client";

/**
 * ActivityLogModal — unified Log Activity modal
 *
 * Type selector (Call/Email/Text/Meeting/Voicemail/Note) at top.
 * Per-type fields rendered below.
 * Submits via logActivity server action.
 *
 * Uses @base-ui/react/dialog (same pattern as FloatingReportButton / Phase 28).
 */

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  Voicemail,
  StickyNote,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/activity-actions";
import type { LogActivityInput } from "@/lib/activity-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityType = "call" | "email" | "text" | "meeting" | "voicemail" | "note";
type CallOutcome =
  | "answered"
  | "voicemail"
  | "no_answer"
  | "wrong_number"
  | "disconnected";

interface ActivityLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  leadId: string;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Type config
// ---------------------------------------------------------------------------

const TYPES: {
  value: ActivityType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "call", label: "Call", icon: <Phone className="h-4 w-4" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "text", label: "Text", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "meeting", label: "Meeting", icon: <Users className="h-4 w-4" /> },
  { value: "voicemail", label: "Voicemail", icon: <Voicemail className="h-4 w-4" /> },
  { value: "note", label: "Note", icon: <StickyNote className="h-4 w-4" /> },
];

const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: "answered", label: "Answered" },
  { value: "voicemail", label: "Went to voicemail" },
  { value: "no_answer", label: "No answer" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "disconnected", label: "Disconnected" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityLogModal({
  open,
  onOpenChange,
  propertyId: _propertyId,
  leadId,
  onSuccess,
}: ActivityLogModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [emailSubject, setEmailSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setActivityType("call");
    setOutcome("");
    setEmailSubject("");
    setNotes("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function validate(): string | null {
    if (activityType === "note" && notes.trim().length === 0) {
      return "Note text is required";
    }
    if (activityType === "call" && !outcome) {
      return "Please select a call outcome";
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    const input: LogActivityInput = {
      leadId,
      type: activityType,
      notes: notes.trim() || undefined,
      outcome: activityType === "call" && outcome ? (outcome as CallOutcome) : undefined,
      emailSubject: activityType === "email" && emailSubject.trim() ? emailSubject.trim() : undefined,
    };

    startTransition(async () => {
      try {
        await logActivity(input);
        handleOpenChange(false);
        onSuccess?.();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to log activity");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150"
        />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-card shadow-2xl",
            "max-h-[90vh] flex flex-col overflow-y-auto",
            "transition-all duration-150",
            "data-ending-style:opacity-0 data-ending-style:scale-95",
            "data-starting-style:opacity-0 data-starting-style:scale-95",
            "p-5"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-foreground">
              Log Activity
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Type selector — 3x2 grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Activity type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setActivityType(t.value);
                      setError(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors",
                      activityType === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields */}

            {/* Call: outcome dropdown */}
            {activityType === "call" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Outcome <span className="text-destructive">*</span>
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as CallOutcome | "")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select outcome...</option>
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email: subject input */}
            {activityType === "email" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  maxLength={500}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {/* Notes textarea — all types */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Notes
                {activityType === "note" && (
                  <span className="text-destructive"> *</span>
                )}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  activityType === "voicemail"
                    ? "Transcript or summary..."
                    : activityType === "note"
                    ? "Observation or note..."
                    : "Notes (optional)..."
                }
                rows={3}
                maxLength={5000}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Dialog.Close
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
                  "hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isPending && "opacity-60 cursor-not-allowed"
                )}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Log Activity
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
