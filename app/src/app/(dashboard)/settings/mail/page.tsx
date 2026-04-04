import { getMailSettings, saveMailSettings } from "@/lib/mail-settings-actions";
import { MailSettingsForm } from "@/components/mail-settings-form";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MailSettingsPage() {
  const mailSettings = await getMailSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">
              MAIL SETTINGS
            </span>
          </div>
          <p className="text-white/70 text-sm">
            Configure sender details and Resend API key for outreach emails.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <MailSettingsForm initialSettings={mailSettings} saveAction={saveMailSettings} />
      </div>
    </div>
  );
}
