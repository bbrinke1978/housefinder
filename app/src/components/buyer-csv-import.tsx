"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { importBuyers } from "@/lib/buyer-actions";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";

interface ImportRow {
  name: string;
  phone?: string;
  email?: string;
  buyBox?: string;
  minPrice?: number;
  maxPrice?: number;
  fundingType?: string;
  targetAreas?: string;
  rehabTolerance?: string;
  notes?: string;
}

const BUYER_FIELDS: Array<{ key: keyof ImportRow; label: string; required?: boolean }> = [
  { key: "name", label: "Name *", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "buyBox", label: "Buy Box" },
  { key: "minPrice", label: "Min Price" },
  { key: "maxPrice", label: "Max Price" },
  { key: "fundingType", label: "Funding Type" },
  { key: "targetAreas", label: "Target Areas" },
  { key: "rehabTolerance", label: "Rehab Tolerance" },
  { key: "notes", label: "Notes" },
];

/** Parse a CSV line respecting double-quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface BuyerCsvImportProps {
  onDone?: () => void;
}

export function BuyerCsvImport({ onDone }: BuyerCsvImportProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) ?? "";
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const parsedHeaders = parseCsvLine(lines[0]);
      const parsedRows = lines.slice(1).map((l) => parseCsvLine(l));

      setHeaders(parsedHeaders);
      setRawRows(parsedRows);
      setResult(null);

      // Auto-map where header matches field label (case-insensitive)
      const autoMap: Record<string, string> = {};
      for (const field of BUYER_FIELDS) {
        const match = parsedHeaders.find(
          (h) =>
            h.toLowerCase() === field.key.toLowerCase() ||
            h.toLowerCase() === field.label.toLowerCase().replace(" *", "")
        );
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const mappedRows: ImportRow[] = rawRows.map((row) => {
      const obj: Record<string, string | number | undefined> = {};
      for (const field of BUYER_FIELDS) {
        const csvHeader = mapping[field.key];
        if (!csvHeader) continue;
        const colIdx = headers.indexOf(csvHeader);
        if (colIdx === -1) continue;
        const val = row[colIdx]?.trim() ?? "";
        if (field.key === "minPrice" || field.key === "maxPrice") {
          const num = parseFloat(val.replace(/[^0-9.]/g, ""));
          obj[field.key] = isNaN(num) ? undefined : num;
        } else {
          obj[field.key] = val || undefined;
        }
      }
      return obj as unknown as ImportRow;
    });

    startTransition(async () => {
      const res = await importBuyers(mappedRows);
      setResult(res);
    });
  }

  const previewRows = rawRows.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Step 1: File upload */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Select CSV File
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 cursor-pointer"
        />
      </div>

      {/* Step 2: Column mapping (after file is loaded) */}
      {headers.length > 0 && (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Map Columns</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUYER_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <label className="w-32 shrink-0 text-xs text-muted-foreground">
                    {field.label}
                  </label>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">-- skip --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Preview table */}
          <div>
            <p className="text-sm font-medium mb-2">
              Preview (first {previewRows.length} rows)
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    {BUYER_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                        {f.label.replace(" *", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-t border-border">
                      {BUYER_FIELDS.filter((f) => mapping[f.key]).map((f) => {
                        const colIdx = headers.indexOf(mapping[f.key] ?? "");
                        return (
                          <td key={f.key} className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">
                            {colIdx >= 0 ? (row[colIdx] ?? "") : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {rawRows.length} total row{rawRows.length === 1 ? "" : "s"} in file
            </p>
          </div>

          {/* Import button */}
          {!result && (
            <Button
              onClick={handleImport}
              disabled={isPending || !mapping["name"]}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" />
              {isPending ? "Importing..." : `Import ${rawRows.length} Buyers`}
            </Button>
          )}
        </>
      )}

      {/* Step 4: Results */}
      {result && (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="font-medium text-sm">
            Import complete:{" "}
            <span className="text-emerald-600">{result.imported} imported</span>
            {result.errors.length > 0 && (
              <span className="text-red-500 ml-2">
                {result.errors.length} error{result.errors.length === 1 ? "" : "s"}
              </span>
            )}
          </p>

          {result.errors.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setErrorsExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {errorsExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {errorsExpanded ? "Hide" : "Show"} errors
              </button>
              {errorsExpanded && (
                <ul className="mt-2 space-y-1 text-xs text-red-500">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHeaders([]);
                setRawRows([]);
                setMapping({});
                setResult(null);
              }}
            >
              Import Another
            </Button>
            {onDone && (
              <Button size="sm" onClick={onDone}>
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
