---
status: research
phase: 28
created: 2026-04-27
purpose: Technical research for implementing the Phase 28 User Feedback System
---

# Phase 28 Technical Research

## Summary

Confidence: **HIGH**. The phase is built almost entirely from patterns that already exist in the codebase — Postgres + Drizzle, Azure Blob with private containers + 1-hour SAS URLs, NextAuth credentials auth, Resend email integration, shadcn/ui components, server actions. No new infrastructure, no new vendors, no significant unknowns. Only research item that needs care: the paste-from-clipboard image upload UX (specific browser behaviors and the "create item then attach" two-step flow).

The hardest decision is **markdown rendering** — `react-markdown` is the obvious pick but I need to verify it's not already pulled in (it's not, per current `package.json` audit), and confirm sanitization. Pinned versions below.

## 1. Persistence — Postgres + Drizzle

### Tables to create

```sql
CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'idea', 'question');
CREATE TYPE feedback_status AS ENUM ('new', 'planned', 'in_progress', 'shipped', 'wontfix', 'duplicate');
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE feedback_activity_action AS ENUM (
  'created', 'status_changed', 'priority_changed', 'assigned',
  'comment_added', 'attachment_added', 'attachment_removed',
  'resolved', 'reopened', 'edited'
);

CREATE TABLE feedback_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         feedback_type NOT NULL,
  title        text NOT NULL CHECK (length(title) <= 200),
  description  text,
  status       feedback_status NOT NULL DEFAULT 'new',
  priority     feedback_priority NOT NULL DEFAULT 'medium',
  reporter_id  uuid NOT NULL REFERENCES users(id),
  assignee_id  uuid REFERENCES users(id),
  property_id  uuid REFERENCES properties(id),
  deal_id      uuid REFERENCES deals(id),
  url_context  text,
  browser_context text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  deleted_at   timestamptz
);
CREATE INDEX idx_feedback_items_status ON feedback_items (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_feedback_items_assignee ON feedback_items (assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_feedback_items_reporter ON feedback_items (reporter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_feedback_items_search
  ON feedback_items USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')))
  WHERE deleted_at IS NULL;

CREATE TABLE feedback_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES feedback_items(id),
  author_id   uuid NOT NULL REFERENCES users(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX idx_feedback_comments_item ON feedback_comments (item_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE feedback_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid REFERENCES feedback_items(id),
  comment_id   uuid REFERENCES feedback_comments(id),
  blob_name    text NOT NULL UNIQUE,
  mime_type    text NOT NULL,
  size_bytes   integer NOT NULL,
  uploaded_by  uuid NOT NULL REFERENCES users(id),
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CHECK ((item_id IS NOT NULL) OR (comment_id IS NOT NULL))
);
CREATE INDEX idx_feedback_attachments_item ON feedback_attachments (item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_feedback_attachments_comment ON feedback_attachments (comment_id) WHERE deleted_at IS NULL;

CREATE TABLE feedback_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES feedback_items(id),
  actor_id    uuid NOT NULL REFERENCES users(id),
  action      feedback_activity_action NOT NULL,
  old_value   text,
  new_value   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_activity_item ON feedback_activity (item_id, created_at);
```

### Drizzle equivalents

Match the existing patterns in `app/src/db/schema.ts` (see `properties`, `distressSignals`, `users`):

```typescript
export const feedbackTypeEnum = pgEnum("feedback_type", ["bug", "feature", "idea", "question"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["new", "planned", "in_progress", "shipped", "wontfix", "duplicate"]);
export const feedbackPriorityEnum = pgEnum("feedback_priority", ["low", "medium", "high", "critical"]);
export const feedbackActivityActionEnum = pgEnum("feedback_activity_action", [
  "created", "status_changed", "priority_changed", "assigned",
  "comment_added", "attachment_added", "attachment_removed",
  "resolved", "reopened", "edited",
]);

export const feedbackItems = pgTable("feedback_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: feedbackTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: feedbackStatusEnum("status").notNull().default("new"),
  priority: feedbackPriorityEnum("priority").notNull().default("medium"),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  assigneeId: uuid("assignee_id").references(() => users.id),
  propertyId: uuid("property_id").references(() => properties.id),
  dealId: uuid("deal_id").references(() => deals.id),
  urlContext: text("url_context"),
  browserContext: text("browser_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
// ... feedbackComments, feedbackAttachments, feedbackActivity follow the same pattern
```

Use `app/scripts/migrate-0015-feedback-system.ts` (mirror the existing `migrate-0014-owner-mailing.ts` script) to apply via `npx tsx`.

## 2. Azure Blob — `feedback` container

Mirror the existing photo upload pattern at `app/src/lib/blob-storage.ts`:

```typescript
const FEEDBACK_CONTAINER = "feedback";

export async function uploadFeedbackBlob(
  buffer: Buffer,
  blobName: string,
  contentType: string  // accepts paste-from-clipboard PNG/JPG/WebP
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(FEEDBACK_CONTAINER);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobClient.url;
}

export function generateFeedbackSasUrl(blobName: string): string {
  // Identical to generatePhotoSasUrl but with FEEDBACK_CONTAINER
  // 1-hour expiry — same as photos
}
```

Blob naming convention: `feedback/{itemId}/{attachmentId}-{originalName}` (or `paste-{timestamp}.png` for clipboard-pasted images). The blob_name is stored in `feedback_attachments.blob_name` and used to regenerate SAS URLs on read.

The existing `AZURE_STORAGE_CONNECTION_STRING` env var works — same account, new container.

## 3. Paste-from-clipboard image upload

This is the trickiest UX in the phase. Researched approach:

```typescript
// In feedback-form.tsx (client component)
function FeedbackForm() {
  const [pendingImages, setPendingImages] = useState<{ blob: Blob; preview: string; name: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) continue;
          if (blob.size > 5 * 1024 * 1024) {
            alert("Image too large (max 5MB)");
            continue;
          }
          const preview = URL.createObjectURL(blob);
          const ext = item.type.split("/")[1] || "png";
          setPendingImages((prev) => [...prev, { blob, preview, name: `paste-${Date.now()}.${ext}` }]);
        }
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
  }, []);

  // ... rest of form
}
```

On submit:
1. Create the feedback item (server action) — get `itemId` back.
2. For each pending image: upload to `/api/feedback/[id]/attachments` (multipart form data). The route uploads to Blob, inserts an `feedback_attachments` row.
3. If any attachment upload fails, the item is still created; show partial-success message.

This two-step flow is preferred over base64-encoding images into the create call (large payloads, slow forms). Same pattern used by GitHub Issues / Linear / Jira.

**Browser support:** ClipboardEvent + clipboardData.items is supported in Chrome/Edge/Safari/Firefox modern versions (since 2018+). No polyfill needed for our target users.

## 4. Markdown rendering

Verified `react-markdown` is **not** currently in `app/package.json`. Add:

```json
"react-markdown": "^9.0.1",
"remark-gfm": "^4.0.0",
"rehype-sanitize": "^6.0.0"
```

Render component:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function FeedbackMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        img: ({ node, ...props }) => <img {...props} className="max-w-full rounded-md" loading="lazy" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
```

Bundle size: react-markdown + plugins is ~30KB gzipped. Acceptable for the value.

Alternative considered + rejected: writing a regex-based markdown renderer ourselves. Too easy to introduce XSS. Use the proven library.

## 5. Authentication / authorization

Existing NextAuth session pattern in `app/src/auth.ts`. In server actions:

```typescript
import { auth } from "@/auth";

export async function createFeedbackItem(input: CreateFeedbackInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // ... insert with reporter_id = session.user.id
}
```

For admin-gated actions (status → shipped/wontfix/duplicate, hard-delete others' content):

```typescript
const ADMIN_EMAILS = ["bbrinke1978@gmail.com"]; // refactor to users.role column when 2nd admin appears

function isAdmin(session: Session | null): boolean {
  return Boolean(session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
}
```

This matches existing patterns and is trivially refactor-able when a real `role` column lands.

## 6. Email notifications

Existing `app/src/lib/email-actions.ts` (or similar — verify exact path) wraps Resend. Add two new exports:

```typescript
export async function notifyNewFeedbackItem(item: FeedbackItem, reporter: User) {
  await sendEmail({
    to: BRIAN_EMAIL,
    subject: `[Feedback] ${item.type}: ${item.title}`,
    html: renderNewItemEmail({ item, reporter }),
  });
}

export async function notifyFeedbackShipped(item: FeedbackItem, reporter: User, actor: User) {
  await sendEmail({
    to: reporter.email,
    subject: `[Feedback] Shipped: ${item.title}`,
    html: renderShippedEmail({ item, actor }),
  });
}
```

Fire-and-forget pattern (existing in `enrollment-actions.ts` lead-alert path) — log failures to console but don't throw on the user's create/update path.

Email body deep links use the existing app URL: `https://finder.no-bshomes.com/feedback/{id}`.

## 7. UI components — what's already available

From the existing shadcn/ui library:
- `Button`, `Card`, `Badge`, `Dialog`, `Select`, `Textarea`, `Input`, `Label` — all in use elsewhere
- `Tabs` if we want tabbed detail views (description / comments / activity)
- `Avatar` for user display in comments thread
- `DropdownMenu` for status/priority change controls

New small components we need:
- `FeedbackTypeBadge` — colored badge per type (bug=red, feature=blue, idea=purple, question=gray)
- `FeedbackStatusBadge` — colored badge per status (new=blue, planned=cyan, in_progress=yellow, shipped=green, wontfix=gray, duplicate=gray)
- `FeedbackPriorityBadge` — colored badge per priority (critical=red, high=orange, medium=blue, low=gray)
- `FeedbackAttachmentsGallery` — image grid with click-to-zoom (reuse the existing photo lightbox pattern from `photo-lightbox.tsx` if it exists)
- `FloatingReportButton` — fixed-position button with click-to-open modal

## 8. Floating "Report" button

Render in the existing dashboard layout (e.g. `app/src/app/(dashboard)/layout.tsx`) so all authenticated routes inherit it:

```tsx
"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FeedbackForm } from "./feedback-form";
import { Bug } from "lucide-react";

export function FloatingReportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:bottom-4"
          aria-label="Report bug or request feature"
        >
          <Bug className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <FeedbackForm
          urlContext={pathname + (typeof window !== "undefined" ? window.location.search : "")}
          browserContext={typeof navigator !== "undefined" ? navigator.userAgent : ""}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

`bottom-20` keeps it above the mobile bottom-nav (which is `h-14` + safe-area). On desktop (md+) it drops to `bottom-4`.

## 9. Risks and unknowns

| Risk | Likelihood | Mitigation |
|---|---|---|
| `react-markdown` adds too much bundle weight | Low | 30KB gzipped is acceptable. Defer via dynamic import on the detail page if needed. |
| Paste-from-clipboard fails on Safari iOS | Medium | Provide file-picker fallback (always available). Test on iPhone after deploy. |
| Status-change permission gating bypassed via direct API call | Low | Server actions enforce `isAdmin(session)` check; client-side disabled state is just UX. |
| Old "Property has no address" skip-trace error message users were trained to ignore — Brian misses real bugs reported about it | Low | The new message ("waiting on enrichment") is clearer post-Phase 27 work. |
| Email storm if a script accidentally creates many items | Low | Add a per-user rate limit on `create` (e.g. max 20 items/hour) — defer to v2 unless we see actual abuse. |
| Postgres FTS GIN index is large for our row count | None | Index size is negligible at our volume (<1000 rows × <1KB each). |
| Floating button blocks mobile UI | Medium | `bottom-20` placement above mobile bottom-nav; can be dismissed within the modal. Verify on iPhone. |

## 10. Validation Architecture

Not applicable — this phase has no automated test infrastructure (per the existing project pattern: deploy-and-observe, no test suite). Verification is by manual UAT after each plan ships.

## RESEARCH COMPLETE

All technical decisions are grounded in existing codebase patterns. No external dependencies beyond `react-markdown` + `remark-gfm` + `rehype-sanitize` (all small, stable, widely used). Schema and UI plans below are unblocked.
