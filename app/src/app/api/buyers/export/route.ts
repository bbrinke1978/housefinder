import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBuyersForExport } from "@/lib/buyer-queries";

export const dynamic = "force-dynamic";

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");

  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        return JSON.stringify(val == null ? "" : val);
      })
      .join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `buyers-${today}.csv`;

  const rows = await getBuyersForExport();
  const csv = buildCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
