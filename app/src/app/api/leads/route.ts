import { z } from "zod/v4";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { leads, leadNotes } from "@/db/schema";

export const dynamic = "force-dynamic";

const WebLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(30),
  address: z.string().min(5).max(500),
  message: z.string().max(2000).optional().default(""),
  email: z.string().email().optional(), // accepted for forward compat (LEAD-01)
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  // Auth: validate x-api-key header
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.WEBSITE_LEAD_API_KEY;

  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Validate input with Zod
  const parsed = WebLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422, headers: CORS_HEADERS }
    );
  }

  const { name, phone, address, message, email } = parsed.data;

  // Build structured note text
  const noteLines = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
  ];
  if (message) {
    noteLines.push(`Message: ${message}`);
  }
  if (email) {
    noteLines.push(`Email: ${email}`);
  }
  const noteText = noteLines.join("\n");

  // Insert lead + leadNote
  try {
    const [lead] = await db
      .insert(leads)
      .values({
        propertyId: null,
        leadSource: "website",
        status: "new",
        newLeadStatus: "new",
        distressScore: 0,
        isHot: false,
        alertSent: false,
      })
      .returning({ id: leads.id });

    await db.insert(leadNotes).values({
      leadId: lead.id,
      noteText,
      noteType: "user",
    });

    return NextResponse.json(
      { ok: true, leadId: lead.id },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[api/leads POST] DB error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
