import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { JvSubmitForm } from "@/components/jv/jv-submit-form";

export default async function JvSubmitPage() {
  const session = await auth();
  if (!sessionCan(session, "jv.submit_lead")) notFound();
  return (
    <div className="max-w-md mx-auto pb-32">
      <h1 className="text-2xl font-bold mb-1">Submit Lead</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Front photo + full address required. $10 paid on accept, up to $525 if it closes.
      </p>
      <JvSubmitForm />
    </div>
  );
}
