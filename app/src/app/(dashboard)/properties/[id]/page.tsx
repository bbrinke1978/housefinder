import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPropertyDetail, getPropertySignals, getPropertyNotes, getOwnerContacts } from "@/lib/queries";
import { markLeadViewed, getActiveVacantFlag } from "@/lib/actions";
import { PropertyOverview } from "@/components/property-overview";
import { SignalTimeline } from "@/components/signal-timeline";
import { LeadNotes } from "@/components/lead-notes";
import { ContactTab } from "@/components/contact-tab";
import { FieldObservations } from "@/components/field-observations";
import { BackButton } from "@/components/back-button";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [property, signals, contacts, vacantFlag] = await Promise.all([
    getPropertyDetail(id),
    getPropertySignals(id),
    getOwnerContacts(id),
    getActiveVacantFlag(id),
  ]);

  if (!property) {
    notFound();
  }

  const notes = await getPropertyNotes(property.leadId);

  // Mark lead as viewed (clears "new" badge on dashboard)
  await markLeadViewed(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton label="Back" fallbackHref="/" />
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold md:text-2xl">{property.address}</h1>
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
        <TabsList className="!flex !w-full !h-auto rounded-lg bg-muted p-1 gap-1 overflow-hidden">
          <TabsTrigger value="overview" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">Overview</TabsTrigger>
          <TabsTrigger value="signals" className="!h-auto !flex-1 rounded-md text-xs sm:text-sm py-2 px-2">
            Signals
            {signals.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex-shrink-0">
                {signals.length > 9 ? "9+" : signals.length}
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
          <PropertyOverview property={property} signals={signals} />
        </TabsContent>

        <TabsContent value="signals" className="mt-4">
          <SignalTimeline signals={signals} />
          <FieldObservations propertyId={id} isVacant={vacantFlag} signals={signals} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <LeadNotes leadId={property.leadId} initialNotes={notes} />
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <ContactTab ownerName={property.ownerName} ownerType={property.ownerType} propertyId={id} contacts={contacts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
