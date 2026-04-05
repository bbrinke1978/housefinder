"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Megaphone } from "lucide-react";
import type { DealWithBuyer } from "@/types";

interface DealBlastGeneratorProps {
  deal: DealWithBuyer;
  coverPhotoSasUrl?: string | null;
}

const BLAST_STATUSES = [
  "under_contract",
  "marketing",
  "assigned",
  "closing",
];

function fmt(n: number | null | undefined): string {
  if (n == null) return "TBD";
  return "$" + n.toLocaleString();
}

function buildBlast(deal: DealWithBuyer, photoUrl: string): string {
  const lines: string[] = [
    "DEAL AVAILABLE - Cash Buyers Only",
    "",
    `Address: ${deal.address}, ${deal.city}, UT`,
    `Price: ${fmt(deal.offerPrice)}`,
    `ARV: ${fmt(deal.arv)}`,
    `Repairs: ${fmt(deal.repairEstimate)}`,
    `Assignment Fee: ${fmt(deal.assignmentFee)}`,
    `Closing: ${deal.closingDate ?? "TBD"}`,
  ];

  if (photoUrl.trim()) {
    lines.push(`Photos: ${photoUrl.trim()}`);
  }

  lines.push("");
  lines.push("Contact for access and details.");

  return lines.join("\n");
}

export function DealBlastGenerator({ deal, coverPhotoSasUrl }: DealBlastGeneratorProps) {
  const [photoUrl, setPhotoUrl] = useState(coverPhotoSasUrl ?? "");
  const [copied, setCopied] = useState(false);

  const canBlast = BLAST_STATUSES.includes(deal.status);

  async function handleCopy() {
    const text = buildBlast(deal, photoUrl);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select textarea text
    }
  }

  const blastText = canBlast ? buildBlast(deal, photoUrl) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Deal Blast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canBlast ? (
          <p className="text-sm text-muted-foreground">
            Move deal to{" "}
            <span className="font-medium text-foreground">Under Contract</span>{" "}
            to generate a deal blast.
          </p>
        ) : (
          <>
            <div>
              <Label htmlFor="photoUrl">Photo URL (optional)</Label>
              <Input
                id="photoUrl"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://drive.google.com/... or imgur link"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-populated from cover photo. Override with a Google Drive or Imgur link if needed.
              </p>
            </div>

            <div>
              <Label>Blast Text</Label>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted px-3 py-2 text-sm font-mono leading-relaxed">
                {blastText}
              </pre>
            </div>

            <Button onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
