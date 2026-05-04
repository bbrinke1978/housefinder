import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { getJvLeadsForTriage } from "@/lib/jv-queries";
import { JvTriageTable } from "@/components/jv/jv-triage-table";

export default async function JvLeadsPage() {
  const session = await auth();
  if (!sessionCan(session, "jv.triage")) notFound();

  const leads = await getJvLeadsForTriage();

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">JV Lead Triage</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pending submissions, oldest first. Accept pays $10 immediately. Reject requires a reason
        and pays $0.
      </p>
      <JvTriageTable leads={leads} />
    </div>
  );
}
