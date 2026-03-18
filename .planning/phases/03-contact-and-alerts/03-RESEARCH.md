# Phase 3: Contact and Alerts - Research

**Researched:** 2026-03-18
**Domain:** Owner contact lookup (free public sources) + alert delivery (Resend email, Twilio SMS) + scraper pipeline integration
**Confidence:** MEDIUM (Resend/Twilio HIGH, Utah data sources MEDIUM-LOW, free people-search scraping LOW)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Alert Content**
- Email: rich detail — property address, owner name, all distress signals, score, city, days since discovered. User should be able to decide from the email alone whether to act.
- Email: branded HTML template with HouseFinder branding, colored score badge, signal icons — professional look
- SMS: minimal — "HOT LEAD: [address], [city] (score: X) — [link]" — just enough to tap and act
- Alert on both NEW hot leads and EXISTING leads that cross the hot threshold (score increases from new signals)

**Alert Frequency**
- Email: fires once daily after the 5 AM scrape — single digest email with all new/upgraded hot leads from that run
- SMS: fires only for 3+ weighted score leads (the hottest of hot) — keeps texts rare and urgent
- No quiet hours — SMS fires anytime. User controls notifications at the phone/OS level.
- Alert settings configurable from Settings page: toggle email on/off, SMS on/off, adjust score thresholds

**Contact Sources**
- Aggressive free-source strategy: try county assessor, voter rolls, state business registry (for LLCs), whitepages-style free sources
- LLC/Trust owners: flag differently with "Entity Owner — LLC/Trust" badge + suggest state business registry for registered agent contact
- Individual owners: attempt phone number lookup from all free sources
- Claude's discretion on whether to show multiple numbers from different sources or pick the best one
- Claude's discretion on Contact tab layout (cards per source vs unified view)

**Skip Trace UX**
- "Manual skip trace needed" flag shows owner name + address — enough to search on free sites like TruePeopleSearch, FastPeopleSearch
- User can manually add a phone number on the Contact tab — it becomes the lead's contact info
- Claude's discretion on whether adding a phone number auto-clears the skip trace flag
- Dashboard stats bar should include "Needs Skip Trace: X" count
- Tap-to-call on all phone numbers (both auto-found and manually entered)

### Claude's Discretion
- Multiple phone numbers display (show all vs pick best)
- Contact tab layout (cards per source vs unified)
- Skip trace flag auto-clear behavior when phone number added
- Email template exact design (within branded HTML constraint)
- SMS provider choice (Twilio trial vs alternative)
- Deduplication logic for alerts (don't re-alert on same lead)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONTACT-01 | System pulls owner name from county assessor data for every property | Already implemented in Phase 1 scraper (ownerName in properties table). Phase 3 must surface it on Contact tab UI — already partially built in contact-tab.tsx. |
| CONTACT-02 | System cross-references voter registration rolls to find owner phone numbers for free | Utah voter registration DOES NOT include phone numbers (confirmed — protected field). Research pivot: use free people-search sites (TruePeopleSearch/FastPeopleSearch) as the programmatic free source, or skip automation and rely on the manual skip trace UX. |
| CONTACT-03 | System displays a "manual skip trace needed" flag when free sources don't yield contact info | contact-tab.tsx already has the flag UI shell — needs owner_contacts table to determine when to show/hide it, plus "Needs Skip Trace: X" count in stats-bar. |
| CONTACT-04 | User can tap-to-call owner phone number directly from mobile (tel: link) | tel: href on all phone number elements. Already has Phone card placeholder in contact-tab.tsx. |
| ALERT-01 | System sends email alert via Resend when a new hot lead (2+ signals) is detected | Resend SDK is well-documented. Daily digest after 5 AM scrape. alertSent column already exists on leads table — need email-specific tracking. |
| ALERT-02 | System sends SMS alert for urgent hot leads (3+ signals or imminent auction timeline) | Twilio Node.js SDK. SMS only to app user. Requires A2P 10DLC registration (sole proprietor path, ~$4 one-time + $2/month). alertSent column needs per-channel tracking. |
| ALERT-03 | Email includes property address, distress signals, owner name, and link to detail page | react-email components + Resend react parameter. Daily digest template. |
| ALERT-04 | SMS includes property address and link to detail page for quick mobile access | Twilio client.messages.create(). Simple string, no template library needed. |
</phase_requirements>

---

## Summary

Phase 3 wires two independent systems: (1) owner contact lookup from free public sources, and (2) hot lead alert delivery via email (Resend) and SMS (Twilio). The scraper already runs at 5 AM MT via Azure Functions, scores properties, and updates `leads.isHot`. Phase 3 adds a Step 5 to `dailyScrape.ts` that calls an alert sender after scoring, sending a daily email digest and SMS for the hottest leads.

**Critical finding on Utah voter registration:** Phone numbers are a protected field in Utah voter data — they are not released in bulk data requests. The CONTACT-02 requirement to "cross-reference voter rolls for phone numbers" cannot be fulfilled as specified. The practical path for free phone lookup is: (a) scraping TruePeopleSearch or FastPeopleSearch via Playwright (Cloudflare-protected, fragile, terms-of-service risk, LOW confidence), or (b) implementing the manual skip trace UX and marking all individual leads as needing skip trace until the user adds a number manually. Given the Cloudflare protections and ToS risks on people-search sites, the recommended approach is to treat automatic phone lookup as best-effort and build the manual entry path as the primary workflow.

**Existing schema already has `leads.alertSent`** — a boolean that prevents re-alerting. Phase 3 needs to extend this to per-channel tracking (email vs SMS) and add an `owner_contacts` table to store phone numbers (both auto-found and manually entered).

**Primary recommendation:** Add `owner_contacts` table and `alert_history` table to both schemas (scraper and app), install `resend` + `@react-email/components` in the scraper, install `twilio` in the scraper, implement alert delivery in `dailyScrape.ts` as Step 5 after scoring, and build the Contact tab UI to show found contacts, manual entry, and the skip trace flag.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | latest (^4.x) | Send transactional email via Resend API | User already has Resend account from nychvac; official Node.js SDK; simple API |
| @react-email/components | latest (^0.0.x) | Email template components (Html, Body, Section, Text, Button, Heading, Hr, Img) | Official Resend-maintained email component library; handles cross-client CSS quirks |
| twilio | latest (^5.x) | Send SMS via Twilio | De facto standard; $0.0083/msg + $1.15/mo number; sole proprietor 10DLC available |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright | already installed in scraper | Attempt TruePeopleSearch scraping (best-effort) | Only if attempting auto phone lookup; wrap in try/catch, treat failure as normal |
| date-fns | already installed in scraper | Format timestamps for email template | formatDistanceToNow for "discovered X days ago" |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Twilio | Plivo, Vonage | Cheaper at scale > 10K msgs/mo; not worth complexity at < 50 msgs/mo |
| react-email | Handlebars HTML template | react-email handles responsive email CSS cross-client issues automatically |
| TruePeopleSearch scraping | Paid skip trace API | Paid breaks zero-cost constraint; free scraping has ToS/reliability risk |

**Installation (scraper directory):**
```bash
cd scraper
npm install resend @react-email/components twilio
```

**Installation (app directory — for settings page actions only):**
No new packages needed. Settings actions use existing Drizzle + pg.

---

## Architecture Patterns

### Recommended Project Structure Additions

```
scraper/src/
├── alerts/
│   ├── email.tsx          # Resend send function + react-email template
│   ├── sms.ts             # Twilio send function
│   └── index.ts           # sendAlerts() orchestrator called from dailyScrape
├── lib/
│   └── contacts.ts        # Owner contact lookup (assessor data + best-effort people search)
│
app/src/
├── components/
│   └── contact-tab.tsx    # EXTEND: manual phone entry, tap-to-call, skip trace flag
├── lib/
│   └── actions.ts         # ADD: saveOwnerPhone(), clearSkipTraceFlag() server actions
└── db/
    └── schema.ts          # ADD: ownerContacts table, alertHistory table
```

### Pattern 1: Daily Digest Alert in dailyScrape.ts

**What:** After `scoreAllProperties()` runs, query for all hot leads where the email alert has not been sent in the current run window, batch them, send one email, send SMS for score >= 3.

**When to use:** Always — the alert step is the final step in the scraper pipeline.

**Example:**
```typescript
// scraper/src/functions/dailyScrape.ts
// Step 5: Send alerts (after scoring)
try {
  const alertResults = await sendAlerts(context);
  context.log(`Alerts: ${alertResults.emailSent} email, ${alertResults.smsSent} SMS`);
} catch (err) {
  context.error("Alert delivery failed", err);
  // Non-fatal: scraping and scoring are already done
}
```

### Pattern 2: Alert Deduplication via alertHistory Table

**What:** Before sending any alert, check `alert_history` for this `leadId` + `channel` + `runDate`. If record exists, skip. Insert on success.

**When to use:** Every alert send — prevents re-alerting the same lead on subsequent days.

**Example:**
```typescript
// scraper/src/alerts/index.ts
const today = new Date().toISOString().split('T')[0]; // "2026-03-18"

// Check if already alerted today for this lead+channel
const existing = await db
  .select()
  .from(alertHistory)
  .where(
    and(
      eq(alertHistory.leadId, lead.id),
      eq(alertHistory.channel, 'email'),
      eq(alertHistory.runDate, today)
    )
  )
  .limit(1);

if (existing.length === 0) {
  await resend.emails.send({ ... });
  await db.insert(alertHistory).values({
    leadId: lead.id,
    channel: 'email',
    runDate: today,
    sentAt: new Date(),
  });
}
```

### Pattern 3: Resend Daily Digest with react-email

**What:** Compile all hot leads into a single react-email template. Send once per run.

**When to use:** After scoring — query leads where `isHot = true` and `alert_history` has no email record for today.

**Example:**
```typescript
// Source: https://resend.com/docs/send-with-nodejs
import { Resend } from 'resend';
import { HotLeadDigest } from './email.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'HouseFinder <alerts@yourdomain.com>',
  to: process.env.ALERT_EMAIL!,
  subject: `HouseFinder: ${hotLeads.length} Hot Lead${hotLeads.length > 1 ? 's' : ''} — ${new Date().toLocaleDateString()}`,
  react: HotLeadDigest({ leads: hotLeads, appUrl: process.env.APP_URL! }),
});
// Note: pass component as function call, not JSX: HotLeadDigest({...}) not <HotLeadDigest />
```

### Pattern 4: Twilio SMS (sole proprietor pipeline)

**What:** After email digest, send SMS for leads with score >= 3. One SMS per lead.

**Example:**
```typescript
// Source: https://www.twilio.com/docs/sms/quickstart/node
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

await client.messages.create({
  body: `HOT LEAD: ${lead.address}, ${lead.city} (score: ${lead.distressScore}) — ${appUrl}/properties/${lead.propertyId}`,
  from: process.env.TWILIO_PHONE_NUMBER!,
  to: process.env.ALERT_PHONE_NUMBER!,
});
```

### Pattern 5: owner_contacts Table (new schema addition)

**What:** Stores phone numbers and emails found for each property, tagged by source and whether manually entered.

```typescript
// Add to both scraper/src/db/schema.ts AND app/src/db/schema.ts
export const ownerContacts = pgTable(
  'owner_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id').notNull().references(() => properties.id),
    phone: text('phone'),
    email: text('email'),
    source: text('source').notNull(), // 'assessor' | 'truepeoplesearch' | 'manual'
    isManual: boolean('is_manual').notNull().default(false),
    needsSkipTrace: boolean('needs_skip_trace').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_owner_contacts_property_id').on(table.propertyId),
  ]
);
```

### Pattern 6: alertHistory Table (new schema addition)

**What:** Per-channel per-day deduplication record. Prevents re-alerting.

```typescript
// Add to scraper/src/db/schema.ts
export const alertHistory = pgTable(
  'alert_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id').notNull().references(() => leads.id),
    channel: text('channel').notNull(), // 'email' | 'sms'
    runDate: text('run_date').notNull(), // 'YYYY-MM-DD'
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_alert_history').on(table.leadId, table.channel, table.runDate),
    index('idx_alert_history_lead_id').on(table.leadId),
  ]
);
```

### Pattern 7: Manual Phone Entry Server Action

**What:** User taps "+ Add Phone" on Contact tab, submits a phone number, server action saves to `owner_contacts`.

```typescript
// app/src/lib/actions.ts — new server action
"use server";

export async function saveOwnerPhone(propertyId: string, phone: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  await db
    .insert(ownerContacts)
    .values({
      propertyId,
      phone: phone.trim(),
      source: 'manual',
      isManual: true,
      needsSkipTrace: false,
    })
    .onConflictDoUpdate({
      target: [ownerContacts.propertyId, ownerContacts.source],
      set: { phone: phone.trim(), needsSkipTrace: false, updatedAt: new Date() },
    });

  revalidatePath(`/properties/${propertyId}`);
}
```

### Pattern 8: Alert Settings in scraperConfig

**What:** Alert on/off and threshold toggles stored in the existing `scraper_config` key-value table. No new table needed.

```
Keys to seed:
  alerts.email.enabled = "true"
  alerts.sms.enabled = "true"
  alerts.email.threshold = "2"        // minimum score to include in digest
  alerts.sms.threshold = "3"          // minimum score to trigger SMS
  alerts.email.recipient = ""         // populated from env, or user-set
  alerts.sms.recipient = ""           // app user's phone number
```

The Settings page reads these via `getConfig()` and saves via a server action.

### Anti-Patterns to Avoid

- **Sending SMS to homeowner phone numbers:** Any phone number in `owner_contacts` is for display only (tap-to-call for the user to place a manual call). The Twilio `to:` field must always come from `process.env.ALERT_PHONE_NUMBER` — never from `owner_contacts.phone`. This distinction must be enforced in code with a comment.
- **One email per hot lead:** Do not send individual emails as each lead is scored. Batch into a single daily digest after the full scrape run completes.
- **Using leads.alertSent for deduplication:** The existing `alertSent` boolean doesn't support per-channel or per-day deduplication. Use the new `alert_history` table instead. Do not delete or repurpose `alertSent` — it can remain as a "ever alerted" flag.
- **Firing alerts before scoring completes:** Alert step must be Step 5 (last) in `dailyScrape.ts`, after `scoreAllProperties()` finishes.
- **react-email JSX syntax in Azure Functions:** Azure Functions scraper uses ESM (`.js` extensions, `"type": "module"`). react-email components must be called as functions, not JSX: `HotLeadDigest({ leads })` not `<HotLeadDigest leads={leads} />` unless TSX is configured.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | Resend SDK | TLS, retries, bounce handling, deliverability — weeks of complexity |
| Cross-client HTML email | Custom CSS email template | @react-email/components | Gmail, Outlook, Apple Mail all render CSS differently; react-email handles it |
| SMS delivery | Direct carrier API | Twilio SDK | Number provisioning, routing, carrier relationships, 10DLC compliance |
| Contact deduplication | Custom merge logic | Unique index on (propertyId, source) in owner_contacts | DB enforces it at insert time |

**Key insight:** Email deliverability is a solved problem with Resend. Do not attempt raw SMTP from Azure — outbound port 25 is blocked on Azure App Service/Functions by default. Resend uses HTTPS (port 443) which is always open.

---

## Common Pitfalls

### Pitfall 1: Utah Voter Registration Has No Phone Numbers

**What goes wrong:** CONTACT-02 specifies voter roll cross-reference for phones. Utah voter data omits phone numbers — they are a protected field. Building a voter-roll scraper for phones yields nothing.

**Why it happens:** The requirement was written before verifying Utah's specific voter data fields.

**How to avoid:** Skip voter registration as a phone source. Implement the manual skip trace UX as the primary path. Optionally attempt TruePeopleSearch scraping with Playwright as best-effort (wrap in try/catch, expect frequent failure).

**Warning signs:** Voter registration scraper returns 0 phone numbers for any property.

### Pitfall 2: TruePeopleSearch and FastPeopleSearch Are Cloudflare-Protected

**What goes wrong:** Both sites detect automated requests and serve CAPTCHA challenges. Even Playwright with stealth plugin cannot reliably bypass Cloudflare in 2026.

**Why it happens:** These sites actively block scraping due to data licensing concerns.

**How to avoid:** Treat automated people-search lookup as LOW confidence / best-effort. If it fails, mark the lead `needsSkipTrace = true` and surface the manual UX. Do not make the feature dependent on scraping success.

**Warning signs:** Playwright gets `403` or Cloudflare challenge page HTML instead of search results.

### Pitfall 3: A2P 10DLC Registration Required Before First SMS

**What goes wrong:** Sending SMS from a Twilio trial account (or unregistered paid account) results in carrier filtering. Messages may be silently dropped by US carriers. Trial accounts also cannot send to unverified numbers.

**Why it happens:** As of 2023, all A2P SMS traffic in the US requires 10DLC registration. Sole proprietor path is available (no EIN required), costs ~$4 one-time + $2/month campaign fee + $1.15/month phone number.

**How to avoid:** Complete sole proprietor 10DLC registration before any production SMS. Use the "transactional notifications" campaign type. The registration process takes minutes to days for approval. Include this in Wave 0 (setup task).

**Warning signs:** Twilio console shows messages with status `failed` or `undelivered` with carrier filtering error codes.

### Pitfall 4: SMS Sent to Homeowner Instead of App User

**What goes wrong:** Developer wires `owner_contacts.phone` as the Twilio `to:` field, texting the homeowner directly. This is a TCPA violation (post-Jan 2025 FCC rule change). Class action exposure.

**Why it happens:** The architecture stores owner contact phone numbers in the same DB. A bug or misread could route the alert SMS to the wrong number.

**How to avoid:** `ALERT_PHONE_NUMBER` environment variable is the only valid `to:` value for Twilio sends. Never use any phone number from `owner_contacts` as a Twilio destination. Add a code comment on the Twilio send call: `// TCPA: to: must always be app user's number from env, never owner contact numbers`.

**Warning signs:** Any Twilio send where `to:` comes from a DB query result rather than `process.env`.

### Pitfall 5: react-email Components Require JSX Transform

**What goes wrong:** The scraper is pure TypeScript/ESM (`.ts` files, no JSX). Importing react-email components and rendering them to HTML requires either `.tsx` files or `React.createElement()` calls. TypeScript compiler error if TSX is not configured.

**Why it happens:** Azure Functions scraper doesn't currently have JSX configured in tsconfig.

**How to avoid:** Name the email template file `email.tsx` and add `"jsx": "react-jsx"` to the scraper's `tsconfig.json`. Import React explicitly. Or, render the template to HTML string using `render()` from `@react-email/render` and pass `html:` to Resend instead of `react:`.

**Warning signs:** TypeScript error: `Cannot use JSX unless the '--jsx' flag is provided`.

### Pitfall 6: alertSent Boolean Does Not Support Per-Run Re-Alert Logic

**What goes wrong:** The existing `leads.alertSent = true` is set on first alert and never cleared. A lead that was alerted 3 months ago but gained a new signal today will not trigger a new alert because `alertSent` is still true.

**Why it happens:** The boolean tracks "ever alerted" not "alerted in today's run".

**How to avoid:** Use the new `alert_history` table with `runDate` field for deduplication. The logic is: alert if hot AND no `alert_history` row for `(leadId, channel, today)`. New signals causing re-scoring will naturally trigger new alerts on future days.

**Warning signs:** Hot lead with new signal from yesterday gets no alert.

### Pitfall 7: Azure Functions Outbound Port 25 Blocked

**What goes wrong:** Any attempt to send email via raw SMTP (nodemailer, etc.) fails silently — Azure blocks outbound port 25 on Functions.

**Why it happens:** Azure policy to prevent spam abuse.

**How to avoid:** Use Resend (HTTPS/443, always open). Never use nodemailer or raw SMTP in the scraper.

---

## Code Examples

Verified patterns from official sources:

### Resend: Send Email with react-email Template

```typescript
// Source: https://resend.com/docs/send-with-nodejs
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Pass template as function call, NOT JSX
const { data, error } = await resend.emails.send({
  from: 'HouseFinder <alerts@yourdomain.com>',
  to: [process.env.ALERT_EMAIL!],
  subject: `HouseFinder: 3 Hot Leads Today`,
  react: HotLeadDigest({ leads: hotLeads, appUrl: process.env.APP_URL! }),
});

if (error) {
  throw new Error(`Resend error: ${error.message}`);
}
```

### Twilio: Send SMS

```typescript
// Source: https://www.twilio.com/docs/sms/quickstart/node
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// TCPA: to: must always be app user's number from env, never owner contact numbers
const message = await client.messages.create({
  body: `HOT LEAD: 123 Main St, Price (score: 4) — https://app.url/properties/abc123`,
  from: process.env.TWILIO_PHONE_NUMBER!,
  to: process.env.ALERT_PHONE_NUMBER!,
});
```

### react-email: Minimal Hot Lead Digest Template

```tsx
// scraper/src/alerts/email.tsx
import * as React from 'react';
import {
  Html, Body, Head, Heading, Section, Text, Button, Hr, Container
} from '@react-email/components';

interface Lead {
  address: string;
  city: string;
  distressScore: number;
  ownerName: string | null;
  signals: string[];
  propertyId: string;
}

export function HotLeadDigest({ leads, appUrl }: { leads: Lead[]; appUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f5f5f5' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Heading>HouseFinder: {leads.length} Hot Lead{leads.length > 1 ? 's' : ''}</Heading>
          {leads.map((lead) => (
            <Section key={lead.propertyId} style={{ background: '#fff', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
              <Text style={{ fontWeight: 'bold', fontSize: '16px' }}>{lead.address}, {lead.city}</Text>
              <Text>Owner: {lead.ownerName ?? 'Unknown'}</Text>
              <Text>Score: {lead.distressScore} — {lead.signals.join(', ')}</Text>
              <Button href={`${appUrl}/properties/${lead.propertyId}`}>
                View Lead
              </Button>
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
```

### Drizzle: Query Hot Leads Not Yet Alerted Today

```typescript
// scraper/src/alerts/index.ts
import { db } from '../db/client.js';
import { leads, properties, alertHistory } from '../db/schema.js';
import { eq, and, gte, notExists } from 'drizzle-orm';

const today = new Date().toISOString().split('T')[0];

const hotLeadsToAlert = await db
  .select({
    leadId: leads.id,
    propertyId: properties.id,
    address: properties.address,
    city: properties.city,
    ownerName: properties.ownerName,
    distressScore: leads.distressScore,
  })
  .from(leads)
  .innerJoin(properties, eq(leads.propertyId, properties.id))
  .where(
    and(
      eq(leads.isHot, true),
      notExists(
        db.select().from(alertHistory).where(
          and(
            eq(alertHistory.leadId, leads.id),
            eq(alertHistory.channel, 'email'),
            eq(alertHistory.runDate, today)
          )
        )
      )
    )
  );
```

### Settings Page: Alert Toggle Server Action Pattern

```typescript
// app/src/lib/actions.ts (extend existing file)
"use server";

export async function updateAlertSettings(settings: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailThreshold: number;
  smsThreshold: number;
}): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const upserts = [
    { key: 'alerts.email.enabled', value: String(settings.emailEnabled) },
    { key: 'alerts.sms.enabled', value: String(settings.smsEnabled) },
    { key: 'alerts.email.threshold', value: String(settings.emailThreshold) },
    { key: 'alerts.sms.threshold', value: String(settings.smsThreshold) },
  ];

  for (const item of upserts) {
    await db
      .insert(scraperConfig)
      .values({ key: item.key, value: item.value })
      .onConflictDoUpdate({
        target: scraperConfig.key,
        set: { value: item.value, updatedAt: new Date() },
      });
  }

  revalidatePath('/settings');
}
```

### tap-to-call Phone Link (Contact Tab)

```tsx
// Any phone number in the UI — always use tel: href
<a href={`tel:${phone}`} className="flex items-center gap-2 text-blue-600">
  <Phone className="h-4 w-4" />
  {phone}
</a>
```

### tsconfig.json JSX Addition (scraper)

```json
// scraper/tsconfig.json — add jsx setting
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

Also add React as a dependency in the scraper:
```bash
cd scraper && npm install react react-dom @types/react @types/react-dom
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nodemailer + SMTP | Resend HTTP API | 2022-2023 | Simpler auth, better deliverability, no SMTP port issues |
| Long-code SMS without registration | A2P 10DLC registered campaigns | 2023 (carriers enforced) | Unregistered SMS gets filtered; registration now mandatory |
| SendGrid for transactional email | Resend (developer-focused alternative) | 2022+ | Resend has simpler API, better DX, comparable deliverability |
| Voter rolls as phone source | Manual skip trace + people-search sites | Always was this way for Utah | Utah voter data never included phones — requirement needs adjustment |

**Deprecated/outdated:**
- `leads.alertSent` boolean: still valid as "ever alerted" flag but insufficient for per-run deduplication — supplement with `alert_history` table.
- Twilio trial account for production: trial restricts recipients to verified numbers only; upgrade required before production use.

---

## Open Questions

1. **TruePeopleSearch / FastPeopleSearch Scraping**
   - What we know: Both are Cloudflare-protected; scraping is unreliable; ToS prohibit commercial use; Playwright stealth plugin has limited success against Cloudflare.
   - What's unclear: Whether the stealth plugin can reliably bypass these sites in the current Azure Functions environment. Also unclear whether ToS violation risk is acceptable for a personal-use tool.
   - Recommendation: Implement as best-effort with full try/catch. If it works occasionally — great. If it fails — mark as needsSkipTrace. Do not make any feature depend on it. Treat voter roll as a dead end for phones.

2. **LLC/Trust Registered Agent Lookup Automation**
   - What we know: Utah Division of Corporations at `corporations.utah.gov` (redirects to `commerce.utah.gov/corporations/`) has a web UI for looking up registered agents by entity name. No documented public API.
   - What's unclear: Whether the site is scrapeable (no confirmed Cloudflare protection, appears to be a standard government form).
   - Recommendation: Implement as a link on the Contact tab ("Search Utah Business Registry" -> opens `https://secure.utah.gov/bes/` with entity name pre-filled as a search query) rather than automation. Manual UX is acceptable for LLC owners at MVP scale.

3. **Resend Domain Verification**
   - What we know: User already has a Resend account. Domain must be verified at resend.com/domains before sending from a custom domain.
   - What's unclear: Which domain to use (whether the HouseFinder Azure domain is already set up).
   - Recommendation: Wave 0 task — verify the domain in Resend console before writing alert code. Can send from `onboarding@resend.dev` during development.

4. **Alert Settings UI — New Section or Extend Existing Settings Page?**
   - What we know: Settings page (`/settings`) already has a SettingsForm component for target cities. Alert settings (email toggle, SMS toggle, thresholds) need to be added.
   - Recommendation (Claude's discretion): Add an "Alert Settings" section to the existing SettingsForm component. Keep settings in one place. Don't create a separate `/alerts` route.

---

## Contact Lookup Strategy (Ranked by Reliability)

Given the Utah voter registration finding, here is the recommended lookup cascade for individual owners:

| Priority | Source | Method | Confidence | Phone Available? |
|----------|--------|--------|------------|-----------------|
| 1 | County assessor | Already scraped in Phase 1 | HIGH | No (name/address only) |
| 2 | Utah voter registration | $1,050 bulk file request | HIGH (name/address) | No — protected field |
| 3 | TruePeopleSearch | Playwright scrape (best-effort) | LOW | Sometimes |
| 4 | Manual entry | User inputs phone number | HIGH | Yes |

For LLC/Trust owners:
- Flag with "Entity Owner" badge (ownerType already in schema as `llc`/`trust`)
- Surface link to Utah Business Registry: `https://secure.utah.gov/bes/`
- No automated phone lookup possible without paid service

**Practical recommendation:** Build the manual entry UX as the primary flow. Make TruePeopleSearch lookup a best-effort background task. The "Needs Skip Trace: X" dashboard counter is the key UX mechanism that drives the user to take action.

---

## Schema Additions Required

Both `scraper/src/db/schema.ts` AND `app/src/db/schema.ts` must be updated (they share the same PostgreSQL database, so schema must match):

### New Tables

1. **`owner_contacts`** — stores contact info per property, per source
   - `id`, `property_id` (FK), `phone`, `email`, `source` ('assessor'|'truepeoplesearch'|'manual'), `is_manual`, `needs_skip_trace`, `created_at`, `updated_at`
   - Unique index on `(property_id, source)` for upsert deduplication

2. **`alert_history`** — per-channel per-day deduplication
   - `id`, `lead_id` (FK), `channel` ('email'|'sms'), `run_date` (text, 'YYYY-MM-DD'), `sent_at`
   - Unique index on `(lead_id, channel, run_date)`

### Existing Tables — Additions

`leads` table already has `alertSent boolean` — leave as-is. Add nothing to `leads` table for alert deduplication (use `alert_history` instead).

**Migration process:** Add to both schema.ts files, run `drizzle-kit migrate` in both `scraper/` and `app/` directories, or apply via Azure deployment step.

---

## Environment Variables Required

### Scraper (`scraper/local.settings.json` + Azure Function App Settings)

```
RESEND_API_KEY=re_xxxx
ALERT_EMAIL=investor@example.com      # The app user's email
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX      # Your Twilio registered 10DLC number
ALERT_PHONE_NUMBER=+1XXXXXXXXXX       # The app user's mobile number
APP_URL=https://housefinder.yourdomain.com
```

### App (`app/` — for settings display only)

No new env vars needed for app; alert settings are stored in `scraper_config` table.

---

## Sources

### Primary (HIGH confidence)
- https://resend.com/docs/send-with-nodejs — Resend Node.js SDK send method signature, rate limits (5 req/sec), react parameter, idempotencyKey
- https://www.twilio.com/docs/sms/quickstart/node — Twilio Node.js SDK client.messages.create() signature
- https://www.twilio.com/en-us/sms/pricing/us — SMS pricing $0.0083/msg, phone number $1.15/mo
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-sole-proprietor-registration-overview — Sole proprietor A2P registration process, no EIN required
- vote.utah.gov voter database — phone numbers are a protected field, NOT released in voter data requests

### Secondary (MEDIUM confidence)
- WebSearch: A2P 10DLC sole proprietor fees — one-time $4 brand + $15 campaign vetting + $2/month recurring (multiple sources agree)
- WebSearch: TruePeopleSearch and FastPeopleSearch — Cloudflare protected, no public API, scraping fragile
- WebSearch: Resend free tier — 3,000 emails/month, 100/day
- https://corporations.utah.gov/searches/ (redirects to commerce.utah.gov) — Utah Division of Corporations free web UI, no confirmed public API
- Carbon County assessor portal — owner name/address data available via property search; no phone numbers

### Tertiary (LOW confidence)
- TruePeopleSearch scrapeability with Playwright stealth plugin — multiple GitHub repos exist but success rate against Cloudflare in 2026 is unverified. Treat as best-effort only.

---

## Metadata

**Confidence breakdown:**
- Standard stack (Resend, Twilio): HIGH — verified from official docs
- Alert pipeline architecture: HIGH — based on existing scraper structure (dailyScrape.ts) and standard patterns
- Utah voter registration (no phones): HIGH — confirmed from vote.utah.gov voter database documentation
- People-search scraping: LOW — Cloudflare protections make this unreliable; no official API available
- A2P 10DLC fees: MEDIUM — multiple sources agree on amounts but slight variation ($4 vs $4.50)
- react-email tsconfig for Azure Functions: MEDIUM — standard pattern but scraper tsconfig not yet verified for JSX

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Resend/Twilio APIs stable; Utah data policy stable; TruePeopleSearch anti-bot may change sooner)
