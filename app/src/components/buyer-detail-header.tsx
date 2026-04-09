"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuyerIntakeForm } from "@/components/buyer-intake-form";
import {
  addBuyerTag,
  removeBuyerTag,
  setBuyerFollowUp,
} from "@/lib/buyer-actions";
import {
  Phone,
  Mail,
  Tag,
  CalendarClock,
  X,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyerWithTags } from "@/types";

interface BuyerDetailHeaderProps {
  buyer: BuyerWithTags;
  allTags: string[];
}

function formatPrice(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function fundingLabel(v: string | null): string {
  if (v === "cash") return "Cash";
  if (v === "hard_money") return "Hard Money";
  if (v === "both") return "Cash / Hard Money";
  return v ?? "";
}

function rehabLabel(v: string | null): string {
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function BuyerDetailHeader({ buyer, allTags }: BuyerDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [pendingTag, setPendingTag] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue =
    buyer.followUpDate != null && buyer.followUpDate < today;

  async function handleAddTag(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tagInput.trim()) return;
    setPendingTag(true);
    const fd = new FormData();
    fd.set("buyerId", buyer.id);
    fd.set("tag", tagInput.trim());
    await addBuyerTag(fd);
    setTagInput("");
    setPendingTag(false);
  }

  async function handleRemoveTag(tag: string) {
    const fd = new FormData();
    fd.set("buyerId", buyer.id);
    fd.set("tag", tag);
    await removeBuyerTag(fd);
  }

  async function handleSetFollowUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPendingFollowUp(true);
    const fd = new FormData(e.currentTarget);
    fd.set("buyerId", buyer.id);
    await setBuyerFollowUp(fd);
    setPendingFollowUp(false);
  }

  async function handleClearFollowUp() {
    setPendingFollowUp(true);
    const fd = new FormData();
    fd.set("buyerId", buyer.id);
    // null followUpDate — empty string clears it per the server action
    await setBuyerFollowUp(fd);
    setPendingFollowUp(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Name + Status + Edit */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{buyer.name}</h1>
            <Badge
              className={cn(
                "text-xs",
                buyer.isActive
                  ? "bg-emerald-600/15 text-emerald-600 border-emerald-600/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {buyer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Contact links */}
          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-sm">
            {buyer.phone && (
              <a
                href={`tel:${buyer.phone}`}
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {buyer.phone}
              </a>
            )}
            {buyer.email && (
              <a
                href={`mailto:${buyer.email}`}
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {buyer.email}
              </a>
            )}
          </div>
        </div>

        {/* Edit button */}
        <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
          <Dialog.Trigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <Pencil className="h-3.5 w-3.5" />
                Edit Buyer
              </Button>
            }
          />
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
            <Dialog.Popup className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto transition-all duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Edit Buyer</h2>
                  <Dialog.Close
                    render={
                      <button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    }
                  />
                </div>
                <BuyerIntakeForm
                  buyer={buyer}
                  onClose={() => setEditOpen(false)}
                />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Buy box details */}
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {(buyer.minPrice != null || buyer.maxPrice != null) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Price Range
            </p>
            <p className="font-medium text-foreground">
              {formatPrice(buyer.minPrice)} – {formatPrice(buyer.maxPrice)}
            </p>
          </div>
        )}
        {buyer.fundingType && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Funding
            </p>
            <p className="font-medium text-foreground">
              {fundingLabel(buyer.fundingType)}
            </p>
          </div>
        )}
        {buyer.rehabTolerance && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Rehab
            </p>
            <p className="font-medium text-foreground">
              {rehabLabel(buyer.rehabTolerance)}
            </p>
          </div>
        )}
        {buyer.targetAreas && (
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Target Areas
            </p>
            <p className="font-medium text-foreground">{buyer.targetAreas}</p>
          </div>
        )}
      </div>

      {/* Buy box notes */}
      {buyer.buyBox && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Buy Box
          </p>
          <p className="text-sm text-foreground">{buyer.buyBox}</p>
        </div>
      )}

      {/* Notes */}
      {buyer.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Notes
          </p>
          <p className="text-sm text-muted-foreground">{buyer.notes}</p>
        </div>
      )}

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tags
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {buyer.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {/* Add tag form */}
          <form onSubmit={handleAddTag} className="flex items-center gap-1.5">
            <div className="relative">
              <Input
                list={`buyer-tags-list-${buyer.id}`}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                className="h-7 w-28 text-xs px-2"
                disabled={pendingTag}
              />
              <datalist id={`buyer-tags-list-${buyer.id}`}>
                {allTags
                  .filter((t) => !buyer.tags.includes(t))
                  .map((t) => (
                    <option key={t} value={t} />
                  ))}
              </datalist>
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={pendingTag || !tagInput.trim()}
            >
              Add
            </Button>
          </form>
        </div>
      </div>

      {/* Follow-up section */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Follow-Up Reminder
          </p>
        </div>

        {buyer.followUpDate ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                isOverdue ? "text-red-500" : "text-foreground"
              )}
            >
              {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              {isOverdue ? "Overdue: " : ""}
              {buyer.followUpDate}
            </span>
            <button
              type="button"
              onClick={handleClearFollowUp}
              disabled={pendingFollowUp}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <form onSubmit={handleSetFollowUp} className="flex items-center gap-2">
            <input
              type="date"
              name="followUpDate"
              min={today}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
              required
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pendingFollowUp}
              className="h-8"
            >
              Set Reminder
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
