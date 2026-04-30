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
  searchParams: Promise<AuditPageSearchParams>;
}) {
  // NO URL gate — discoverability via nav-hide only (Brian's decision, 2026-04-28)
  // Page is read-only; team is small and trusted
  await auth(); // still need session for display, but don't gate on role

  const params = await searchParams;
  const archive = params.archive === "true";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const filters: AuditFilters = {};
  if (params.actorUserId) filters.actorUserId = params.actorUserId;
  if (params.action) filters.action = params.action;
  if (params.entityType) filters.entityType = params.entityType;
  if (params.entityId) filters.entityId = params.entityId;
  if (params.since) filters.since = new Date(params.since);
  if (params.until) filters.until = new Date(params.until);

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
