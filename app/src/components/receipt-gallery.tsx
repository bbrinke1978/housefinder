"use client";

import type { ReceiptRow } from "@/db/schema";

interface ReceiptWithSasUrl extends ReceiptRow {
  sasUrl: string;
}

interface ReceiptGalleryProps {
  receipts: ReceiptWithSasUrl[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  // receiptDate is a date string "YYYY-MM-DD"
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

function formatDollars(cents: number | null): string {
  if (cents === null) return "";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * ReceiptGallery — display receipt thumbnails in a responsive grid.
 * Clicking a thumbnail opens the full image in a new tab via SAS URL.
 * SAS URLs must be generated server-side and passed as props.
 */
export function ReceiptGallery({ receipts }: ReceiptGalleryProps) {
  if (receipts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No receipts uploaded yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {receipts.map((receipt) => (
        <a
          key={receipt.id}
          href={receipt.sasUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-lg border overflow-hidden hover:border-foreground/30 transition-colors"
        >
          <div className="aspect-square bg-muted relative overflow-hidden">
            <img
              src={receipt.sasUrl}
              alt={receipt.vendor ?? "Receipt"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
          <div className="p-2 space-y-0.5">
            {receipt.vendor && (
              <p className="text-xs font-medium truncate">{receipt.vendor}</p>
            )}
            {receipt.receiptDate && (
              <p className="text-xs text-muted-foreground">
                {formatDate(receipt.receiptDate)}
              </p>
            )}
            {receipt.totalCents !== null && (
              <p className="text-xs font-medium text-foreground">
                {formatDollars(receipt.totalCents)}
              </p>
            )}
            {!receipt.vendor && !receipt.receiptDate && receipt.totalCents === null && (
              <p className="text-xs text-muted-foreground">Receipt</p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
