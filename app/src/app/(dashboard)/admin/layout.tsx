/**
 * Admin layout — shared chrome for /admin/* sub-pages.
 *
 * NOTE: This layout does NOT gate the entire /admin/* subtree because Brian's
 * decision (2026-04-28) is:
 *   - /admin/users → URL-gated (notFound() per-page for non-owners)
 *   - /admin/audit → nav-hide only (anyone who knows the URL can read it)
 * Each page is responsible for its own gate. This layout just provides UI chrome.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Admin</span>
      </div>
      {children}
    </div>
  );
}
