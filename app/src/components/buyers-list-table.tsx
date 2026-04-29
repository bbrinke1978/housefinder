"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BuyerIntakeForm } from "@/components/buyer-intake-form";
import { BuyerCsvImport } from "@/components/buyer-csv-import";
import {
  UserPlus,
  Upload,
  Download,
  Phone,
  Mail,
  Search,
  X,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import type { BuyerWithTags } from "@/types";

interface BuyersListTableProps {
  buyers: BuyerWithTags[];
  tags: string[];
  /** When false, Add Buyer / CSV import buttons are hidden. Default true for backward compat. */
  canCreateOrEditBuyer?: boolean;
}

function fundingLabel(v: string | null): string {
  if (v === "cash") return "Cash";
  if (v === "hard_money") return "Hard Money";
  if (v === "both") return "Cash / Hard Money";
  return v ?? "";
}

function formatPrice(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function BuyersListTable({ buyers, tags, canCreateOrEditBuyer = true }: BuyersListTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Local search state for client-side filter
  const [localSearch, setLocalSearch] = useState(
    searchParams.get("search") ?? ""
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to first page when filtering
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", localSearch);
  }

  function clearSearch() {
    setLocalSearch("");
    updateParam("search", "");
  }

  const currentStatus = searchParams.get("status") ?? "active";
  const currentTag = searchParams.get("tag") ?? "";
  const currentFunding = searchParams.get("fundingType") ?? "";
  const currentArea = searchParams.get("targetArea") ?? "";

  // Client-side name/email/phone search on top of server filter
  const filtered = localSearch
    ? buyers.filter((b) => {
        const q = localSearch.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          (b.email ?? "").toLowerCase().includes(q) ||
          (b.phone ?? "").toLowerCase().includes(q)
        );
      })
    : buyers;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="pl-9 pr-8"
          />
          {localSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Status filter */}
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Tag filter */}
        {tags.length > 0 && (
          <select
            value={currentTag}
            onChange={(e) => updateParam("tag", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        {/* Funding type filter */}
        <select
          value={currentFunding}
          onChange={(e) => updateParam("fundingType", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Funding</option>
          <option value="cash">Cash</option>
          <option value="hard_money">Hard Money</option>
          <option value="both">Both</option>
        </select>

        {/* Target area text filter */}
        <Input
          placeholder="Filter by area..."
          defaultValue={currentArea}
          onBlur={(e) => updateParam("targetArea", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("targetArea", (e.target as HTMLInputElement).value);
            }
          }}
          className="h-9 w-36"
        />

        {/* Action buttons */}
        <div className="ml-auto flex gap-2">
          {/* CSV Export */}
          <a href="/api/buyers/export" download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </a>

          {/* Import CSV — gated by buyer.create_or_edit */}
          {canCreateOrEditBuyer && <Dialog.Root open={importOpen} onOpenChange={setImportOpen}>
            <Dialog.Trigger
              render={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
              }
            />
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
              <Dialog.Popup className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95 max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Import Buyers from CSV</h2>
                    <Dialog.Close
                      render={
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>
                  <BuyerCsvImport onDone={() => setImportOpen(false)} />
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>}

          {/* Add Buyer — gated by buyer.create_or_edit */}
          {canCreateOrEditBuyer && <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
            <Dialog.Trigger
              render={
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Buyer</span>
                </Button>
              }
            />
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
              <Dialog.Popup className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95 max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add New Buyer</h2>
                    <Dialog.Close
                      render={
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>
                  <BuyerIntakeForm onClose={() => setAddOpen(false)} />
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No buyers yet. Add your first buyer or import from CSV.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">
                  Contact
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">
                  Buy Box
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground lg:table-cell">
                  Tags
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground xl:table-cell">
                  Last Contact
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground xl:table-cell">
                  Follow-Up
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((buyer, idx) => {
                const isOverdue =
                  buyer.followUpDate != null &&
                  new Date(buyer.followUpDate) < new Date();

                return (
                  <tr
                    key={buyer.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors hover:bg-muted/30",
                      idx % 2 === 1 && "bg-muted/10"
                    )}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <Link
                          href={`/buyers/${buyer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {buyer.name}
                        </Link>
                        {buyer.fundingType && (
                          <p className="text-xs text-muted-foreground">
                            {fundingLabel(buyer.fundingType)}
                            {(buyer.minPrice != null || buyer.maxPrice != null) && (
                              <span className="ml-1">
                                &middot; {formatPrice(buyer.minPrice)} –{" "}
                                {formatPrice(buyer.maxPrice)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {buyer.phone && (
                          <a
                            href={`tel:${buyer.phone}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {buyer.phone}
                            </span>
                          </a>
                        )}
                        {buyer.email && (
                          <a
                            href={`mailto:${buyer.email}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {buyer.email}
                            </span>
                          </a>
                        )}
                        {!buyer.phone && !buyer.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>

                    {/* Buy Box */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="max-w-[220px] truncate text-muted-foreground">
                        {buyer.buyBox ?? (
                          <span className="italic">—</span>
                        )}
                      </p>
                      {buyer.targetAreas && (
                        <p className="text-xs text-muted-foreground/70 truncate max-w-[220px]">
                          {buyer.targetAreas}
                        </p>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {buyer.tags.length > 0 ? (
                          buyer.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {buyer.isActive ? (
                        <Badge className="bg-emerald-600/15 text-emerald-600 border-emerald-600/20 hover:bg-emerald-600/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </td>

                    {/* Last Contact */}
                    <td className="hidden px-4 py-3 xl:table-cell text-muted-foreground">
                      {buyer.lastContactedAt
                        ? format(new Date(buyer.lastContactedAt), "MMM d, yyyy")
                        : "—"}
                    </td>

                    {/* Follow-Up */}
                    <td className="hidden px-4 py-3 xl:table-cell">
                      {buyer.followUpDate ? (
                        <span
                          className={cn(
                            "text-sm",
                            isOverdue
                              ? "font-semibold text-red-500"
                              : "text-muted-foreground"
                          )}
                        >
                          {buyer.followUpDate}
                          {isOverdue && " (overdue)"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {buyers.length} buyer
          {buyers.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
