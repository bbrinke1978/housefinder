import { auth } from "@/auth";
import { listAuditEntries, countAuditEntries, listActorUsers } from "@/lib/audit-queries";
import type { AuditFilters } from "@/lib/audit-queries";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

interface AuditPageSearchParams {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  since?: string;
  until?: string;
  archive?: string;
  page?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: AuditPageSearchParams;
}) {
  // NO URL gate — discoverability via nav-hide only (Brian's decision, 2026-04-28)
  // Page is read-only; team is small and trusted
  await auth(); // still need session for display, but don't gate on role

  const archive = searchParams.archive === "true";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const filters: AuditFilters = {};
  if (searchParams.actorUserId) filters.actorUserId = searchParams.actorUserId;
  if (searchParams.action) filters.action = searchParams.action;
  if (searchParams.entityType) filters.entityType = searchParams.entityType;
  if (searchParams.entityId) filters.entityId = searchParams.entityId;
  if (searchParams.since) filters.since = new Date(searchParams.since);
  if (searchParams.until) filters.until = new Date(searchParams.until);

  const [entries, total, actorUsers] = await Promise.all([
    listAuditEntries({ filters, archive, limit, offset }),
    countAuditEntries({ filters, archive }),
    listActorUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <ClipboardList className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} entr{total !== 1 ? "ies" : "y"} matching current filters
          </p>
        </div>
      </div>

      <AuditLogViewer
        entries={entries}
        actorUsers={actorUsers}
        total={total}
        page={page}
        limit={limit}
        initialFilters={filters}
        initialArchive={archive}
      />
    </div>
  );
}
