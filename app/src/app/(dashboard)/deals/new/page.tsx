import { db } from "@/db/client";
import { ownerContacts } from "@/db/schema";
import { eq, and, isNotNull, not, like } from "drizzle-orm";
import { getPropertyDetail } from "@/lib/queries";
import { getTracerfyStatus } from "@/lib/tracerfy-actions";
import { NewDealForm } from "@/components/new-deal-form";

export const dynamic = "force-dynamic";

interface NewDealPageProps {
  searchParams: Promise<{ propertyId?: string }>;
}

export default async function NewDealPage({ searchParams }: NewDealPageProps) {
  const { propertyId } = await searchParams;

  let prefill: {
    address?: string;
    city?: string;
    sellerName?: string;
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
      prefill = {
        address: property.address,
        city: property.city,
        sellerName: property.ownerName ?? undefined,
        propertyId: property.id,
      };

      // Check if this property has any real phone or email contacts
      // (exclude MAILING: prefixed emails and null values)
      const contacts = await db
        .select({ phone: ownerContacts.phone, email: ownerContacts.email })
        .from(ownerContacts)
        .where(eq(ownerContacts.propertyId, propertyId));

      const hasPhone = contacts.some(
        (c) => c.phone && c.phone.trim() !== "" && !c.phone.startsWith("MAILING:")
      );
      const hasEmail = contacts.some(
        (c) => c.email && c.email.trim() !== "" && !c.email.startsWith("MAILING:")
      );

      hasContacts = hasPhone || hasEmail;
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
