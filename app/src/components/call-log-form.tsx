"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logCall, type LogCallResult } from "@/lib/analytics-actions";

interface CallLogFormProps {
  leads: { id: string; address: string }[];
}

const INITIAL_STATE: LogCallResult | null = null;

const OUTCOME_OPTIONS = [
  { value: "answered", label: "Answered" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No Answer" },
  { value: "wrong_number", label: "Wrong Number" },
];

export function CallLogForm({ leads }: CallLogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState<LogCallResult | null, FormData>(
    async (_prevState, formData) => {
      const result = await logCall(formData);
      if ("success" in result && result.success) {
        formRef.current?.reset();
      }
      return result;
    },
    INITIAL_STATE
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Lead select */}
      <div className="space-y-1.5">
        <Label htmlFor="leadId">Property / Lead</Label>
        <select
          id="leadId"
          name="leadId"
          required
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            Select a property...
          </option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.address}
            </option>
          ))}
        </select>
      </div>

      {/* Outcome */}
      <div className="space-y-1.5">
        <Label>Outcome</Label>
        <div className="flex flex-wrap gap-3">
          {OUTCOME_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="outcome"
                value={opt.value}
                required
                className="accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <Input
          id="source"
          name="source"
          placeholder="manual"
          defaultValue="manual"
          className="rounded-xl"
        />
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label htmlFor="durationMinutes">Duration (minutes)</Label>
        <Input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min="0"
          step="0.5"
          placeholder="e.g. 3.5"
          className="rounded-xl"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Optional notes about this call..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Feedback */}
      {state && "success" in state && state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          Call logged successfully.
        </p>
      )}
      {state && "error" in state && (
        <p className="text-sm text-red-500 font-medium">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving..." : "Log Call"}
      </Button>
    </form>
  );
}
