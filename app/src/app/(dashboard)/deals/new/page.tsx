import { getPropertyDetail } from "@/lib/queries";
import { NewDealForm } from "@/components/new-deal-form";

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

  if (propertyId) {
    const property = await getPropertyDetail(propertyId);
    if (property) {
      prefill = {
        address: property.address,
        city: property.city,
        sellerName: property.ownerName ?? undefined,
        propertyId: property.id,
      };
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">New Deal</h1>
      <NewDealForm prefill={prefill} />
    </div>
  );
}
