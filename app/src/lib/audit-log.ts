// app/src/lib/audit-log.ts
// Server-side helper — reads request headers via Next.js `headers()`.
// Never throws — audit log failures never block the user's action.

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { headers } from "next/headers";

export async function logAudit(args: {
  actorUserId: string | null;
  action: string;             // e.g. 'lead.status_changed'
  entityType: string;         // 'lead' | 'deal' | 'property' | 'buyer' | 'user'
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  try {
    const h = await headers();
    const ipAddress = h.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;
    await db.insert(auditLog).values({
      actorUserId: args.actorUserId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      oldValue: args.oldValue !== undefined ? args.oldValue : null,
      newValue: args.newValue !== undefined ? args.newValue : null,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Audit logging never blocks the user's action — log and continue.
    console.error("[audit-log] write failed:", err);
  }
}
