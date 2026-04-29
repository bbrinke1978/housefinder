/**
 * audit-queries.ts — Read-side queries for the audit log viewer.
 *
 * Brian's mental model for this viewer (comment preserved):
 * "This viewer is for spotting patterns — who edited which lead, when.
 *  Use the entity_id filter to see all changes to a single lead.
 *  Use the actor filter to see one user's actions over time."
 */

import { db } from "@/db/client";
import { auditLog, auditLogArchive, users } from "@/db/schema";
import { eq, and, gte, lte, ilike, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export interface AuditFilters {
  actorUserId?: string;
  action?: string;          // substring match — e.g. "lead." matches all lead actions
  entityType?: string;
  entityId?: string;        // exact UUID
  since?: Date;             // inclusive
  until?: Date;             // inclusive
}

export interface AuditEntryRow {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ListAuditEntriesOptions {
  filters: AuditFilters;
  /** When true, queries audit_log_archive (rows >30 days old); default false */
  archive?: boolean;
  limit?: number;
  offset?: number;
}

function buildConditions(filters: AuditFilters, table: typeof auditLog | typeof auditLogArchive): SQL[] {
  const conditions: SQL[] = [];

  if (filters.actorUserId) {
    conditions.push(eq(table.actorUserId, filters.actorUserId));
  }
  if (filters.action) {
    // Substring match — ilike '%action%'
    conditions.push(ilike(table.action, `%${filters.action}%`));
  }
  if (filters.entityType) {
    conditions.push(eq(table.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(
      sql`${table.entityId} = ${filters.entityId}::uuid`
    );
  }
  if (filters.since) {
    conditions.push(gte(table.createdAt, filters.since));
  }
  if (filters.until) {
    conditions.push(lte(table.createdAt, filters.until));
  }

  return conditions;
}

/**
 * listAuditEntries — paginated list of audit rows with actor names joined.
 * Default limit: 50. Default offset: 0.
 * Default archive: false (reads from audit_log; pass archive=true for archive).
 */
export async function listAuditEntries({
  filters,
  archive = false,
  limit = 50,
  offset = 0,
}: ListAuditEntriesOptions): Promise<AuditEntryRow[]> {
  const table = archive ? auditLogArchive : auditLog;
  const conditions = buildConditions(filters, table);

  // LEFT JOIN users to get actor name + email
  const rows = await db
    .select({
      id: table.id,
      actorUserId: table.actorUserId,
      actorName: users.name,
      actorEmail: users.email,
      action: table.action,
      entityType: table.entityType,
      entityId: table.entityId,
      oldValue: table.oldValue,
      newValue: table.newValue,
      ipAddress: table.ipAddress,
      createdAt: table.createdAt,
    })
    .from(table)
    .leftJoin(users, eq(table.actorUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${table.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return rows as AuditEntryRow[];
}

/**
 * countAuditEntries — returns total count matching the filters (for pagination).
 */
export async function countAuditEntries({
  filters,
  archive = false,
}: Omit<ListAuditEntriesOptions, "limit" | "offset">): Promise<number> {
  const table = archive ? auditLogArchive : auditLog;
  const conditions = buildConditions(filters, table);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result?.count ?? 0;
}

/**
 * listActorUsers — all distinct users who appear in the audit log (for filter dropdown).
 */
export async function listActorUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const rows = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .where(sql`${auditLog.actorUserId} IS NOT NULL`)
    .orderBy(users.name);

  return rows.filter((r): r is { id: string; name: string; email: string } =>
    r.id != null && r.name != null && r.email != null
  );
}
