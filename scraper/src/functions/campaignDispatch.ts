import { app, InvocationContext, Timer } from "@azure/functions";
import { dispatchCampaignEmails } from "../alerts/campaign-dispatch.js";

/**
 * Daily campaign email dispatch timer trigger.
 *
 * Runs at 5:15 AM Mountain Time — 15 minutes after dailyScrape (5:00 AM MT)
 * so new leads are scored and processed before campaigns fire.
 *
 * Schedule: 0 15 12 * * * = 12:15 UTC = 5:15 AM MDT (UTC-6 during Mountain Daylight Time)
 * During Mountain Standard Time (UTC-7) this fires at 5:15 AM MST.
 *
 * runOnStartup: false — NEVER true in production (fires on every scale-out event).
 */
async function campaignDispatch(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Campaign dispatch starting...");

  if (myTimer.isPastDue) {
    context.warn(
      "Timer is past due -- running catch-up execution. This may indicate the Function App was stopped or scaled down."
    );
  }

  try {
    const result = await dispatchCampaignEmails();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    context.log("Campaign dispatch complete", {
      sent: result.sent,
      stopped: result.stopped,
      errors: result.errors,
      elapsedSeconds: elapsed,
      isPastDue: myTimer.isPastDue,
    });
  } catch (err) {
    context.error("Campaign dispatch failed", err);
  }
}

// Register the Azure Functions timer trigger
app.timer("campaignDispatch", {
  schedule: "0 15 12 * * *",
  runOnStartup: false,
  handler: campaignDispatch,
});

export { campaignDispatch };
