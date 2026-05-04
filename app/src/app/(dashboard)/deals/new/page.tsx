import { db } from "@/db/client";
import { ownerContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPropertyDetail, getInboundLead } from "@/lib/queries";
import { getTracerfyStatus } from "@/lib/tracerfy-actions";
import { NewDealForm } from "@/components/new-deal-form";

export const dynamic = "force-dynamic";

interface NewDealPageProps {
  searchParams: Promise<{ propertyId?: string; leadId?: string }>;
}

export default async function NewDealPage({ searchParams }: NewDealPageProps) {
  const { propertyId, leadId } = await searchParams;

  let prefill: {
    address?: string;
    city?: string;
    sellerName?: string;
    sellerPhone?: string;
    propertyId?: string;
  } | undefined;

  let hasContacts = true; // default: assume contacts exist (no dialog)
  let tracerfyConfigured = false;

  if (propertyId) {
    const [property, tracerfyStatus] = await Promise.all([
      getPropertyDetail(propertyId),
      getTracerfyStatus(),
    ]);

    tracerfyConfigured = tracerfyStatus.configured;

    if (property) {
      // Pre-fill the seller phone from owner_contacts so the form shows
      // the same number that createDeal would auto-resolve on submit.
      // Manual entries (source 'manual', 'manual-1', 'manual-2', ...) win
      // over Tracerfy results, then fall back to the most recent record.
      const contacts = await db
        .select({
          phone: ownerContacts.phone,
          email: ownerContacts.email,
          source: ownerContacts.source,
          isManual: ownerContacts.isManual,
          createdAt: ownerContacts.createdAt,
        })
        .from(ownerContacts)
        .where(eq(ownerContacts.propertyId, propertyId));

      const realPhones = contacts
        .filter((c) => c.phone && c.phone.trim() !== "" && !c.phone.startsWith("MAILING:"));
      // Prefer manual (most-recent first), then any other real phone.
      const sortedPhones = realPhones.sort((a, b) => {
        if (a.isManual !== b.isManual) return a.isManual ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      const primaryPhone = sortedPhones[0]?.phone ?? undefined;

      prefill = {
        address: property.address ?? undefined,
        city: property.city ?? undefined,
        sellerName: property.ownerName ?? undefined,
        sellerPhone: primaryPhone,
        propertyId: property.id,
      };

      const hasPhone = realPhones.length > 0;
      const hasEmail = contacts.some(
        (c) => c.email && c.email.trim() !== "" && !c.email.startsWith("MAILING:")
      );

      hasContacts = hasPhone || hasEmail;
    }
  } else if (leadId) {
    // Inbound-lead prefill (voicemail / website form): no property exists yet,
    // pull contact + address from the lead notes blob.
    const lead = await getInboundLead(leadId);
    if (lead) {
      prefill = {
        address: lead.address ?? undefined,
        city: lead.city ?? undefined,
        sellerName: lead.name ?? undefined,
        sellerPhone: lead.phone ?? undefined,
      };
      hasContacts = !!(lead.phone || lead.address);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">New Deal</h1>
      <NewDealForm
        prefill={prefill}
        hasContacts={hasContacts}
        tracerfyConfigured={tracerfyConfigured}
      />
    </div>
  );
}
