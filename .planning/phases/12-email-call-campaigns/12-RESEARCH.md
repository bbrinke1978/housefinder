# Phase 12: Email & Call Campaigns - Research

**Researched:** 2026-04-02
**Domain:** Email sequences (Resend + react-email), call outcome logging, campaign management, activity timeline
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email Sending Approach**
- Send emails via Resend — not Gmail API, not copy-paste
- Multi-step drip sequences: Initial email + configurable follow-ups with day delays (reference: 5/5/7 day pattern)
- Placeholders/merge fields: Claude's discretion based on available data in properties/contacts tables
- Auto-stop sequences when a lead's deal stage changes (e.g., Closed Won, Closed Lost)
- One sequence per lead at a time — enrolling in new sequence unenrolls from current
- Leads must have a contact email (from Tracerfy enrichment) before enrollment

**Call Logging & Workflow**
- Log outcomes only — no integrated dialer. Users call from their own phone/Google Voice
- Phone numbers render as `tel:` links so Google Voice or native dialer handles them
- Contact types match reference app: Called client, Left voicemail, Emailed client, Sent text, Met in person, Received email
- Talk track / call script feature: display a configurable script with lead details pre-filled when about to call
- Touchpoint counter on property cards — Claude's discretion on badge design (simple count vs icon breakdown)
- Activity timeline on property and deal detail pages showing all contacts chronologically

**Campaign Targeting**
- Manual enrollment only (no auto-enrollment rules)
- Enroll from both places: individual from property/deal detail page, OR bulk-select from dashboard
- Require contact email before enrollment — clear indicator showing which leads have email

**Dashboard Integration**
- New "Campaigns" page in sidebar for sequence management (create/edit sequences, view active campaigns, enrollment counts, send stats)
- Mail Settings gear icon in bottom-left of sidebar, labeled "Mail Settings"
- Mail Settings includes: From Name, From Email, Reply-To Email, Resend API Key, Phone Number (for signature), Email Signature template
- Keep existing deal stages from Phase 8 — campaign auto-stop triggers off those stages
- Contact outcome types are fixed (not user-configurable in this phase)

**Google Workspace**
- Google Voice: `tel:` links on phone numbers (works immediately, no API needed)
- Gmail sync, Calendar follow-ups: RESEARCH NEEDED (see findings below)
- Brian has a Google Voice number; multi-user scenario means each user dials from their own phone

### Claude's Discretion
- Merge field set based on available data in properties/contacts/deals tables
- Touchpoint badge design on property cards (count vs icon breakdown)
- Email signature template format
- Activity timeline UI design
- Best practices for email sending limits/throttling to avoid spam flags

### Deferred Ideas (OUT OF SCOPE)
- Gmail API sync (send record back to Gmail) — research first, may be future phase
- Google Calendar follow-up reminders — research first, may be future phase
- Auto-enrollment rules (score-based, distress-type-based) — future enhancement
- Configurable contact outcome types — future enhancement if needed
- SMS/text messaging integration — separate phase
</user_constraints>

---

## Summary

Phase 12 builds email outreach sequences and contact activity logging into HouseFinder. The email layer uses Resend (already used in the project for alerts) with react-email templates (also already installed in the scraper). The drip sequence logic must be built in application code — Resend has no native sequence/automation builder. The pattern is: store sequence definitions and per-lead enrollment state in PostgreSQL, then have the existing Azure Functions timer trigger (runs daily at 5 AM MT) poll for "due" emails and send them.

The call/contact logging system is an extension of the existing `callLogs` table in schema.ts. That table currently tracks 4 call outcomes via a `callOutcomeEnum`. Phase 12 expands this to all 6 contact types from the reference app (Called client, Left voicemail, Emailed client, Sent text, Met in person, Received email) and adds the activity timeline and touchpoint counter UI. The `callLogs` table will need to be renamed or extended, or a new `contact_events` table introduced to cover non-phone contact types.

For Google Workspace: `tel:` links are already correct for Google Voice (no API needed). Gmail API requires OAuth with `gmail.send` scope, is classified as a "sensitive scope" requiring app verification (2-3 week process minimum), and is not recommended for this phase. Google Calendar API has similar OAuth complexity but can be used by a single-user app in "Testing" mode without verification. Both should remain deferred per the CONTEXT.md decision.

**Primary recommendation:** Build drip sequence logic in-app using PostgreSQL state tables + existing Azure Functions timer trigger. Use Resend `resend.emails.send()` with `react` parameter and react-email templates (same pattern already used in the scraper's `email.tsx`). Do not integrate Gmail or Calendar APIs in this phase.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | ^6.9.4 (already in scraper) | Transactional email sending API | Already used in project for alert emails; React-email native support; TypeScript-first |
| `@react-email/components` | ^1.0.10 (already in scraper) | HTML email template primitives | Used in scraper's `email.tsx`; cross-client compatible email components |
| `drizzle-orm` | ^0.45.1 (already in app) | DB schema for sequences, enrollments, contact events | Already the project ORM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^4.1.0 (already in app) | Date arithmetic for sequence step scheduling | Calculating "send_at" timestamps for each drip step |
| `lucide-react` | ^0.577.0 (already in app) | Icons for campaigns page (Mail, Phone, Calendar icons) | All icon needs covered |
| `zod` | ^4.3.6 (already in app) | Validate sequence and mail settings inputs | Server action validation, consistent with existing pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Gmail API | Gmail requires OAuth sensitive-scope verification (weeks), rate-limited at 500/day free; Resend is already set up and has 100/day free |
| In-app timer trigger | Inngest / BullMQ | Azure Functions timer already in use for scraping; no new infra needed |
| PostgreSQL state tables | Redis/queue | Project has no Redis; DB-driven scheduling is simpler for this scale (single user, dozens of leads) |

**Installation:**
```bash
# Both packages are already installed in the scraper.
# Add to the app for email templates sent from server actions:
npm install resend @react-email/components
```

Note: `resend` and `@react-email/components` are in the scraper's `package.json` but NOT yet in `app/package.json`. They need to be added to the app.

---

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── db/
│   └── schema.ts                  # Add: email_sequences, email_steps, campaign_enrollments,
│                                  #       contact_events, mail_settings tables
├── lib/
│   ├── campaign-actions.ts        # Server actions: create/edit sequences, enroll, unenroll
│   ├── campaign-queries.ts        # DB queries: active enrollments, due steps, stats
│   ├── contact-event-actions.ts   # Server actions: log call/email/text/meeting outcome
│   └── mail-settings-actions.ts   # Server actions: save/load Resend config
├── components/
│   ├── campaigns/
│   │   ├── sequence-editor.tsx    # Create/edit email sequence (name, steps, delays)
│   │   ├── sequence-list.tsx      # List of sequences with enrollment counts
│   │   ├── campaign-table.tsx     # Active enrollments with lead name, step status
│   │   └── enroll-button.tsx      # Enroll single lead; shows email-required state
│   ├── contact-event-form.tsx     # Log contact event (type select + notes)
│   ├── activity-timeline.tsx      # Chronological list of all contact events
│   ├── touchpoint-badge.tsx       # Count badge for property cards
│   ├── call-script-modal.tsx      # Talk track / call script with merge fields
│   └── email/
│       └── outreach-template.tsx  # React-email component for outreach drip emails
└── app/(dashboard)/
    ├── campaigns/
    │   └── page.tsx               # Campaigns management page
    └── settings/
        └── mail/
            └── page.tsx           # Mail Settings page
```

### Pattern 1: Database-Driven Drip Sequence State Machine

**What:** All drip sequence state lives in PostgreSQL. The Azure Functions timer fires daily and processes "pending email steps where send_at <= NOW()".

**When to use:** Small single-user app with dozens of leads; no external queue needed; consistent with existing scraper timer pattern.

**Schema design:**
```typescript
// Source: Drizzle ORM pattern from existing schema.ts

// Sequence template definition
export const emailSequences = pgTable("email_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Steps within a sequence (initial + follow-ups)
export const emailSteps = pgTable("email_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id").notNull().references(() => emailSequences.id),
  stepNumber: integer("step_number").notNull(), // 0 = immediate, 1 = +5 days, etc.
  delayDays: integer("delay_days").notNull().default(0),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(), // stores template with {firstName}, {address}, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_email_step_order").on(t.sequenceId, t.stepNumber),
]);

// Per-lead enrollment (one active at a time)
export const campaignEnrollments = pgTable("campaign_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  sequenceId: uuid("sequence_id").notNull().references(() => emailSequences.id),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  // status: active | paused | completed | stopped
  nextSendAt: timestamp("next_send_at", { withTimezone: true }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  stopReason: text("stop_reason"), // "deal_closed" | "unenrolled" | "completed" | "email_bounced"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // only one active enrollment per lead at a time (enforced in code + soft unique)
  index("idx_enrollments_lead_id").on(t.leadId),
  index("idx_enrollments_next_send_at").on(t.nextSendAt),
]);

// Sent email log (audit trail)
export const emailSendLog = pgTable("email_send_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id").notNull().references(() => campaignEnrollments.id),
  stepId: uuid("step_id").notNull().references(() => emailSteps.id),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  toEmail: text("to_email").notNull(),
  resendEmailId: text("resend_email_id"), // Resend's returned email ID
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // sent | bounced | failed
});
```

### Pattern 2: Contact Events Table (replaces/extends callLogs)

**What:** The existing `callLogs` table only handles 4 call outcomes via `callOutcomeEnum`. Phase 12 needs 6 contact types. Best approach: add a `contact_events` table that covers all contact types and is used for the activity timeline.

**Decision:** Keep `callLogs` as-is (don't break analytics that use it). Add `contact_events` as the new unified table for Phase 12. The call log form in analytics can remain; the new contact event form feeds the timeline.

```typescript
// Source: Pattern consistent with existing schema.ts

export const contactEventTypeEnum = pgEnum("contact_event_type", [
  "called_client",
  "left_voicemail",
  "emailed_client",
  "sent_text",
  "met_in_person",
  "received_email",
]);

export const contactEvents = pgTable("contact_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  eventType: contactEventTypeEnum("event_type").notNull(),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_contact_events_lead_id").on(t.leadId),
  index("idx_contact_events_occurred_at").on(t.occurredAt),
]);
```

### Pattern 3: Mail Settings via scraperConfig Table

**What:** Store Resend API key, from name, from email, reply-to, phone, and email signature in the existing `scraperConfig` key-value table. This is exactly how alert settings are stored today.

**When to use:** Consistent with existing Settings pattern. No new table needed.

```typescript
// Source: Existing pattern from lib/actions.ts + seed-config.ts
// Keys to add:
const MAIL_SETTINGS_KEYS = {
  MAIL_FROM_NAME:  "mail.fromName",
  MAIL_FROM_EMAIL: "mail.fromEmail",
  MAIL_REPLY_TO:   "mail.replyTo",
  MAIL_RESEND_KEY: "mail.resendApiKey",  // stored encrypted or as env var reference
  MAIL_PHONE:      "mail.phone",
  MAIL_SIGNATURE:  "mail.signature",     // HTML/text template
};
```

**Security note:** Storing the Resend API key in the DB is acceptable for a single-user personal tool. However, consider using the existing `RESEND_API_KEY` env var rather than DB storage to avoid key rotation complexity.

### Pattern 4: Drip Dispatch via Azure Functions Timer

**What:** The existing Azure Functions timer trigger (`scraper/src/index.ts`) fires daily at 5 AM MT. Add a `dispatchCampaignEmails` handler to the same timer that queries `campaign_enrollments` for due emails.

**When to use:** Reuses existing infra; single deployment unit; consistent with project pattern.

```typescript
// Source: Existing timer pattern from scraper index.ts
// Add to existing daily timer:
async function dispatchCampaignEmails(appUrl: string): Promise<void> {
  // 1. Query enrollments where status='active' AND next_send_at <= NOW()
  // 2. For each due enrollment:
  //    a. Fetch the email step template
  //    b. Resolve merge fields from lead/property/owner_contacts
  //    c. Send via resend.emails.send({ react: OutreachTemplate(...) })
  //    d. Insert into email_send_log
  //    e. Advance enrollment: increment currentStep, calculate next nextSendAt
  //    f. If no more steps: set status='completed'
  // 3. Auto-stop: query enrollments for leads whose deal status is 'closed' or 'dead'
  //    and set status='stopped', stopReason='deal_closed'
}
```

### Pattern 5: Resend Email Sending (App-side for Immediate Step 0)

**What:** Step 0 (immediate send) fires when a lead is enrolled. This happens in a server action, not the timer. Use Resend directly from the Next.js server action.

```typescript
// Source: https://resend.com/docs/send-with-nextjs
// Consistent with existing scraper/src/alerts/email.tsx pattern

import { Resend } from "resend";
import { OutreachTemplate } from "@/components/email/outreach-template";

export async function enrollLeadInSequence(
  leadId: string,
  sequenceId: string
): Promise<{ success: boolean; error?: string }> {
  "use server";
  
  // 1. Validate lead has email in owner_contacts
  // 2. Unenroll from any existing active sequence (soft-stop)
  // 3. Insert campaign_enrollment record
  // 4. Send step 0 immediately via Resend
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${mailSettings.fromName} <${mailSettings.fromEmail}>`,
    to: ownerEmail,
    replyTo: mailSettings.replyTo,
    subject: resolvedSubject,
    react: OutreachTemplate({ firstName, address, senderName, signature }),
  });
  
  if (error) return { success: false, error: error.message };
  
  // 5. Log to email_send_log with resend email ID
  // 6. Set nextSendAt = NOW() + step[1].delayDays (for the follow-up)
  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Using `scheduledAt` in Resend for drip delays:** Resend's `scheduledAt` only schedules up to 30 days in advance per individual call. It doesn't manage state across a sequence. Build state in PostgreSQL, not Resend.
- **Sending all sequence steps at enrollment:** Pre-scheduling all emails at enrollment time means you can't auto-stop if the deal closes. Always use DB state + timer dispatch.
- **Storing Resend API key in plain text DB with public access:** The app is auth-gated but use env var for the key or at minimum note this in settings UI.
- **Adding email address to callOutcomeEnum:** The existing `callOutcomeEnum` is a Postgres enum — adding values requires a migration. Don't modify it. Use the new `contact_events` table instead.
- **Breaking existing analytics that query callLogs:** The Analytics Outreach tab (`analytics-outreach.tsx`) queries `callLogs`. Leave that table untouched.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom HTML string builder | `@react-email/components` + React render | Cross-client email compatibility is extremely hard; Outlook, Gmail, Apple Mail all have quirks |
| Email delivery + bounce handling | Custom SMTP server | Resend API | Deliverability infrastructure, SPF/DKIM/DMARC management, bounce handling |
| Merge field substitution engine | Custom template parser | Simple `String.replace()` map over `{field}` tokens | The field set is small and known; no need for a templating library |
| Sequence scheduling | Cron expression parser | day-offset integers in `email_steps.delay_days` | Day-based delays are simpler than cron; matches the "5/5/7 day" reference pattern |
| Email open/click tracking | Custom pixel tracking | Resend webhooks (deferred to future) | Complex to implement correctly; not needed for MVP |

**Key insight:** Custom sequence engines are a rabbit hole. The entire state machine fits in 3 DB tables and a 50-line timer function.

---

## Common Pitfalls

### Pitfall 1: Duplicate Sends on Timer Retries
**What goes wrong:** Azure Functions timer may retry on failure. If `dispatchCampaignEmails` sends an email and then fails before advancing `currentStep`, it re-sends the same email on retry.
**Why it happens:** Non-atomic send + state update.
**How to avoid:** Insert into `email_send_log` FIRST, then send, then advance enrollment. On retry, check for existing `email_send_log` entry for that `(enrollmentId, stepId)` before sending. Use Resend's `idempotencyKey` parameter set to `${enrollmentId}-step-${stepNumber}`.
**Warning signs:** Owners complain about receiving duplicate emails.

### Pitfall 2: Resend Free Tier Daily Limit (100 emails/day)
**What goes wrong:** If many leads are enrolled and sequences run simultaneously, the 100 email/day free limit is hit, causing 429 errors on subsequent sends.
**Why it happens:** Free plan is 100 emails/day, 3,000/month.
**How to avoid:** For a single investor with dozens of leads, 100/day is fine unless hundreds of leads are in active sequences simultaneously. Add a check in dispatch: if daily quota is near limit, skip and retry tomorrow. Log failed sends in `email_send_log` with `status='quota_exceeded'`.
**Warning signs:** 429 response from Resend API.

### Pitfall 3: Enrolling Lead Without Verified Email
**What goes wrong:** Enrollment succeeds but email bounces — hurts domain sender reputation. Bounce rate above 4% causes Resend to pause sending.
**Why it happens:** `owner_contacts.email` exists but was not deliverable.
**How to avoid:** Show clear UI indicator of which leads have email. Hard-block enrollment UI when no email found. Log bounces from Resend into `email_send_log.status='bounced'` and auto-stop enrollment.

### Pitfall 4: One Active Enrollment Invariant
**What goes wrong:** Enrolling a lead in a second sequence without stopping the first creates two active enrollments, causing double sends.
**Why it happens:** Missing enforcement of the "one sequence per lead at a time" rule.
**How to avoid:** In `enrollLeadInSequence` server action: first UPDATE any existing `active` enrollment for that leadId to `status='stopped', stopReason='re-enrolled'`, THEN insert the new enrollment. Wrap in a DB transaction.

### Pitfall 5: Deal Auto-Stop Race Condition
**What goes wrong:** Timer fires, sends an email, then the deal is marked Closed in the same minute — email sends after the deal was closed.
**Why it happens:** Auto-stop check happens at timer start; send happens after.
**How to avoid:** Check deal status again immediately before each individual send in the dispatch loop. Acceptable for a single-user app where exact timing is not critical.

### Pitfall 6: react-email Not in app/package.json
**What goes wrong:** `OutreachTemplate` fails to render because `@react-email/components` is only in the scraper, not the app.
**Why it happens:** The app and scraper are separate packages. The email alert code in `scraper/src/alerts/email.tsx` imports react-email, but the app does not have it.
**How to avoid:** Add `resend` and `@react-email/components` to `app/package.json` in Wave 0.

---

## Code Examples

### Sending a Drip Email with Merge Fields

```typescript
// Source: Consistent with scraper/src/alerts/email.tsx and https://resend.com/docs/send-with-nextjs
import { Resend } from "resend";
import { render } from "@react-email/components";
import { OutreachTemplate } from "@/components/email/outreach-template";

interface MergeFields {
  firstName: string;       // from owner_contacts or properties.ownerName
  address: string;         // from properties.address
  city: string;            // from properties.city
  senderName: string;      // from mail_settings.fromName
  phone: string;           // from mail_settings.phone
  signature: string;       // from mail_settings.signature
}

function resolveMergeFields(subject: string, body: string, fields: MergeFields) {
  const replacements: Record<string, string> = {
    "{firstName}": fields.firstName,
    "{address}": fields.address,
    "{city}": fields.city,
    "{senderName}": fields.senderName,
    "{phone}": fields.phone,
  };
  return {
    subject: Object.entries(replacements).reduce(
      (s, [k, v]) => s.replaceAll(k, v), subject
    ),
    body: Object.entries(replacements).reduce(
      (s, [k, v]) => s.replaceAll(k, v), body
    ),
  };
}

async function sendOutreachEmail(
  resendApiKey: string,
  mailSettings: MailSettings,
  toEmail: string,
  subject: string,
  bodyHtml: string,
  idempotencyKey: string
) {
  const resend = new Resend(resendApiKey);
  return await resend.emails.send({
    from: `${mailSettings.fromName} <${mailSettings.fromEmail}>`,
    to: toEmail,
    replyTo: mailSettings.replyTo,
    subject,
    react: OutreachTemplate({ bodyHtml, signature: mailSettings.signature }),
    headers: { "X-Idempotency-Key": idempotencyKey },
  });
}
```

### Drip Dispatch Query (Daily Timer)

```typescript
// Source: Consistent with existing drizzle patterns in lib/queries.ts
import { db } from "@/db/client";
import { campaignEnrollments, emailSteps, leads, ownerContacts } from "@/db/schema";
import { and, eq, lte, isNotNull } from "drizzle-orm";

async function getDueEnrollments() {
  return await db
    .select({
      enrollmentId: campaignEnrollments.id,
      leadId: campaignEnrollments.leadId,
      currentStep: campaignEnrollments.currentStep,
      sequenceId: campaignEnrollments.sequenceId,
    })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        lte(campaignEnrollments.nextSendAt, new Date()),
        isNotNull(campaignEnrollments.nextSendAt)
      )
    );
}
```

### Activity Timeline Query

```typescript
// Source: Consistent with existing queries pattern
// Union contact_events (phase 12) + lead_notes (existing) for full timeline
async function getLeadTimeline(leadId: string) {
  const events = await db
    .select({
      id: contactEvents.id,
      type: contactEvents.eventType,
      notes: contactEvents.notes,
      occurredAt: contactEvents.occurredAt,
    })
    .from(contactEvents)
    .where(eq(contactEvents.leadId, leadId))
    .orderBy(desc(contactEvents.occurredAt));

  const notes = await db
    .select({
      id: leadNotes.id,
      type: sql<string>`'note'`,
      notes: leadNotes.noteText,
      occurredAt: leadNotes.createdAt,
    })
    .from(leadNotes)
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));

  return [...events, ...notes].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
  );
}
```

### Touchpoint Count Query (for property card badges)

```typescript
// Source: Count pattern consistent with existing dashboard stats queries
async function getLeadTouchpointCounts(leadIds: string[]) {
  return await db
    .select({
      leadId: contactEvents.leadId,
      count: count(),
    })
    .from(contactEvents)
    .where(inArray(contactEvents.leadId, leadIds))
    .groupBy(contactEvents.leadId);
}
```

---

## Google Workspace API Decision

### Gmail API
**Verdict: Defer to future phase.** The Gmail API `gmail.send` scope is classified as a "sensitive scope" by Google, requiring OAuth app verification before production use. Verification involves a privacy policy, app homepage, brand verification (2-3 days), and sensitive scope review (can take weeks). For a personal single-user app, the user can click through the "unverified app" warning but this is fragile and risky for email sending. Since Resend already sends emails perfectly, the only value of Gmail API would be having sent emails appear in the Gmail Sent folder — a nice-to-have, not a need.

**Implementation complexity:** High (OAuth flow, token refresh, googleapis package, scope management).
**Value vs complexity:** LOW for this phase.

### Google Calendar API
**Verdict: Defer to future phase.** Calendar API requires the same OAuth setup. For a single-user personal app, it CAN be used without verification if the app stays in "Testing" mode (up to 100 test users). The implementation would allow creating follow-up reminder events. However: (1) this is a deferred idea per CONTEXT.md, (2) the activity timeline + next-send-at in DB already provides visibility, (3) OAuth setup adds complexity to this already large phase.

**Recommendation for this phase:** Skip both. Implement `tel:` links for phone (already works with Google Voice, no API), send via Resend, and log activities in-app. Both Google integrations should be scoped as separate mini-phases or enhancement tickets.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer + custom SMTP | Resend API + react-email | 2023-present | No SMTP config; React templates; built-in deliverability |
| Email open tracking via custom pixels | Resend webhooks (email.opened, email.clicked) | 2024 | Available but requires public webhook endpoint |
| Separate email template engine (Handlebars/Mustache) | react-email components with React props | 2023 | TypeScript-safe templates; previews in browser |
| Bull/Redis for email queues | PostgreSQL state + timer | N/A (pattern choice) | Simpler for small-scale; no Redis needed |

**Deprecated/outdated:**
- `nodemailer` with Gmail SMTP: Google deprecated "less secure apps" access in 2024; SMTP to Gmail now requires OAuth — even harder than the API.
- Hardcoding email templates as HTML strings: react-email is the current standard for React projects.

---

## Open Questions

1. **Where does the email dispatch run: scraper Azure Function or app Next.js route?**
   - What we know: The scraper timer runs daily at 5 AM MT and already has DB access and Resend installed. The app has server actions for immediate sends (step 0 at enrollment).
   - What's unclear: Should the daily dispatch run in the scraper function (consistent with existing timer pattern) or as a Next.js cron route?
   - Recommendation: Step 0 (immediate) in server action. Steps 1-N (delayed) in scraper timer. This keeps the dispatch code alongside the other scheduled tasks. Requires adding `campaign-dispatch.ts` to the scraper package and sharing the DB connection.

2. **How to handle the Resend API key: env var or DB storage?**
   - What we know: CONTEXT.md says Mail Settings should store the Resend API key. The existing `RESEND_API_KEY` env var is used by the scraper for alert emails.
   - What's unclear: If the user enters a different key in Mail Settings, which takes precedence?
   - Recommendation: Use the DB-stored key for outreach emails (user-configurable). Keep the env var for system alert emails. Document the distinction clearly in the Mail Settings UI.

3. **Email signature format: HTML or plain text?**
   - What we know: This is Claude's discretion per CONTEXT.md.
   - Recommendation: Store as plain text with `\n` line breaks; render as `<pre>` in the email template or auto-convert `\n` to `<br>`. Keeps the settings form simple (textarea) and avoids a rich text editor dependency.

4. **Touchpoint badge: count vs icon breakdown?**
   - What we know: This is Claude's discretion per CONTEXT.md.
   - Recommendation: Simple count badge (e.g., "3 contacts") for property cards. The activity timeline on the detail page provides the breakdown. Keeps cards clean and avoids loading per-type counts for every card in the dashboard query.

---

## Sources

### Primary (HIGH confidence)
- https://resend.com/docs/send-with-nextjs — Resend Next.js integration, `resend.emails.send()` parameters
- https://resend.com/docs/knowledge-base/account-quotas-and-limits — Free plan: 100/day, 3,000/month
- https://resend.com/docs/api-reference/rate-limit — Rate limits: 5 req/sec, monitoring headers
- Project schema.ts — Existing DB schema (callLogs, callOutcomeEnum, ownerContacts, scraperConfig, leads)
- Project scraper/src/alerts/email.tsx — Existing Resend + react-email pattern (Resend v6.9.4, @react-email/components v1.0.10)
- Project app/package.json — Confirmed resend and @react-email/components NOT yet in app package

### Secondary (MEDIUM confidence)
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification — Gmail API scope requires verification; sensitive scope classification confirmed
- https://support.google.com/cloud/answer/13464323 — Personal/single-user apps under 100 users can skip verification with "unverified" warning
- Resend changelog: https://resend.com/blog/introducing-the-batch-emails-api — Batch API: 100 emails per call, 1 request counts against rate limit

### Tertiary (LOW confidence)
- WebSearch: Azure Functions timer trigger sequencing pattern — timer dispatch pattern inferred from existing project scraper, not a new external source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Resend and react-email already used in project at confirmed versions; npm package.json verified
- Architecture: HIGH — DB schema patterns are consistent with existing schema.ts; Resend API parameters verified against official docs
- Pitfalls: MEDIUM — Duplicate send pitfall and bounce-rate risk are documented industry knowledge; idempotency key pattern verified against Resend docs
- Google Workspace assessment: HIGH — Scope verification requirement confirmed directly from Google's official developer docs

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Resend API is stable; react-email evolves slowly)
