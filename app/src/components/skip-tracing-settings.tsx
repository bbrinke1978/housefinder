"use client";

import { useState, useTransition } from "react";
import { saveTracerfyConfig } from "@/lib/tracerfy-actions";
import type { TracerfyStatus, TracerfyRunEntry, TracerfyConfig } from "@/types/index";

interface SkipTracingSettingsProps {
  status: TracerfyStatus;
  runHistory: TracerfyRunEntry[];
  config: TracerfyConfig;
}

export function SkipTracingSettings({ status, runHistory, config }: SkipTracingSettingsProps) {
  // Config form state
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(
    String(config.lowBalanceThreshold)
  );
  const [monthlyCap, setMonthlyCap] = useState(String(config.monthlyCap));
  const [saveResult, setSaveResult] = useState<
    { success: true } | { error: string } | null
  >(null);
  const [isSaving, startSave] = useTransition();

  // Monthly spend: filter run history to current month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlySpend = runHistory
    .filter((entry) => entry.date.startsWith(currentMonthKey))
    .reduce((sum, entry) => sum + entry.creditsUsed, 0);

  const monthlyCapNum = config.monthlyCap;
  const spendPercent = monthlyCapNum > 0 ? Math.min((monthlySpend / monthlyCapNum) * 100, 100) : 0;
  const isCapExceeded = monthlySpend > monthlyCapNum;

  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Recent history (last 20, most recent first)
  const recentHistory = [...runHistory].reverse().slice(0, 20);

  function handleSave() {
    setSaveResult(null);
    startSave(async () => {
      const threshold = parseFloat(lowBalanceThreshold);
      const cap = parseFloat(monthlyCap);
      if (isNaN(threshold) || isNaN(cap)) {
        setSaveResult({ error: "Invalid values — must be numbers." });
        return;
      }
      const result = await saveTracerfyConfig({ lowBalanceThreshold: threshold, monthlyCap: cap });
      setSaveResult(result);
    });
  }

  // Connection status color/label
  let statusColor = "bg-green-500";
  let statusLabel = "Connected";
  let statusDetail: string | null = null;

  if (!status.configured) {
    statusColor = "bg-red-500";
    statusLabel = "Not Configured";
    statusDetail = "Set TRACERFY_API_KEY in your Netlify environment variables.";
  } else if (status.error) {
    statusColor = "bg-yellow-500";
    statusLabel = "Error";
    statusDetail = status.error;
  }

  const showLowBalanceWarning =
    status.balance !== null &&
    status.balance !== undefined &&
    status.balance < config.lowBalanceThreshold;

  return (
    <div className="space-y-6">
      {/* A. Connection Status Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${statusColor} flex-shrink-0`} />
          <h2 className="text-base font-semibold">{statusLabel}</h2>
        </div>

        {statusDetail && (
          <p className="text-sm text-muted-foreground">{statusDetail}</p>
        )}

        {status.configured && !status.error && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Account Balance
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {status.balance !== null && status.balance !== undefined
                ? `${status.balance.toLocaleString()} credits`
                : "—"}
            </p>
            {status.balance !== null && status.balance !== undefined && (
              <p className="text-sm text-muted-foreground mt-0.5">
                ≈ ${(status.balance * 0.02).toFixed(2)} at $0.02/trace
              </p>
            )}
          </div>
        )}

        {showLowBalanceWarning && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
            Low balance warning: your account balance ({status.balance} credits) is below your threshold of {config.lowBalanceThreshold} credits. Consider adding funds to avoid trace failures.
          </div>
        )}
      </div>

      {/* B. Monthly Spend Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Monthly Spend</h2>
        <p className="text-xs text-muted-foreground">{monthName}</p>

        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tabular-nums">
            ${monthlySpend.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground mb-0.5">
            / ${monthlyCapNum.toFixed(2)} cap
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCapExceeded ? "bg-orange-500" : "bg-primary"
            }`}
            style={{ width: `${spendPercent}%` }}
          />
        </div>

        {isCapExceeded && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30 px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
            Monthly soft cap exceeded (${monthlySpend.toFixed(2)} / ${monthlyCapNum.toFixed(2)}) — this is a warning, not a hard block.
          </div>
        )}
      </div>

      {/* C. Run History Table Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Recent Runs</h2>

        {recentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skip trace runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="pb-2 text-left pr-4">Date</th>
                  <th className="pb-2 text-right pr-4">Properties</th>
                  <th className="pb-2 text-right pr-4">Found</th>
                  <th className="pb-2 text-right pr-4">Not Found</th>
                  <th className="pb-2 text-right">Credits</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((entry, i) => {
                  const foundRate =
                    entry.count > 0
                      ? Math.round((entry.found / entry.count) * 100)
                      : 0;
                  const dateLabel = new Date(entry.date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric" }
                  );
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-left">{dateLabel}</td>
                      <td className="py-2 pr-4 text-right">{entry.count}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className="inline-flex items-center gap-1">
                          {entry.found}
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {foundRate}%
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{entry.notFound}</td>
                      <td className="py-2 text-right">${entry.creditsUsed.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* D. Cost Controls Configuration Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Cost Controls</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="lowBalanceThreshold"
            >
              Low Balance Warning (credits)
            </label>
            <input
              id="lowBalanceThreshold"
              type="number"
              min="0"
              step="1"
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="100"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="monthlyCap"
            >
              Monthly Soft Cap (credits)
            </label>
            <input
              id="monthlyCap"
              type="number"
              min="0"
              step="1"
              value={monthlyCap}
              onChange={(e) => setMonthlyCap(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="50.00"
            />
          </div>
        </div>

        {saveResult && "error" in saveResult && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            {saveResult.error}
          </p>
        )}
        {saveResult && "success" in saveResult && (
          <p className="text-sm text-green-700 dark:text-green-400 rounded-md border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30 px-3 py-2">
            Settings saved.
          </p>
        )}

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isSaving ? "Saving…" : "Save Cost Controls"}
        </button>
      </div>
    </div>
  );
}
