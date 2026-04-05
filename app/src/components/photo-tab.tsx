"use client";

import { PhotoUpload } from "@/components/photo-upload";
import { PhotoGallery } from "@/components/photo-gallery";
import type { PhotoWithSasUrl } from "@/lib/photo-queries";

interface PhotoTabProps {
  photos: PhotoWithSasUrl[];
  dealId: string;
}

export function PhotoTab({ photos, dealId }: PhotoTabProps) {
  return (
    <div className="space-y-6">
      <PhotoUpload dealId={dealId} />
      <PhotoGallery photos={photos} dealId={dealId} canManage={true} />
    </div>
  );
}
