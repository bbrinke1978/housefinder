import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FeedbackForm } from "@/components/feedback/feedback-form";

interface FeedbackNewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FeedbackNewPage({ searchParams }: FeedbackNewPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const getString = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const propertyId = getString(params.propertyId);
  const dealId = getString(params.dealId);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Back link */}
      <Link
        href="/feedback"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Bugs / Feature Request
      </Link>

      {/* Form — no onSuccess prop so it redirects to /feedback/[id] on submit */}
      <FeedbackForm
        defaultValues={{
          propertyId: propertyId ?? "",
          dealId: dealId ?? "",
        }}
      />
    </div>
  );
}
