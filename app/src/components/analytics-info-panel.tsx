"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

type TabId = "pipeline" | "markets" | "trends" | "health" | "outreach" | "activity";

interface TabInfo {
  what: string;
  lookFor: string[];
  getsRicher: string;
  proTip?: string;
}

const TAB_INFO: Record<TabId, TabInfo> = {
  pipeline: {
    what:
      "This funnel shows how your leads progress through each status stage — from New to Contacted to Follow-Up to Closed or Dead.",
    lookFor: [
      "Where are leads getting stuck? If most leads are \"New\" and few are \"Contacted\", you need to make more calls.",
      "If many are \"Contacted\" but few move to \"Follow-Up\", your pitch may need work.",
    ],
    getsRicher:
      "As you update lead statuses (mark them Contacted, Follow-Up, etc.), the funnel fills in. After a few weeks of active use, you'll see clear patterns in your conversion rates.",
  },
  markets: {
    what:
      "This compares your target cities side by side — showing which areas have the most distressed properties and the highest concentration of hot leads.",
    lookFor: [
      "Focus your driving-for-dollars and outreach on cities with the highest hot lead density.",
      "A city with 50 hot leads is a better use of your Saturday than one with 5.",
    ],
    getsRicher:
      "As scrapers run daily and new NOD/tax lien data comes in, you'll see which markets are heating up (more new distressed properties) or cooling down.",
  },
  trends: {
    what:
      "This chart tracks how many new distressed properties are being discovered over time in each county.",
    lookFor: [
      "Rising trends mean more opportunity — the market is producing more distressed properties.",
      "Falling trends might mean the market is stabilizing or you've already worked through the easy ones.",
    ],
    getsRicher:
      "This chart becomes most valuable after 2-3 months of data. You'll be able to spot seasonal patterns (tax sales happen in spring, foreclosures spike after holidays).",
  },
  health: {
    what:
      "This shows the real-time status of each county's data scraper — whether it's running successfully, how fresh the data is, and if any sources have gone stale.",
    lookFor: [
      "Green = healthy (ran recently with results).",
      "Yellow = warning (ran but got few results).",
      "Red = alert (3+ consecutive zero-result runs — the source may have changed or gone offline).",
    ],
    getsRicher:
      "If a scraper turns red, let Claude know — the county website may have changed its layout or moved its data.",
  },
  outreach: {
    what:
      "This tracks your call activity — how many calls you've made, what the outcomes were (answered, voicemail, no answer, wrong number), and your overall contact rate.",
    lookFor: [
      "A healthy contact rate is 15-25% (roughly 1 in 5 calls gets answered). If yours is lower, try calling at different times.",
      "Track which lead sources (Tracerfy vs manual) produce better pick-up rates.",
    ],
    getsRicher:
      "Log every call using the form below. After 50-100 calls, you'll have solid data on your best times to call, which sources work, and your personal conversion rate.",
    proTip:
      "Even voicemails count — many sellers call back. Log the initial attempt so you can track follow-ups.",
  },
  activity: {
    what:
      "This is your complete activity timeline — every note you've added, every status change, every call you've logged, all in chronological order.",
    lookFor: [
      "Use this for your weekly review. How many touches did you make this week? Are you consistent?",
      "The most successful wholesalers make 20+ contacts per week.",
    ],
    getsRicher:
      "Over time, this becomes your personal CRM history. When a seller calls back 3 months later, you can quickly see every interaction you've had with them.",
  },
};

interface AnalyticsInfoPanelProps {
  tab: TabId;
}

export function AnalyticsInfoPanel({ tab }: AnalyticsInfoPanelProps) {
  const [open, setOpen] = useState(false);
  const info = TAB_INFO[tab];

  if (!info) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          About this view
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* What is this */}
          <p className="text-sm text-muted-foreground">{info.what}</p>

          {/* What to look for */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              What to look for
            </h4>
            <ul className="space-y-1">
              {info.lookFor.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-primary flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How it gets better */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              How it gets richer over time
            </h4>
            <p className="text-sm text-muted-foreground">{info.getsRicher}</p>
          </div>

          {/* Pro tip (optional) */}
          {info.proTip && (
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 px-4 py-3">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Pro tip: </span>
                {info.proTip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
