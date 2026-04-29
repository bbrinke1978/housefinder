/**
 * auditLogArchive — Daily retention enforcement for the audit log.
 *
 * Schedule: 3:00 AM UTC daily (0 0 3 * * *)
 *
 * Two-step retention per Brian's 30/60/drop policy:
 *
 *   Step 1: Move rows aged >30 days from audit_log → audit_log_archive (single transaction).
 *   Step 2: DELETE rows aged >60 days from audit_log_archive entirely.
 *
 * Net effect:
 *   - Active 30-day window lives in audit_log (hot-queryable)
 *   - 30-60 day band lives in audit_log_archive (cold but queryable)
 *   - >60 days: gone entirely
 *
 * Logs row counts for both steps. Step 1 is transactional; step 2 is a simple delete.
 */

import { app } from "@azure/functions";
import { db } from "../db/client.js";
import { auditLog, auditLogArchive } from "../db/schema.js";
import { lt } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

app.timer("auditLogArchive", {
  schedule: "0 0 3 * * *",
  handler: async (_timer, context) => {
    const archiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const dropCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);    // 60 days ago

    // Step 1: copy >30-day rows from active to archive, then delete from active.
    const toArchive = await db
      .select()
      .from(auditLog)
      .where(lt(auditLog.createdAt, archiveCutoff));

    if (toArchive.length > 0) {
      await db.transaction(async (tx: any) => {
        await tx.insert(auditLogArchive).values(toArchive);
        await tx.delete(auditLog).where(lt(auditLog.createdAt, archiveCutoff));
      });
    }

    // Step 2: drop >60-day rows from archive entirely (Brian's 30/60/drop policy).
    const { rowCount: droppedCount } = await db
      .delete(auditLogArchive)
      .where(lt(auditLogArchive.createdAt, dropCutoff));

    context.log(`[auditLogArchive] archived ${toArchive.length}, dropped ${droppedCount ?? 0}`);
  },
});
