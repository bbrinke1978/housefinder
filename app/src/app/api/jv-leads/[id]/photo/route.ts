import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { jvLeads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { userCan, type Role } from "@/lib/permissions";
import { uploadJvLeadBlob, generateJvLeadSasUrl } from "@/lib/blob-storage";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

/**
 * POST /api/jv-leads/[id]/photo
 * Accepts multipart/form-data with a "file" field (image only, max 10MB).
 * Uploads to Azure Blob Storage "jv-leads" container and updates photo_blob_name.
 * Row-level ownership: the jv_lead must belong to the calling user.
 * Auth: jv.submit_lead permission required.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = ((session.user as { roles?: string[] }).roles ?? []) as Role[];
  if (!userCan(roles, "jv.submit_lead")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: jvLeadId } = await params;

  // Row-level ownership: verify the jv_lead belongs to the calling user
  const [lead] = await db
    .select()
    .from(jvLeads)
    .where(
      and(
        eq(jvLeads.id, jvLeadId),
        eq(jvLeads.submitterUserId, session.user.id as string)
      )
    )
    .limit(1);

  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobName = `${jvLeadId}/${randomUUID()}.jpg`;

  try {
    await uploadJvLeadBlob(buffer, blobName, file.type);
  } catch (err) {
    console.error("[jv-leads-photo] blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await db
    .update(jvLeads)
    .set({ photoBlobName: blobName, updatedAt: new Date() })
    .where(eq(jvLeads.id, jvLeadId));

  return NextResponse.json({ sasUrl: generateJvLeadSasUrl(blobName), blobName });
}
