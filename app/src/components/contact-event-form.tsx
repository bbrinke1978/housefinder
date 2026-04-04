"use client";

import { useActionState } from "react";
import { logContactEvent } from "@/lib/contact-event-actions";
import type { LogContactEventResult } from "@/lib/contact-event-actions";
import { CONTACT_EVENT_LABELS } from "@/types";
import type { ContactEventType } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Phone } from "lucide-react";

interface ContactEventFormProps {
  leadId: string;
}

const EVENT_TYPE_OPTIONS = Object.entries(CONTACT_EVENT_LABELS) as [
  ContactEventType,
  string,
][];

export function ContactEventForm({ leadId }: ContactEventFormProps) {
  const [state, formAction, isPending] = useActionState<
    LogContactEventResult | null,
    FormData
  >(logContactEvent, null);

  return (
    <form action={formAction} className="space-y-3">
      {/* Hidden lead ID */}
      <input type="hidden" name="leadId" value={leadId} />

      {/* Event type select */}
      <div className="space-y-1.5">
        <label
          htmlFor="eventType"
          className="text-sm font-medium text-foreground"
        >
          Contact type
        </label>
        <select
          id="eventType"
          name="eventType"
          required
          defaultValue=""
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          disabled={isPending}
        >
          <option value="" disabled>
            Select contact type...
          </option>
          {EVENT_TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Optional notes */}
      <div className="space-y-1.5">
        <label
          htmlFor="contactNotes"
          className="text-sm font-medium text-foreground"
        >
          Notes{" "}
          <span className="text-xs text-muted-foreground font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="contactNotes"
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="What happened on this contact attempt?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          disabled={isPending}
        />
      </div>

      {/* Feedback */}
      {state && "success" in state && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Contact event logged successfully.
        </div>
      )}
      {state && "error" in state && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {state.error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
      >
        <Phone className="h-4 w-4 mr-2" />
        {isPending ? "Logging..." : "Log Contact Event"}
      </Button>
    </form>
  );
}
