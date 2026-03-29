import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPropertiesForExport,
  getDealsForExport,
  getBuyersForExport,
} from "@/lib/analytics-queries";

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let rows: Record<string, unknown>[];
  let filename: string;

  switch (type) {
    case "leads": {
      const data = await getPropertiesForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `leads-${today}.csv`;
      break;
    }
    case "deals": {
      const data = await getDealsForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `deals-${today}.csv`;
      break;
    }
    case "buyers": {
      const data = await getBuyersForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `buyers-${today}.csv`;
      break;
    }
    default:
      return new NextResponse("Invalid export type", { status: 400 });
  }

  const csv = buildCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
