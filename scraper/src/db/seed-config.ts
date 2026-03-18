import { db, pool } from "./client.js";
import { scraperConfig } from "./schema.js";
import type { ScoringConfig } from "../scoring/types.js";

// ── Default scoring configuration ───────────────────────────────────────────

const DEFAULT_SIGNALS = [
  { signal_type: "nod", weight: 3, freshness_days: 75 },
  { signal_type: "tax_lien", weight: 2, freshness_days: 365 },
  { signal_type: "lis_pendens", weight: 2, freshness_days: 180 },
  { signal_type: "probate", weight: 1, freshness_days: 365 },
  { signal_type: "code_violation", weight: 1, freshness_days: 365 },
  { signal_type: "vacant", weight: 1, freshness_days: 365 },
];

const DEFAULT_HOT_LEAD_THRESHOLD = 4;
const DEFAULT_RATE_LIMIT_MS = 1500;

/**
 * Returns the default scoring config as a typed ScoringConfig object.
 * Useful as a fallback if the DB has no config rows yet.
 */
export function getDefaultConfig(): ScoringConfig {
  return {
    signals: DEFAULT_SIGNALS,
    hot_lead_threshold: DEFAULT_HOT_LEAD_THRESHOLD,
  };
}

/**
 * Seed the scraperConfig table with default scoring configuration.
 * Idempotent -- uses ON CONFLICT DO NOTHING so safe to run multiple times.
 */
export async function seedDefaultConfig(): Promise<void> {
  await db
    .insert(scraperConfig)
    .values([
      {
        key: "scoring_signals",
        value: JSON.stringify(DEFAULT_SIGNALS),
        description:
          "Signal type weights and freshness windows for distress scoring. " +
          "NOD is highest (3) due to ~90 day auction window in Utah. " +
          "Threshold of 4 means NOD alone (3) is not hot, but NOD + any other signal (5) is.",
      },
      {
        key: "hot_lead_threshold",
        value: String(DEFAULT_HOT_LEAD_THRESHOLD),
        description:
          "Minimum weighted score to flag a property as a hot lead. " +
          "Default 4 requires multiple signals or one NOD + another.",
      },
      {
        key: "scraper_rate_limit_ms",
        value: String(DEFAULT_RATE_LIMIT_MS),
        description:
          "Milliseconds to wait between scraper page requests. Range: 1000-2000 per user requirement.",
      },
    ])
    .onConflictDoNothing();

  // ── Alert configuration keys ────────────────────────────────────────────
  await db
    .insert(scraperConfig)
    .values([
      {
        key: "alerts.email.enabled",
        value: "true",
        description: "Enable email alerts for hot leads (true/false).",
      },
      {
        key: "alerts.sms.enabled",
        value: "true",
        description: "Enable SMS alerts for hottest leads (true/false).",
      },
      {
        key: "alerts.email.threshold",
        value: "2",
        description:
          "Minimum distress score to trigger an email alert. Default 2 catches most leads.",
      },
      {
        key: "alerts.sms.threshold",
        value: "3",
        description:
          "Minimum distress score to trigger an SMS alert. Default 3 limits SMS to hottest leads.",
      },
      {
        key: "alerts.email.recipient",
        value: "",
        description:
          "Email address for hot lead alerts — set via env or Settings page.",
      },
      {
        key: "alerts.sms.recipient",
        value: "",
        description:
          "Phone number for SMS alerts — set via env or Settings page.",
      },
    ])
    .onConflictDoNothing();

  console.log("Default scoring config seeded successfully.");
  console.log("Alert config keys seeded successfully.");
}

// ── CLI entry point ─────────────────────────────────────────────────────────

const isDirectRun =
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` ||
  import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  seedDefaultConfig()
    .then(() => {
      console.log("Done.");
      return pool.end();
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exitCode = 1;
      return pool.end();
    });
}
