"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ContractClauseEditor } from "@/components/contract-clause-editor";
import { createContract } from "@/lib/contract-actions";
import { DEFAULT_PURCHASE_CLAUSES, DEFAULT_ASSIGNMENT_CLAUSES } from "@/types";
import type { DealWithBuyer, ContractClause, ContractType } from "@/types";

interface ContractCreateFormProps {
  deal: DealWithBuyer;
  onClose: () => void;
}

export function ContractCreateForm({ deal, onClose }: ContractCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [contractType, setContractType] = useState<ContractType>("purchase_agreement");
  const [clauses, setClauses] = useState<ContractClause[]>(DEFAULT_PURCHASE_CLAUSES);

  function handleTypeChange(type: ContractType) {
    setContractType(type);
    setClauses(type === "purchase_agreement" ? DEFAULT_PURCHASE_CLAUSES : DEFAULT_ASSIGNMENT_CLAUSES);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Inject clauses as JSON string
    formData.set("clauses", JSON.stringify(clauses));

    startTransition(async () => {
      const result = await createContract(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  const isPurchase = contractType === "purchase_agreement";

  return (
    <div className="border rounded-xl p-5 bg-background space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">New Contract</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Hidden deal ID */}
        <input type="hidden" name="dealId" value={deal.id} />
        <input type="hidden" name="contractType" value={contractType} />

        {/* Contract type selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Contract Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange("purchase_agreement")}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                isPurchase
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              Purchase Agreement
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("assignment")}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                !isPurchase
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              Assignment
            </button>
          </div>
        </div>

        {/* Property details — auto-filled */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="propertyAddress">
              Property Address
            </label>
            <input
              id="propertyAddress"
              name="propertyAddress"
              type="text"
              defaultValue={deal.address}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="city">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={deal.city}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Financial terms */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="purchasePrice">
              Purchase Price
            </label>
            <input
              id="purchasePrice"
              name="purchasePrice"
              type="number"
              min="0"
              defaultValue={deal.offerPrice ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {!isPurchase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="assignmentFee">
                Assignment Fee
              </label>
              <input
                id="assignmentFee"
                name="assignmentFee"
                type="number"
                min="0"
                defaultValue={deal.assignmentFee ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="earnestMoney">
              Earnest Money
            </label>
            <input
              id="earnestMoney"
              name="earnestMoney"
              type="number"
              min="0"
              defaultValue={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="inspectionPeriodDays">
              Inspection Days
            </label>
            <input
              id="inspectionPeriodDays"
              name="inspectionPeriodDays"
              type="number"
              min="1"
              defaultValue={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="closingDays">
              Closing Days
            </label>
            <input
              id="closingDays"
              name="closingDays"
              type="number"
              min="1"
              defaultValue={30}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isPurchase ? "Seller (Signs First)" : "Buyer (Signs First)"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="signerOneName">
                Name
              </label>
              <input
                id="signerOneName"
                name="signerOneName"
                type="text"
                defaultValue={
                  isPurchase
                    ? (deal.sellerName ?? "")
                    : (deal.buyerName ?? "")
                }
                required
                placeholder={isPurchase ? "Seller full name" : "Buyer full name"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="signerOneEmail">
                Email
              </label>
              <input
                id="signerOneEmail"
                name="signerOneEmail"
                type="email"
                required
                placeholder={isPurchase ? "seller@email.com" : "buyer@email.com"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Wholesaler (Signs Second)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="signerTwoName">
                Name
              </label>
              <input
                id="signerTwoName"
                name="signerTwoName"
                type="text"
                required
                placeholder="Your full name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="signerTwoEmail">
                Email
              </label>
              <input
                id="signerTwoEmail"
                name="signerTwoEmail"
                type="email"
                required
                placeholder="your@email.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Clause editor */}
        <div className="border-t border-border pt-4">
          <ContractClauseEditor clauses={clauses} onChange={setClauses} />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Creating..." : "Create Contract (Draft)"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
