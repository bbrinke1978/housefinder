import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getBuyerById,
  getBuyerTimeline,
  getBuyerDealInteractions,
  getAllBuyerTags,
} from "@/lib/buyer-queries";
import { BuyerDetailHeader } from "@/components/buyer-detail-header";
import { BuyerTimeline } from "@/components/buyer-timeline";
import { BuyerDealHistory } from "@/components/buyer-deal-history";

export const dynamic = "force-dynamic";

interface BuyerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuyerDetailPage({ params }: BuyerDetailPageProps) {
  const { id } = await params;

  const [buyer, timeline, interactions, allTags] = await Promise.all([
    getBuyerById(id),
    getBuyerTimeline(id),
    getBuyerDealInteractions(id),
    getAllBuyerTags(),
  ]);

  if (!buyer) {
    notFound();
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/buyers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Buyers
      </Link>

      {/* Profile header */}
      <BuyerDetailHeader buyer={buyer} allTags={allTags} />

      {/* Two-column layout on desktop, single column on mobile */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left / main: Communication Timeline */}
        <BuyerTimeline buyerId={buyer.id} entries={timeline} />

        {/* Right / sidebar: Deal History */}
        <BuyerDealHistory interactions={interactions} />
      </div>
    </div>
  );
}
