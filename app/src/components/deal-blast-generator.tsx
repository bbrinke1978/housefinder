"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Megaphone, Mail, AlertCircle, Loader2 } from "lucide-react";
import { sendDealBlast } from "@/lib/buyer-actions";
import type { DealWithBuyer, BuyerWithMatchInfo } from "@/types";

interface DealBlastGeneratorProps {
  deal: DealWithBuyer;
  dealId?: string;
  matchingBuyers?: BuyerWithMatchInfo[];
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

export function DealBlastGenerator({
  deal,
  dealId,
  matchingBuyers = [],
  coverPhotoSasUrl,
}: DealBlastGeneratorProps) {
  const [photoUrl, setPhotoUrl] = useState(coverPhotoSasUrl ?? "");
  const [copied, setCopied] = useState(false);

  // Email blast state
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<Set<string>>(
    () => new Set(matchingBuyers.filter((b) => b.isFullMatch).map((b) => b.id))
  );
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<{ sent: number; total: number } | null>(null);
  const [mailError, setMailError] = useState<string | null>(null);

  const canBlast = BLAST_STATUSES.includes(deal.status);
  const blastText = canBlast ? buildBlast(deal, photoUrl) : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(blastText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  function toggleBuyer(buyerId: string) {
    setSelectedBuyerIds((prev) => {
      const next = new Set(prev);
      if (next.has(buyerId)) {
        next.delete(buyerId);
      } else {
        next.add(buyerId);
      }
      return next;
    });
  }

  async function handleSendBlast() {
    if (!dealId) return;
    const eligibleBuyers = matchingBuyers.filter(
      (b) => selectedBuyerIds.has(b.id) && b.email
    );
    if (eligibleBuyers.length === 0) return;

    setSending(true);
    setMailError(null);
    setSendResults(null);

    let sent = 0;
    let mailNotConfigured = false;

    for (const buyer of eligibleBuyers) {
      if (!buyer.email) continue;
      const result = await sendDealBlast(dealId, buyer.id, buyer.email, blastText);
      if ("success" in result) {
        sent++;
      } else if (result.error === "mail_not_configured") {
        mailNotConfigured = true;
        break;
      }
    }

    setSending(false);

    if (mailNotConfigured) {
      setMailError("mail_not_configured");
    } else {
      setSendResults({ sent, total: eligibleBuyers.length });
    }
  }

  const buyersWithEmail = matchingBuyers.filter((b) => b.email);
  const selectedWithEmail = matchingBuyers.filter(
    (b) => selectedBuyerIds.has(b.id) && b.email
  );

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

            <div className="flex flex-wrap gap-2">
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

              {dealId && matchingBuyers.length > 0 && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowEmailPanel((v) => !v)}
                >
                  <Mail className="h-4 w-4" />
                  Email Blast
                  {buyersWithEmail.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                      {buyersWithEmail.length}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Email blast panel */}
            {showEmailPanel && dealId && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <p className="text-sm font-medium">Select buyers to email:</p>

                {matchingBuyers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matched buyers found for this deal.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matchingBuyers.map((buyer) => {
                      const hasEmail = !!buyer.email;
                      return (
                        <label
                          key={buyer.id}
                          className={`flex items-center gap-3 rounded-md p-2 cursor-pointer hover:bg-muted transition-colors ${!hasEmail ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBuyerIds.has(buyer.id)}
                            disabled={!hasEmail}
                            onChange={() => toggleBuyer(buyer.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="flex-1 text-sm">
                            <span className="font-medium">{buyer.name}</span>
                            {buyer.email ? (
                              <span className="ml-2 text-muted-foreground text-xs">
                                {buyer.email}
                              </span>
                            ) : (
                              <span className="ml-2 text-muted-foreground text-xs italic">
                                No email
                              </span>
                            )}
                          </span>
                          {buyer.isFullMatch && (
                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                              FULL MATCH
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {mailError === "mail_not_configured" && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Email not configured.{" "}
                      <Link href="/settings/mail" className="underline font-medium">
                        Set up mail settings
                      </Link>{" "}
                      to send email blasts.
                    </span>
                  </div>
                )}

                {sendResults && (
                  <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
                    {sendResults.sent}/{sendResults.total} emails sent and logged to buyer history.
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    disabled={sending || selectedWithEmail.length === 0}
                    onClick={handleSendBlast}
                    className="gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        Send Blast ({selectedWithEmail.length})
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowEmailPanel(false);
                      setSendResults(null);
                      setMailError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
