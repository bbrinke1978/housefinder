import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { processCourtIntake } from "@/lib/xchange-intake";

export const dynamic = "force-dynamic";

const CourtCaseSchema = z.object({
  caseNumber: z.string().min(1).max(50),
  caseType: z.string().min(2).max(5),
  filingDate: z.string().optional(),
  partyName: z.string().optional(),
  partyAddress: z.string().optional(),
  county: z.string().min(1),
  rawText: z.string().optional(),
});

const CourtIntakePayloadSchema = z.object({
  cases: z.array(CourtCaseSchema).min(1).max(500),
  agentNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Auth: same pattern as /api/leads/route.ts
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.COURT_INTAKE_API_KEY;
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CourtIntakePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const result = await processCourtIntake(
      parsed.data.cases,
      parsed.data.agentNotes
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[court-intake] processCourtIntake error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
