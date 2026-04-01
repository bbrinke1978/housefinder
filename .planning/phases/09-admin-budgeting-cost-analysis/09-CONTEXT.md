# Phase 9: Admin Budgeting & Cost Analysis - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** User conversation — Brian described rehab budget tracking needs

<domain>
## Phase Boundary

Add a comprehensive rehab budgeting and cost tracking system to HouseFinder. When Brian and Shawn acquire a property for wholesaling or rehab, they need to track all costs against a planned budget — materials, labor, permits, unexpected costs. Receipt photo upload with auto-scanning is a key feature. Visual budget health indicators (charts, progress bars) show when spending approaches or exceeds the plan.

This integrates with the existing Deals section — a deal that moves to "Under Contract" or beyond needs budget tracking.

</domain>

<decisions>
## Implementation Decisions

### Budget Creation
- Each deal can have a rehab budget created from the deal detail page
- Budget has categories: Demo, Foundation, Framing, Plumbing, Electrical, HVAC, Roofing, Drywall, Flooring, Paint, Kitchen, Bathroom, Landscaping, Permits, Miscellaneous
- Each category has a planned amount (from the deal's repair estimate breakdown)
- Total planned budget ties to the deal's repair_estimate field

### Receipt Upload & Auto-Scanning
- Upload receipt photos (phone camera or file upload)
- OCR auto-scan to extract: vendor, amount, date, category (if detectable)
- User confirms/corrects scanned data before saving
- Receipts stored as images (need cloud storage — Azure Blob or similar)
- Each receipt links to a budget category

### Expense Tracking
- Manual expense entry (vendor, amount, date, category, notes)
- Receipt-backed expenses show the receipt image
- Running totals per category
- Overall total vs planned budget

### Budget Visualization
- Pie chart: spending by category
- Progress bar per category: actual vs planned (green/yellow/red)
- Overall budget health: total spent vs total planned
- Alert when approaching budget (80% threshold) or over budget
- Dashboard-style summary on the deal detail page

### Reporting
- Export budget to CSV/PDF
- Summary view: planned vs actual per category with variance

### Claude's Discretion
- OCR technology choice (Tesseract.js client-side, Azure Computer Vision, or Google Vision API)
- Image storage approach (Azure Blob Storage vs base64 in DB vs Cloudinary)
- Database schema for budgets, expenses, receipts
- Whether budget lives as a tab on deal detail or a separate page
- Mobile camera integration approach

</decisions>

<specifics>
## Specific Ideas

- Receipt scanning should work from phone camera (mobile-first)
- Budget categories should be customizable (add/remove)
- Visual indicators: green (under 80%), yellow (80-100%), red (over 100%)
- Tie budget total to deal's repair_estimate for consistency
- Consider a "Budget vs Actual" comparison chart (bar chart with planned/actual side by side)

</specifics>

<deferred>
## Deferred Ideas

- Multi-user expense approval workflow
- Contractor payment tracking
- Invoice generation
- QuickBooks/accounting integration
- Historical budget templates (use last project's actuals as next project's estimate)

</deferred>

---

*Phase: 09-admin-budgeting-cost-analysis*
*Context gathered: 2026-03-29 from user conversation*
