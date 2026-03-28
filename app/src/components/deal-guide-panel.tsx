"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStageGuide } from "@/lib/wholesaling-guide";
import type { DealStatus } from "@/types";

interface DealGuidePanelProps {
  status: DealStatus;
}

export function DealGuidePanel({ status }: DealGuidePanelProps) {
  const [open, setOpen] = useState(false);
  const guide = getStageGuide(status);

  if (!guide) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Stage Guide — {guide.title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{guide.description}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Criteria */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Criteria to be here
              </h4>
              <ul className="space-y-1">
                {guide.criteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Steps */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Next steps
              </h4>
              <ol className="space-y-1">
                {guide.nextSteps.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 font-medium text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Script */}
          {guide.script && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Script
              </h4>
              <div className="rounded-md border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600 px-4 py-3">
                <pre className="whitespace-pre-wrap text-sm font-mono text-blue-900 dark:text-blue-200 leading-relaxed">
                  {guide.script}
                </pre>
              </div>
            </div>
          )}

          {/* Checklist */}
          {guide.checklist && guide.checklist.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Checklist
              </h4>
              <ul className="space-y-1.5">
                {guide.checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      readOnly
                      tabIndex={-1}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {guide.tips && guide.tips.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Pro tips
              </h4>
              <ul className="space-y-1">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 text-amber-500">★</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
