import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBuyersForList, getAllBuyerTags } from "@/lib/buyer-queries";
import { BuyersListTable } from "@/components/buyers-list-table";
import { Users } from "lucide-react";
import { sessionCan } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface BuyersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuyersPage({ searchParams }: BuyersPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  const filters = {
    search: typeof params.search === "string" ? params.search : undefined,
    tag: typeof params.tag === "string" ? params.tag : undefined,
    status:
      typeof params.status === "string" &&
      (params.status === "active" ||
        params.status === "inactive" ||
        params.status === "all")
        ? (params.status as "active" | "inactive" | "all")
        : "active",
    targetArea:
      typeof params.targetArea === "string" ? params.targetArea : undefined,
    fundingType:
      typeof params.fundingType === "string" ? params.fundingType : undefined,
  };

  const [buyers, tags] = await Promise.all([
    getBuyersForList(filters),
    getAllBuyerTags(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Buyers</h1>
          <p className="text-sm text-muted-foreground">
            {buyers.length === 0
              ? "No buyers yet"
              : `${buyers.length} buyer${buyers.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <BuyersListTable buyers={buyers} tags={tags} canCreateOrEditBuyer={sessionCan(session, "buyer.create_or_edit")} />
    </div>
  );
}
