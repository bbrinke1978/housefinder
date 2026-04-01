# Phase 6: Data Analytics & Insights - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** Requirements ANALYTICS-01 through ANALYTICS-08 + user preference to build all 8

<domain>
## Phase Boundary

Add a comprehensive analytics section to HouseFinder. Provides visibility into lead pipeline performance, market trends, outreach effectiveness, and scraper health — enabling data-driven decisions about which markets to focus on, when to act, and what's working.

New "/analytics" page in the sidebar with multiple chart/table views.

</domain>

<decisions>
## Implementation Decisions

### Analytics Dashboard
- New "Analytics" section in sidebar navigation
- Sub-sections or tabs for different analytics views
- All charts start empty and populate as data accumulates — that's expected

### Pipeline Conversion Funnel (ANALYTICS-01)
- Show lead progression rates: New → Contacted → Follow-Up → Closed/Dead
- Average time at each stage
- Use existing leads.status field for tracking

### Market Comparison (ANALYTICS-02)
- Which cities/counties produce most hot leads
- Highest conversion rates by area
- Fastest deal timelines by market
- Data already available from existing properties + leads tables

### Outreach Activity Tracking (ANALYTICS-03)
- Track call attempts per lead: answered, voicemail, no-answer, wrong-number
- Contact rates by source (Tracerfy vs manual)
- Needs a new activity/call log table or extend lead_notes

### Trend Charts (ANALYTICS-04)
- Distressed property volume over time per city/county
- Spot markets heating up or cooling down
- Use first_seen_at timestamps from leads table

### Scraper Health Dashboard (ANALYTICS-05)
- Per-county success rates from scraper_health table
- Data freshness indicators
- Degrading source alerts
- Data already available in scraper_health table

### Lead Source Attribution (ANALYTICS-06)
- Which distress signal types (NOD, tax lien, etc.) produce most conversions
- Track which leads became deals
- Needs deal-to-lead linking (propertyId FK already exists on deals)

### Activity Log (ANALYTICS-07)
- Capture all user actions: calls, notes, status changes with timestamps
- Personal productivity review
- lead_notes and deal_notes already capture some of this

### CSV Export (ANALYTICS-08)
- Export all analytics data to CSV for external analysis
- Export filtered property lists, deal pipeline, buyer list

### Claude's Discretion
- Chart library selection (recharts is common with Next.js)
- Layout of analytics page (tabs vs scrolling sections)
- Data aggregation approach (server-side SQL vs client-side)
- How to handle empty states (no data yet)

</decisions>

<specifics>
## Specific Ideas

- Use recharts (already popular in Next.js ecosystem) for charts
- Server-side data aggregation via SQL for performance
- Empty states with encouraging messages ("Start tracking calls to see your outreach stats")
- Scraper health should show red/yellow/green indicators per county
- CSV export via server action that generates and returns the file

</specifics>

<deferred>
## Deferred Ideas

- Real-time push notifications for scraper failures
- Automated weekly email reports
- Goal setting / KPI targets

</deferred>

---

*Phase: 06-data-analytics-insights*
*Context gathered: 2026-03-29*
