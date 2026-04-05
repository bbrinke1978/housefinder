import { NextRequest, NextResponse } from "next/server";
import { getContractById } from "@/lib/contract-queries";
import { generateContractPdf } from "@/lib/contract-pdf";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — PDF endpoint is inside the app API (for authenticated users only)
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await getContractById(id).catch(() => null);
  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await generateContractPdf(contract);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contract-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
