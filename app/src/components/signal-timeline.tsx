import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { DistressSignalRow, SignalType } from "@/types";

interface SignalTimelineProps {
  signals: DistressSignalRow[];
}

const signalTypeLabels: Record<SignalType, string> = {
  nod: "Notice of Default",
  tax_lien: "Tax Lien",
  lis_pendens: "Lis Pendens",
  probate: "Probate",
  code_violation: "Code Violation",
  vacant: "Vacant",
};

export function SignalTimeline({ signals }: SignalTimelineProps) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No distress signals recorded
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

      {signals.map((signal) => (
        <div key={signal.id} className="relative flex gap-4 py-3">
          {/* Dot on the timeline */}
          <div
            className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background ${
              signal.status === "active"
                ? "bg-red-500"
                : "bg-green-500"
            }`}
            style={{ marginLeft: "5.5px" }}
          />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">
                {signalTypeLabels[signal.signalType] ?? signal.signalType}
              </span>
              <Badge
                variant={
                  signal.status === "active" ? "destructive" : "secondary"
                }
              >
                {signal.status === "active" ? "Active" : "Resolved"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {signal.recordedDate && (
                <span>
                  Recorded: {format(new Date(signal.recordedDate), "MMM d, yyyy")}
                </span>
              )}
              <span>
                Added: {format(new Date(signal.createdAt), "MMM d, yyyy")}
              </span>
              {signal.resolvedAt && (
                <span>
                  Resolved: {format(new Date(signal.resolvedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>

            {signal.sourceUrl && (
              <a
                href={signal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Source
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
