"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import type { AuditEntryRow, AuditFilters } from "@/lib/audit-queries";

interface ActorUser {
  id: string;
  name: string;
  email: string;
}

interface AuditLogViewerProps {
  entries: AuditEntryRow[];
  actorUsers: ActorUser[];
  total: number;
  page: number;
  limit: number;
  initialFilters: AuditFilters;
  initialArchive: boolean;
}

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "property", label: "Property" },
  { value: "buyer", label: "Buyer" },
  { value: "user", label: "User" },
];

function entityDetailPath(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "lead":
    case "property":
      return `/properties/${entityId}`;
    case "deal":
      return `/deals/${entityId}`;
    case "buyer":
      return `/buyers/${entityId}`;
    default:
      return null;
  }
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

function diffBadgeText(entry: AuditEntryRow): string {
  const oldVal = entry.oldValue as Record<string, unknown> | null | undefined;
  const newVal = entry.newValue as Record<string, unknown> | null | undefined;

  if (!oldVal && !newVal) return entry.action;

  // Special case: status change
  if (
    oldVal &&
    newVal &&
    typeof oldVal === "object" &&
    typeof newVal === "object" &&
    "status" in oldVal &&
    "status" in newVal &&
    oldVal.status !== newVal.status
  ) {
    return `${String(oldVal.status)} → ${String(newVal.status)}`;
  }

  // Count changed fields
  if (oldVal && newVal && typeof oldVal === "object" && typeof newVal === "object") {
    const changedKeys = Object.keys(newVal).filter(
      (k) => JSON.stringify(newVal[k]) !== JSON.stringify(oldVal[k])
    );
    if (changedKeys.length === 1) {
      return `changed ${changedKeys[0]}`;
    }
    if (changedKeys.length > 1) {
      return `edited ${changedKeys.length} fields`;
    }
  }

  return entry.action;
}

function DiffExpando({ entry }: { entry: AuditEntryRow }) {
  const [open, setOpen] = useState(false);

  const hasDiff = entry.oldValue != null || entry.newValue != null;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {diffBadgeText(entry)}
        </span>
        {hasDiff && (
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {open ? "hide" : "expand"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {entry.oldValue != null && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Before</p>
              <pre className="text-[9px] bg-muted rounded p-2 overflow-auto max-h-40 text-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(entry.oldValue, null, 2)}
              </pre>
            </div>
          )}
          {entry.newValue != null && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">After</p>
              <pre className="text-[9px] bg-muted rounded p-2 overflow-auto max-h-40 text-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(entry.newValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogViewer({
  entries,
  actorUsers,
  total,
  page,
  limit,
  initialFilters,
  initialArchive,
}: AuditLogViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local filter state — applied on search
  const [actorUserId, setActorUserId] = useState(initialFilters.actorUserId ?? "");
  const [action, setAction] = useState(initialFilters.action ?? "");
  const [entityType, setEntityType] = useState(initialFilters.entityType ?? "");
  const [entityId, setEntityId] = useState(initialFilters.entityId ?? "");
  const [since, setSince] = useState(
    initialFilters.since ? format(initialFilters.since, "yyyy-MM-dd") : ""
  );
  const [until, setUntil] = useState(
    initialFilters.until ? format(initialFilters.until, "yyyy-MM-dd") : ""
  );
  const [archive, setArchive] = useState(initialArchive);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters =
    actorUserId || action || entityType || entityId || since || until;

  const pushParams = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      const final: Record<string, string | undefined> = {
        actorUserId: actorUserId || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        since: since || undefined,
        until: until || undefined,
        archive: archive ? "true" : undefined,
        page: undefined, // reset page on filter change
        ...overrides,
      };
      // Clear then repopulate
      Array.from(params.keys()).forEach((k) => params.delete(k));
      Object.entries(final).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, v);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, actorUserId, action, entityType, entityId, since, until, archive]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({});
  }

  function handleClear() {
    setActorUserId("");
    setAction("");
    setEntityType("");
    setEntityId("");
    setSince("");
    setUntil("");
    router.push(`${pathname}${archive ? "?archive=true" : ""}`);
  }

  function handleTabChange(toArchive: boolean) {
    setArchive(toArchive);
    pushParams({ archive: toArchive ? "true" : undefined, page: undefined });
  }

  function handlePage(newPage: number) {
    pushParams({ page: newPage > 1 ? String(newPage) : undefined });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        <button
          type="button"
          onClick={() => handleTabChange(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !archive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active (last 30 days)
        </button>
        <button
          type="button"
          onClick={() => handleTabChange(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            archive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Archive (older)
        </button>
      </div>

      {/* Filter toggle + form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((p) => !p)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary w-4 h-4 text-[9px] text-primary-foreground font-bold">
                ●
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {filtersOpen && (
          <form onSubmit={handleSearch} className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Actor */}
              <div>
                <Label htmlFor="audit-actor" className="text-xs">Actor</Label>
                <select
                  id="audit-actor"
                  value={actorUserId}
                  onChange={(e) => setActorUserId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All actors</option>
                  {actorUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div>
                <Label htmlFor="audit-action" className="text-xs">Action contains</Label>
                <Input
                  id="audit-action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder='e.g. "lead." or "deal.status"'
                  className="mt-1 text-sm h-9"
                />
              </div>

              {/* Entity Type */}
              <div>
                <Label htmlFor="audit-entity-type" className="text-xs">Entity type</Label>
                <select
                  id="audit-entity-type"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ENTITY_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity ID */}
              <div>
                <Label htmlFor="audit-entity-id" className="text-xs">Entity ID (UUID)</Label>
                <Input
                  id="audit-entity-id"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="Paste UUID"
                  className="mt-1 text-sm h-9 font-mono"
                />
              </div>

              {/* Since */}
              <div>
                <Label htmlFor="audit-since" className="text-xs">From date</Label>
                <Input
                  id="audit-since"
                  type="date"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className="mt-1 text-sm h-9"
                />
              </div>

              {/* Until */}
              <div>
                <Label htmlFor="audit-until" className="text-xs">To date</Label>
                <Input
                  id="audit-until"
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="mt-1 text-sm h-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="text-xs h-8">
                Apply filters
              </Button>
              <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 px-4 whitespace-nowrap">Time</th>
              <th className="py-2.5 px-4">Actor</th>
              <th className="py-2.5 px-4">Action</th>
              <th className="py-2.5 px-4 whitespace-nowrap">Entity</th>
              <th className="py-2.5 px-4">Diff</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-sm text-muted-foreground">
                  No audit entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const entityPath = entityDetailPath(entry.entityType, entry.entityId);
                return (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors align-top">
                    {/* Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        title={format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss")}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      {entry.actorName ? (
                        <div>
                          <p className="font-medium text-xs">{entry.actorName}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.actorEmail}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">system</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                        {entry.action}
                      </code>
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {entry.entityId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {entry.entityType}
                          </span>
                          {entityPath ? (
                            <a
                              href={entityPath}
                              className="text-xs font-mono text-primary hover:underline"
                              title={entry.entityId}
                            >
                              {shortId(entry.entityId)}
                            </a>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground" title={entry.entityId}>
                              {shortId(entry.entityId)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Diff */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <DiffExpando entry={entry} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Page {page} of {totalPages} ({total.toLocaleString()} entries)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={page <= 1}
              onClick={() => handlePage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={page >= totalPages}
              onClick={() => handlePage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
