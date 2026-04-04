"use client";

import { useState, useTransition } from "react";
import type { MailSettings } from "@/types/index";

interface MailSettingsFormProps {
  initialSettings: MailSettings;
  saveAction: (
    formData: FormData
  ) => Promise<{ success: true } | { error: string }>;
}

type ActionState = { success: true } | { error: string } | null;

export function MailSettingsForm({
  initialSettings,
  saveAction,
}: MailSettingsFormProps) {
  const [state, setState] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveAction(formData);
      setState(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-6">
      {state && "success" in state && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          Mail settings saved successfully.
        </div>
      )}
      {state && "error" in state && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* From Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="fromName"
            className="text-sm font-medium text-foreground"
          >
            From Name
          </label>
          <input
            id="fromName"
            name="fromName"
            type="text"
            defaultValue={initialSettings.fromName}
            placeholder="Brian Smith"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Display name shown to recipients
          </p>
        </div>

        {/* From Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="fromEmail"
            className="text-sm font-medium text-foreground"
          >
            From Email
          </label>
          <input
            id="fromEmail"
            name="fromEmail"
            type="email"
            defaultValue={initialSettings.fromEmail}
            placeholder="brian@yourdomain.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Must be verified in Resend dashboard
          </p>
        </div>

        {/* Reply-To Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="replyTo"
            className="text-sm font-medium text-foreground"
          >
            Reply-To Email
          </label>
          <input
            id="replyTo"
            name="replyTo"
            type="email"
            defaultValue={initialSettings.replyTo}
            placeholder="brian@youremail.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Where seller replies will be delivered
          </p>
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="text-sm font-medium text-foreground"
          >
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialSettings.phone}
            placeholder="(435) 555-0100"
            maxLength={20}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Used as the {"{phone}"} merge field in email templates
          </p>
        </div>
      </div>

      {/* Resend API Key */}
      <div className="space-y-1.5">
        <label
          htmlFor="resendApiKey"
          className="text-sm font-medium text-foreground"
        >
          Resend API Key
        </label>
        <input
          id="resendApiKey"
          name="resendApiKey"
          type="password"
          defaultValue={initialSettings.resendApiKey}
          placeholder="re_••••••••••••••••••••"
          maxLength={200}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          Used for outreach emails. System alerts use the server environment key.
          Get your key at{" "}
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            resend.com/api-keys
          </a>
        </p>
      </div>

      {/* Email Signature */}
      <div className="space-y-1.5">
        <label
          htmlFor="signature"
          className="text-sm font-medium text-foreground"
        >
          Email Signature
        </label>
        <textarea
          id="signature"
          name="signature"
          rows={5}
          defaultValue={initialSettings.signature}
          placeholder={`--\n{senderName}\nReal Estate Investor\n{phone}`}
          maxLength={2000}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-xs leading-relaxed resize-y"
        />
        <p className="text-[11px] text-muted-foreground">
          Appended to all outreach emails. Supports {"{senderName}"} and{" "}
          {"{phone}"} merge fields.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : "Save Mail Settings"}
        </button>
      </div>
    </form>
  );
}
