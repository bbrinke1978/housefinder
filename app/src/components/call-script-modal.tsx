"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Phone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CALL_SCRIPTS,
  CALL_SCRIPT_LABELS,
} from "@/types";
import type { CallScriptType } from "@/types";
import { Button } from "@/components/ui/button";

interface CallScriptModalProps {
  /** Property owner's name (used to derive first name for merge fields) */
  ownerName: string | null;
  address: string;
  city: string;
  phone?: string | null;
  distressScore?: number;
}

const SCRIPT_TYPES: CallScriptType[] = [
  "acquisitions",
  "dispositions",
  "agent_partnership",
  "jv_partner",
  "objection_handling",
];

/** Resolve {senderName}, {city}, {address} merge fields from props */
function resolveScript(text: string, city: string, address: string): string {
  return text
    .replace(/\{senderName\}/g, "Your Name")
    .replace(/\{city\}/g, city)
    .replace(/\{address\}/g, address);
}

/** Build a plain-text version of all steps for clipboard copy */
function buildScriptText(
  scriptType: CallScriptType,
  city: string,
  address: string
): string {
  const steps = CALL_SCRIPTS[scriptType];
  return steps
    .map(
      (step) =>
        `[${step.label}]\n${resolveScript(step.text, city, address)}`
    )
    .join("\n\n");
}

export function CallScriptModal({
  ownerName,
  address,
  city,
  phone,
}: CallScriptModalProps) {
  const [open, setOpen] = useState(false);
  const [scriptType, setScriptType] = useState<CallScriptType>("acquisitions");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = buildScriptText(scriptType, city, address);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback: silently fail
      });
  }

  const steps = CALL_SCRIPTS[scriptType];

  return (
    <>
      {/* Trigger button — rendered inline near the phone number */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
      >
        <Phone className="h-3.5 w-3.5" />
        Call Script
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150"
          />
          <Dialog.Popup
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
              "rounded-2xl border border-border bg-card shadow-2xl",
              "max-h-[85vh] flex flex-col",
              "transition-all duration-150",
              "data-ending-style:opacity-0 data-ending-style:scale-95",
              "data-starting-style:opacity-0 data-starting-style:scale-95"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
              <div>
                <Dialog.Title className="text-base font-semibold text-foreground">
                  Call Script
                </Dialog.Title>
                {(ownerName || address) && (
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    {ownerName ? `${ownerName} · ` : ""}{address}, {city}
                    {phone && (
                      <> ·{" "}
                        <a
                          href={`tel:${phone}`}
                          className="text-primary underline hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {phone}
                        </a>
                      </>
                    )}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {/* Script type selector */}
            <div className="flex gap-1 flex-wrap px-5 pt-4 pb-2 flex-shrink-0">
              {SCRIPT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setScriptType(type);
                    setExpandedStep(null);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    scriptType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {CALL_SCRIPT_LABELS[type]}
                </button>
              ))}
            </div>

            {/* Script steps — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
              {steps.map((step, index) => {
                const isExpanded = expandedStep === index;
                const resolved = resolveScript(step.text, city, address);
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-muted/30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStep(isExpanded ? null : index)
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {step.label}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-3 pt-2">
                        <p className="text-sm text-foreground leading-relaxed">
                          {resolved}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer: copy button */}
            <div className="border-t border-border px-5 py-3 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy full script
                  </>
                )}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
