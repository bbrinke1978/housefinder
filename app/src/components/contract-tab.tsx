"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractListItem } from "@/components/contract-list-item";
import { ContractCreateForm } from "@/components/contract-create-form";
import type { DealWithBuyer, ContractWithSigners } from "@/types";

interface ContractTabProps {
  deal: DealWithBuyer;
  contracts: ContractWithSigners[];
}

export function ContractTab({ deal, contracts }: ContractTabProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contracts
          </h3>
          {contracts.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1">
              {contracts.length}
            </span>
          )}
        </div>
        {!showCreate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Contract
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <ContractCreateForm deal={deal} onClose={() => setShowCreate(false)} />
      )}

      {/* Contract list */}
      {contracts.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 rounded-lg border border-dashed">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No contracts yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first contract to send for e-signature.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create First Contract
          </Button>
        </div>
      ) : (
        contracts.length > 0 && (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <ContractListItem key={contract.id} contract={contract} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
