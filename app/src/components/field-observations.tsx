"use client";

import { useState, useTransition } from "react";
import { setVacantFlag, addManualSignal } from "@/lib/actions";

interface FieldObservationsProps {
  propertyId: string;
  isVacant: boolean;
  signals: Array<{ signalType: string; status: string }>;
}

export function FieldObservations({
  propertyId,
  isVacant,
  signals,
}: FieldObservationsProps) {
  const [vacant, setVacant] = useState(isVacant);
  const [isPendingVacant, startVacantTransition] = useTransition();

  const [signalType, setSignalType] = useState<"probate" | "code_violation">(
    "probate"
  );
  const [notes, setNotes] = useState("");
  const [isPendingSignal, startSignalTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasActiveProbate = signals.some(
    (s) => s.signalType === "probate" && s.status === "active"
  );
  const hasActiveCodeViolation = signals.some(
    (s) => s.signalType === "code_violation" && s.status === "active"
  );

  const isAddDisabled =
    (signalType === "probate" && hasActiveProbate) ||
    (signalType === "code_violation" && hasActiveCodeViolation);

  function handleVacantToggle(checked: boolean) {
    setVacant(checked);
    startVacantTransition(async () => {
      try {
        await setVacantFlag(propertyId, checked);
      } catch (err) {
        // Revert on failure
        setVacant(!checked);
      }
    });
  }

  function handleAddSignal() {
    setError(null);
    startSignalTransition(async () => {
      try {
        await addManualSignal(propertyId, signalType, notes || undefined);
        setNotes("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add signal"
        );
      }
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 mt-4">
      <h3 className="text-sm font-semibold">Field Observations</h3>

      {/* Vacant Toggle */}
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={vacant}
            onChange={(e) => handleVacantToggle(e.target.checked)}
            disabled={isPendingVacant}
            className="rounded border-gray-300"
          />
          <span>Mark as Vacant</span>
          {isPendingVacant && (
            <span className="text-xs text-muted-foreground">(saving...)</span>
          )}
        </label>
        <p className="text-xs text-muted-foreground ml-6">
          Flag this property as vacant based on field observation (e.g.,
          drive-by)
        </p>
      </div>

      {/* Manual Signal Entry */}
      <div className="space-y-2 border-t pt-3">
        <h4 className="text-sm font-medium">Add Manual Signal</h4>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Signal Type
            </label>
            <select
              value={signalType}
              onChange={(e) =>
                setSignalType(
                  e.target.value as "probate" | "code_violation"
                )
              }
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isPendingSignal}
            >
              <option value="probate">Probate Filing</option>
              <option value="code_violation">Code Violation</option>
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., XChange Case ES-2026-001234"
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isPendingSignal}
            />
          </div>

          <button
            type="button"
            onClick={handleAddSignal}
            disabled={isPendingSignal || isAddDisabled}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {isPendingSignal ? "Adding..." : "Add Signal"}
          </button>
        </div>

        {isAddDisabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Active {signalType === "probate" ? "probate" : "code violation"}{" "}
            signal already exists
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
