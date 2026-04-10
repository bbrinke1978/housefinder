# Phase 18: Tracerfy Options - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Bring the existing Tracerfy skip tracing API integration into the No BS Workbench UI. Users can trigger lookups (single, bulk, auto on deal creation), view results on contact cards, manage API configuration, and track spend — all without touching Azure Functions directly.

The Tracerfy API integration already exists in `scraper/src/sources/tracerfy-enrichment.ts`. This phase surfaces it in the frontend and moves the trigger logic to the Workbench.

</domain>

<decisions>
## Implementation Decisions

### Trigger points
- **Contact card button:** "Skip Trace" button on property detail Contact tab — runs Tracerfy for a single property
- **Bulk from dashboard:** Multi-select checkboxes on dashboard property list, "Skip Trace Selected" action — no batch size limit, confirmation dialog shows count + estimated cost
- **Auto on deal creation:** When promoting a lead to a deal with no contact info, show a dialog: "No contact info — run skip trace? (~$0.02)" with Yes/No. User stays in control.

### Settings & API config
- **Dedicated settings page:** New "Skip Tracing" section under Settings (like Mail Settings page)
- **API key storage:** Env var in Netlify (TRACERFY_API_KEY) — NOT in database. Settings page shows connection status (green/red) and balance but never exposes the key
- **Mini-dashboard on settings page:**
  - Connection status indicator (configured/not configured, valid/invalid)
  - Live credit balance from Tracerfy /analytics/ endpoint
  - Run history table: date, count, found rate, credits used
  - Monthly spend tracking with visual indicator

### Results display
- **Auto-populate contact card:** Phone numbers and emails automatically appear on the contact card with a "tracerfy" source badge. Tap-to-call ready immediately.
- **Multiple results:** All returned numbers/emails visible on contact card. Primary phone at top with call button. Others listed below with type labels (mobile, landline).
- **Dashboard badge:** Small icon on property cards showing trace status: traced with results, traced no results, or not traced
- **No results handling:** "No skip trace results" badge on contact card with option to manually enter info. Property marked so it won't be re-queried.

### Cost controls
- **Always confirm with cost:** Every trace (single or bulk) shows confirmation dialog: "Skip trace X properties? Est. cost: $X.XX. Current balance: $X.XX. Proceed?"
- **Low balance warning:** Yellow banner on Settings page and in confirmation dialog when balance drops below configurable threshold (default $2.00)
- **Monthly soft cap:** $50/month default. Warning notification when exceeded, not a hard block. Shown on settings mini-dashboard.

### Claude's Discretion
- Settings page layout and component structure
- Exact badge/icon design for trace status
- How to handle Tracerfy API errors/timeouts in the UI
- Loading states during trace execution (spinner, progress, etc.)

</decisions>

<specifics>
## Specific Ideas

- Settings page should feel like a "mini dashboard for spend" — something you can glance at to see if Tracerfy is burning through credits without you noticing
- Confirmation dialogs should always show current balance so you know where you stand
- The existing scraper-side Tracerfy code can be adapted for the frontend — same API, same result parsing, different trigger

</specifics>

<deferred>
## Deferred Ideas

- Phase 20: Security Review — audit all code and Azure infrastructure for security issues, review API key storage, env var handling, Key Vault integration
- Moving API keys from env vars to Azure Key Vault (Phase 20 scope)

</deferred>

---

*Phase: 18-tracerfy-options*
*Context gathered: 2026-04-10*
