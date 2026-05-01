import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPropertyDetail, getPropertySignals, getPropertyNotes, getOwnerContacts } from "@/lib/queries";
import { getLeadTimeline } from "@/lib/contact-event-queries";
import { getActivityFeed } from "@/lib/activity-queries";
import { getLeadActiveEnrollment, getSequences } from "@/lib/campaign-queries";
import { markLeadViewed, getActiveVacantFlag } from "@/lib/actions";
import { PropertyOverview } from "@/components/property-overview";
import { SignalTimeline } from "@/components/signal-timeline";
import { LeadNotes } from "@/components/lead-notes";
import { ContactTab } from "@/components/contact-tab";
import { FieldObservations } from "@/components/field-observations";
import { BackButton } from "@/components/back-button";
import { ActivityFeed } from "@/components/activity-feed";
import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, property, signals, contacts, vacantFlag] = await Promise.all([
    auth(),
    getPropertyDetail(id),
    getPropertySignals(id),
    getOwnerContacts(id),
    getActiveVacantFlag(id),
  ]);

  const canCreateDeal = sessionCan(session, "deal.create");
  const canRunTracerfy = sessionCan(session, "tracerfy.run");

  if (!property) {
    notFound();
  }

  const [notes, timeline, activeEnrollment, sequences, activityFeed] = await Promise.all([
    getPropertyNotes(property.leadId),
    getLeadTimeline(property.leadId),
    getLeadActiveEnrollment(property.leadId),
    getSequences(),
    getActivityFeed(id),
  ]);

  // Mark lead as viewed (clears "new" badge on dashboard)
  await markLeadViewed(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton label="Back" fallbackHref="/" />
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold md:text-2xl">
          {property.address?.trim() || `Parcel ${property.parcelId}`}
        </h1>
        {property.isHot && (
          <Badge variant="destructive" className="gap-1">
            <Flame className="h-3 w-3" />
            Hot Lead
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {property.city}, {property.state} {property.zip ?? ""}
      </p>

      <Tabs defaultValue="overview">
        <TabsList className="!flex !w-full !h-auto rounded-lg bg-muted p-1 gap-1 overflow-hidden flex-wrap">
          <TabsTrigger value="overview" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">Overview</TabsTrigger>
          <TabsTrigger value="signals" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">
            Signals
            {signals.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0">
                {signals.length > 9 ? "9+" : signals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">
            Activity
            {activityFeed.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0">
                {activityFeed.length > 9 ? "9+" : activityFeed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">
            Notes
            {notes.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0">
                {notes.length > 9 ? "9+" : notes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contact" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <PropertyOverview property={property} signals={signals} canCreateDeal={canCreateDeal} />
        </TabsContent>

        <TabsContent value="signals" className="mt-4">
          <SignalTimeline signals={signals} />
          <FieldObservations propertyId={id} isVacant={vacantFlag} signals={signals} />
        </TabsContent>

        {/* Activity tab — unified feed (all sources) */}
        <TabsContent value="activity" className="mt-4">
          <ActivityFeed
            propertyId={id}
            leadId={property.leadId}
            initialEntries={activityFeed}
            filter="all"
          />
        </TabsContent>

        {/* Notes tab — write form retained; display filtered to notes only */}
        <TabsContent value="notes" className="mt-4">
          <div className="space-y-6">
            <LeadNotes leadId={property.leadId} initialNotes={notes} />
            {activityFeed.filter((e) => e.source === "lead_note" || e.source === "deal_note").length > 0 && (
              <div className="border-t border-border pt-4">
                <ActivityFeed
                  propertyId={id}
                  leadId={property.leadId}
                  initialEntries={activityFeed}
                  filter="notes_only"
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <ContactTab
            ownerName={property.ownerName}
            ownerType={property.ownerType}
            propertyId={id}
            leadId={property.leadId}
            address={property.address}
            city={property.city}
            contacts={contacts}
            timeline={timeline}
            activeEnrollment={activeEnrollment}
            sequences={sequences}
            canRunTracerfy={canRunTracerfy}
            activityFeed={activityFeed}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
