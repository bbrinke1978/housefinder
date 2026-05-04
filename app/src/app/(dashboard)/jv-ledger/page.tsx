import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { getJvLedgerForUser, listJvPartners } from "@/lib/jv-queries";
import { JvLedgerTable } from "@/components/jv/jv-ledger-table";
import Link from "next/link";

export default async function JvLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; submitted?: string }>;
}) {
  const session = await auth();
  if (!sessionCan(session, "jv.view_own_ledger")) notFound();

  const { userId, submitted } = await searchParams;

  const isOwner =
    (session?.user as { roles?: string[] })?.roles?.includes("owner") ?? false;
  const sessionUserId = session?.user?.id as string;

  // Permission check: jv_partner can only see own ledger; owner can see anyone's via ?userId=
  const targetUserId = isOwner && userId ? userId : sessionUserId;
  if (!isOwner && userId && userId !== sessionUserId) {
    // jv_partner trying to view another partner's ledger — 404
    notFound();
  }

  const leads = await getJvLedgerForUser(targetUserId);
  const partners = isOwner ? await listJvPartners() : [];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-1">JV Ledger</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Submitted leads, milestone status, and current-month earnings.
      </p>

      {/* Lead submitted success banner */}
      {submitted === "1" && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 px-3 py-2 text-sm">
          Lead submitted — Brian will review and you&apos;ll get an email when
          it&apos;s accepted or rejected.
        </div>
      )}

      {/* Owner partner picker — shows ALL jv_partners including deactivated (Section 7 audit requirement) */}
      {isOwner && partners.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Viewing:</span>
          {partners.map((p) => (
            <Link
              key={p.id}
              href={`/jv-ledger?userId=${p.id}`}
              className={`text-xs rounded-full border px-2 py-1 transition-colors ${
                p.id === targetUserId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {p.name}
              {!p.isActive && " (inactive)"}
            </Link>
          ))}
        </div>
      )}

      <JvLedgerTable leads={leads} />
    </div>
  );
}
