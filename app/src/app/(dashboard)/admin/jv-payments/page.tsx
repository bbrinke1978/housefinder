import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { getJvPaymentRun } from "@/lib/jv-queries";
import { JvPaymentRunTable } from "@/components/jv/jv-payment-run-table";

export default async function JvPaymentsPage() {
  const session = await auth();
  if (!sessionCan(session, "user.manage")) notFound(); // owner-only — same gate as /admin/users

  const partners = await getJvPaymentRun();
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-1">JV Payment Run — {month}</h1>
      <p className="text-sm text-muted-foreground mb-6 print:hidden">
        All unpaid milestones earned through today, grouped by partner. Mark paid on the 1st of
        each month per Section 6.
      </p>
      <JvPaymentRunTable partners={partners} />
    </div>
  );
}
