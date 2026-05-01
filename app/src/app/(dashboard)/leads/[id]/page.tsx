import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, MessageSquare, Clock } from "lucide-react";
import { getInboundLead } from "@/lib/queries";
import { BackButton } from "@/components/back-button";
import { LeadNotes } from "@/components/lead-notes";
import { InboundLeadStatusSelect } from "@/components/inbound-lead-status-select";
import { DeleteInboundLeadButton } from "@/components/delete-inbound-lead-button";
import { ActivityFeed } from "@/components/activity-feed";
import { getActivityFeedForLead } from "@/lib/activity-queries";
import { formatDateTimeFull } from "@/lib/format-date";
import type { LeadNote } from "@/types";

export const dynamic = "force-dynamic";

export default async function InboundLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, activityFeed] = await Promise.all([
    getInboundLead(id),
    getActivityFeedForLead(id).catch(() => []),
  ]);

  if (!lead) {
    notFound();
  }

  const isVoicemail = lead.leadSource === "voicemail";
  const badgeLabel = isVoicemail ? "Voicemail" : "Website";
  const badgeClass = isVoicemail
    ? "bg-teal-500/15 text-teal-600"
    : "bg-primary/10 text-primary";

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-600",
    contacted: "bg-amber-500/15 text-amber-600",
    follow_up: "bg-orange-500/15 text-orange-600",
    closed: "bg-green-500/15 text-green-600",
    dead: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <BackButton label="Dashboard" fallbackHref="/" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            {lead.name || "Unknown Caller"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 ${badgeClass}`}>
              {badgeLabel}
            </span>
            <span className={`text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 ${statusColors[lead.status] ?? statusColors.new}`}>
              {lead.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InboundLeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
          <DeleteInboundLeadButton
            leadId={lead.id}
            leadLabel={lead.name || lead.phone || "this lead"}
          />
        </div>
      </div>

      {/* Contact Info Card */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h2>
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${lead.phone}`} className="text-sm font-medium hover:underline">
              {lead.phone}
            </a>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">{lead.address}{lead.city ? `, ${lead.city}` : ""}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{formatDateTimeFull(lead.createdAt)}</p>
        </div>
      </div>

      {/* Message / Transcription */}
      {lead.message && (
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isVoicemail ? "Voicemail Transcription" : "Message"}
          </h2>
          <p className="text-sm whitespace-pre-wrap">{lead.message}</p>
        </div>
      )}

      {/* Notes write form */}
      <div className="rounded-xl border bg-card p-5">
        <LeadNotes
          leadId={lead.id}
          initialNotes={lead.notes as LeadNote[]}
        />
      </div>

      {/* Unified Activity Feed */}
      <div className="rounded-xl border bg-card p-5">
        <ActivityFeed
          propertyId=""
          leadId={lead.id}
          initialEntries={activityFeed}
          filter="all"
        />
      </div>
    </div>
  );
}
