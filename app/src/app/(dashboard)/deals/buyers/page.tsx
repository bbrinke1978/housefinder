import { getBuyers } from "@/lib/deal-queries";
import { BuyerList } from "@/components/buyer-list";
import { BuyerIntakeForm } from "@/components/buyer-intake-form";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyersPage() {
  const buyers = await getBuyers();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Buyer Database</h1>
          <p className="text-sm text-muted-foreground">
            {buyers.length === 0
              ? "No active buyers"
              : `${buyers.length} active buyer${buyers.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <BuyerList buyers={buyers} />

      <BuyerIntakeForm />
    </div>
  );
}
