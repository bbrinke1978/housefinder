"use client";

import { useState, useTransition } from "react";
import { Mail, MailX, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { enrollLeadInSequence, unenrollLead } from "@/lib/enrollment-actions";
import type { EmailSequenceSummary, EnrollmentWithDetails } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface EnrollButtonProps {
  leadId: string;
  hasEmail: boolean;
  currentEnrollment: EnrollmentWithDetails | null;
  sequences: EmailSequenceSummary[];
}

export function EnrollButton({
  leadId,
  hasEmail,
  currentEnrollment,
  sequences,
}: EnrollButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localEnrollment, setLocalEnrollment] =
    useState<EnrollmentWithDetails | null>(currentEnrollment);

  const activeSequences = sequences.filter((s) => s.isActive);

  function handleEnroll(sequenceId: string, sequenceName: string) {
    setOpen(false);
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await enrollLeadInSequence(leadId, sequenceId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccessMsg(`Enrolled in "${sequenceName}" — Step 1 sent`);
        // Optimistic update: create a stub enrollment for the UI
        setLocalEnrollment({
          id: "pending",
          leadId,
          ownerName: null,
          address: "",
          city: "",
          currentStep: 0,
          totalSteps: activeSequences.find((s) => s.id === sequenceId)?.stepCount ?? 0,
          status: "active",
          nextSendAt: null,
          enrolledAt: new Date(),
        });
      }
    });
  }

  function handleUnenroll() {
    if (!localEnrollment || localEnrollment.id === "pending") return;
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await unenrollLead(localEnrollment.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setLocalEnrollment(null);
        setSuccessMsg("Unenrolled successfully");
      }
    });
  }

  // State 1: No email
  if (!hasEmail) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-50">
          <MailX className="h-3.5 w-3.5" />
          No Email — Cannot Enroll
        </Button>
        <span className="text-xs text-muted-foreground">
          Add email on Contact tab to enable enrollment
        </span>
      </div>
    );
  }

  // State 3: Currently enrolled
  if (localEnrollment && localEnrollment.status === "active") {
    const nextSendLabel = localEnrollment.nextSendAt
      ? `Next send ${formatDistanceToNow(new Date(localEnrollment.nextSendAt), { addSuffix: true })}`
      : "No more steps";

    const stepLabel =
      localEnrollment.totalSteps > 0
        ? `Step ${localEnrollment.currentStep + 1}/${localEnrollment.totalSteps}`
        : "Active";

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="gap-1.5 text-xs border-primary/30 text-primary bg-primary/5"
          >
            <Mail className="h-3 w-3" />
            {stepLabel} — {nextSendLabel}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnenroll}
            disabled={isPending || localEnrollment.id === "pending"}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <MailX className="h-3 w-3" />
            )}
            Unenroll
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // State 2: Has email, not enrolled — show sequence dropdown
  return (
    <div className="space-y-2">
      <div className="relative inline-block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending || activeSequences.length === 0}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {isPending ? "Enrolling..." : "Enroll in Sequence"}
          {!isPending && <ChevronDown className="h-3 w-3 ml-0.5" />}
        </Button>

        {open && activeSequences.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-md border border-border bg-popover shadow-lg">
            <div className="p-1">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Select Sequence
              </p>
              {activeSequences.map((seq) => (
                <button
                  key={seq.id}
                  type="button"
                  onClick={() => handleEnroll(seq.id, seq.name)}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  <span className="truncate">{seq.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {seq.stepCount} steps
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSequences.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Create a sequence in Campaigns first
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {successMsg && <p className="text-xs text-emerald-600">{successMsg}</p>}
    </div>
  );
}
