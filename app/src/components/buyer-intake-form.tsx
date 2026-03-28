"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { createBuyer, updateBuyer } from "@/lib/deal-actions";
import type { Buyer } from "@/types";

interface BuyerIntakeFormProps {
  buyer?: Buyer; // if provided, form is in edit mode
  onClose?: () => void;
}

export function BuyerIntakeForm({ buyer, onClose }: BuyerIntakeFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!buyer;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      if (isEdit && buyer) {
        await updateBuyer(buyer.id, formData);
        onClose?.();
      } else {
        await createBuyer(formData);
        formRef.current?.reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          {isEdit ? "Edit Buyer" : "Add New Buyer"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={buyer?.name ?? ""}
                placeholder="John Smith"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={buyer?.phone ?? ""}
                placeholder="(435) 555-0100"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={buyer?.email ?? ""}
                placeholder="buyer@example.com"
              />
            </div>

            {/* Min Price */}
            <div>
              <Label htmlFor="minPrice">Min Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  min="0"
                  className="pl-7"
                  defaultValue={buyer?.minPrice ?? ""}
                  placeholder="50000"
                />
              </div>
            </div>

            {/* Max Price */}
            <div>
              <Label htmlFor="maxPrice">Max Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="maxPrice"
                  name="maxPrice"
                  type="number"
                  min="0"
                  className="pl-7"
                  defaultValue={buyer?.maxPrice ?? ""}
                  placeholder="200000"
                />
              </div>
            </div>

            {/* Funding Type */}
            <div>
              <Label htmlFor="fundingType">Funding Type</Label>
              <select
                id="fundingType"
                name="fundingType"
                defaultValue={buyer?.fundingType ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Select --</option>
                <option value="cash">Cash</option>
                <option value="hard_money">Hard Money</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* Rehab Tolerance */}
            <div>
              <Label htmlFor="rehabTolerance">Rehab Tolerance</Label>
              <select
                id="rehabTolerance"
                name="rehabTolerance"
                defaultValue={buyer?.rehabTolerance ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Select --</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
                <option value="any">Any</option>
              </select>
            </div>

            {/* Target Areas */}
            <div className="sm:col-span-2">
              <Label htmlFor="targetAreas">Target Areas</Label>
              <Input
                id="targetAreas"
                name="targetAreas"
                defaultValue={buyer?.targetAreas ?? ""}
                placeholder="Price, Helper, Wellington..."
              />
            </div>

            {/* Buy Box */}
            <div className="sm:col-span-2">
              <Label htmlFor="buyBox">Buy Box / Notes on Criteria</Label>
              <textarea
                id="buyBox"
                name="buyBox"
                rows={2}
                defaultValue={buyer?.buyBox ?? ""}
                placeholder="SFR only, no flood zone, wants cash-flowing..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={buyer?.notes ?? ""}
                placeholder="Met at REIA meeting, closes fast..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save Changes"
                  : "Add Buyer"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
