import { getInboxPhotos } from "@/lib/photo-queries";
import { db } from "@/db/client";
import { deals } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PhotoInbox } from "@/components/photo-inbox";

export const dynamic = "force-dynamic";

export default async function PhotoInboxPage() {
  const [photos, dealRows] = await Promise.all([
    getInboxPhotos(),
    db
      .select({ id: deals.id, address: deals.address })
      .from(deals)
      .orderBy(desc(deals.createdAt))
      .limit(50),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Photo Inbox</h1>
        {photos.length > 0 && (
          <span className="text-sm text-muted-foreground rounded-full bg-muted px-2.5 py-0.5 tabular-nums">
            {photos.length}
          </span>
        )}
      </div>
      <PhotoInbox photos={photos} deals={dealRows} />
    </div>
  );
}
