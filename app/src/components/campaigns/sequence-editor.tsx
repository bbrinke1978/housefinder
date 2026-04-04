"use client";

import { useState, useTransition } from "react";
import { createSequence, updateSequence } from "@/lib/campaign-actions";
import { DEFAULT_SEQUENCE_DELAY_DAYS } from "@/types/index";
import type { EmailSequenceRow, EmailStepRow } from "@/db/schema";

interface StepDraft {
  stepNumber: number;
  delayDays: number;
  subject: string;
  bodyHtml: string;
}

interface SequenceEditorProps {
  /** Existing sequence data for edit mode (omit for create mode) */
  sequence?: EmailSequenceRow;
  steps?: EmailStepRow[];
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
}

// Buyer intake sequence template — 5 steps matching Brian's Day 1/3/7/14/30 cadence
const DEFAULT_STEPS: StepDraft[] = [
  {
    stepNumber: 1,
    delayDays: DEFAULT_SEQUENCE_DELAY_DAYS[0], // Day 1
    subject: "Quick question about your property at {address}",
    bodyHtml: `Hi {firstName},

I came across your property at {address} in {city} and wanted to reach out.

I'm a local investor looking to purchase properties in the area for cash, as-is, with a fast close — no repairs, no commissions, no hassle.

Would you be open to a quick conversation to explore your options?

Best,
{senderName}
{phone}`,
  },
  {
    stepNumber: 2,
    delayDays: DEFAULT_SEQUENCE_DELAY_DAYS[1], // Day 3
    subject: "Following up — {address}",
    bodyHtml: `Hi {firstName},

Just following up on my previous message about {address}.

If you're considering your options, I'd love to make you a fair cash offer. No obligation, no pressure.

Are you still the owner? Happy to chat at your convenience.

Best,
{senderName}
{phone}`,
  },
  {
    stepNumber: 3,
    delayDays: DEFAULT_SEQUENCE_DELAY_DAYS[2], // Day 7
    subject: "Still interested in {address}",
    bodyHtml: `Hi {firstName},

I know you're busy, so I'll keep this brief.

I'm still very interested in {address}. If the timing isn't right now, I completely understand — but if things change, I'd love to connect.

A quick reply with "not interested" is totally fine too. Either way, I appreciate your time.

Best,
{senderName}
{phone}`,
  },
  {
    stepNumber: 4,
    delayDays: DEFAULT_SEQUENCE_DELAY_DAYS[3], // Day 14
    subject: "Last follow-up on {address}",
    bodyHtml: `Hi {firstName},

This will be my last follow-up on {address}.

If there's ever a time you'd like to explore a cash offer — whether that's now or down the road — feel free to reach out anytime.

Wishing you all the best.

{senderName}
{phone}`,
  },
  {
    stepNumber: 5,
    delayDays: DEFAULT_SEQUENCE_DELAY_DAYS[4], // Day 30
    subject: "Still here if you need me — {address}",
    bodyHtml: `Hi {firstName},

Just a quick check-in. I know it's been a while since I first reached out about {address}.

Circumstances change, and if you're ever ready to talk about selling, I'm still very interested and can move quickly.

No pressure — just want you to know the offer stands.

Best,
{senderName}
{phone}`,
  },
];

// Pre-built template options
const TEMPLATE_OPTIONS = [
  {
    id: "default",
    label: "Default Follow-Up Sequence (Day 1/3/7/14/30)",
    steps: DEFAULT_STEPS,
  },
  {
    id: "buyer_intake",
    label: "Buyer Intake — Build Buyers List",
    steps: [
      {
        stepNumber: 1,
        delayDays: 1,
        subject: "Building my buyers list — are you still buying in {city}?",
        bodyHtml: `Hey! I'm building my buyers list for off-market deals in {city} and the surrounding area.

What's your buy box?
- Cities / Areas
- Price Range
- Rehab Level (Light / Medium / Heavy / Tear Down)
- Cash or Financing
- Timeline to close

Reply back and I'll make sure to send you deals that match!

{senderName}
{phone}`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Following up — off-market deals in {city}",
        bodyHtml: `Hey {firstName},

Just wanted to follow up on my last message. I have deals coming through regularly in {city} and want to make sure the right buyers hear about them first.

If you're still actively buying, send me your criteria and I'll keep you posted.

{senderName}
{phone}`,
      },
    ],
  },
];

type ActionState = { success: true; id?: string } | { error: string } | null;

export function SequenceEditor({
  sequence,
  steps: initialSteps,
  onSuccess,
  onCancel,
}: SequenceEditorProps) {
  const isEdit = !!sequence;
  const [steps, setSteps] = useState<StepDraft[]>(
    initialSteps
      ? initialSteps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          subject: s.subject,
          bodyHtml: s.bodyHtml,
        }))
      : DEFAULT_STEPS
  );
  const [isActive, setIsActive] = useState(sequence?.isActive ?? true);
  const [state, setState] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();

  // Handle template selection
  const applyTemplate = (templateId: string) => {
    const template = TEMPLATE_OPTIONS.find((t) => t.id === templateId);
    if (template) setSteps(template.steps);
  };

  const addStep = () => {
    const maxStep = steps.reduce(
      (max, s) => Math.max(max, s.stepNumber),
      0
    );
    setSteps([
      ...steps,
      {
        stepNumber: maxStep + 1,
        delayDays: 0,
        subject: "",
        bodyHtml: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  };

  const updateStep = (
    index: number,
    field: keyof StepDraft,
    value: string | number
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("steps", JSON.stringify(steps));
    if (isEdit) formData.set("isActive", String(isActive));

    startTransition(async () => {
      const result = isEdit
        ? await updateSequence(formData)
        : await createSequence(formData);
      setState(result);
      if ("success" in result) {
        const id = "id" in result ? (result.id as string) : undefined;
        onSuccess?.(id);
      }
    });
  };

  const mergeFieldHint =
    "Merge fields: {firstName}, {address}, {city}, {senderName}, {phone}";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {state && "error" in state && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Sequence name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Sequence Name <span className="text-destructive">*</span>
        </label>
        <input
          name="name"
          defaultValue={sequence?.name ?? ""}
          required
          minLength={3}
          maxLength={100}
          placeholder="e.g. Seller Outreach — Pre-Foreclosure"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {isEdit && (
          <input type="hidden" name="sequenceId" value={sequence.id} />
        )}
      </div>

      {/* Active toggle (edit only) */}
      {isEdit && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Active</label>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isActive ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {isActive ? "Active — new leads can be enrolled" : "Inactive — enrollment disabled"}
          </span>
        </div>
      )}

      {/* Template quick-start (create only) */}
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Quick-start template
          </label>
          <select
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Email Steps ({steps.length})
          </h3>
          <button
            type="button"
            onClick={addStep}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            + Add Step
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">{mergeFieldHint}</p>

        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {step.stepNumber}
              </span>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="space-y-1 w-28">
                <label className="text-xs text-muted-foreground">
                  Send on Day
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={step.delayDays}
                  onChange={(e) =>
                    updateStep(i, "delayDays", parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={step.subject}
                  onChange={(e) => updateStep(i, "subject", e.target.value)}
                  placeholder="Subject line with {firstName} or {address}"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email Body</label>
              <textarea
                rows={6}
                value={step.bodyHtml}
                onChange={(e) => updateStep(i, "bodyHtml", e.target.value)}
                placeholder={`Email body — use ${mergeFieldHint.replace("Merge fields: ", "")}`}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? "Saving..."
            : isEdit
            ? "Save Changes"
            : "Create Sequence"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
