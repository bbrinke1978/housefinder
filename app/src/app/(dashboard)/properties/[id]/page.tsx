import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPropertyDetail, getPropertySignals, getPropertyNotes, getOwnerContacts } from "@/lib/queries";
import { markLeadViewed, getActiveVacantFlag } from "@/lib/actions";
import { PropertyOverview } from "@/components/property-overview";
import { SignalTimeline } from "@/components/signal-timeline";
import { LeadNotes } from "@/components/lead-notes";
import { ContactTab } from "@/components/contact-tab";
import { FieldObservations } from "@/components/field-observations";

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
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">
            Signals ({signals.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
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
