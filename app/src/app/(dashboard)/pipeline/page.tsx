import Link from "next/link";
import { getPipelineLeads } from "@/lib/queries";
import { LeadKanban } from "@/components/lead-kanban";
import { LeadList } from "@/components/lead-list";
import { LayoutGrid, List } from "lucide-react";

export const metadata = {
  title: "Pipeline",
};

interface PipelinePageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "kanban";
  const leads = await getPipelineLeads();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="flex rounded-lg border bg-muted p-1">
          <Link
            href="/pipeline?view=kanban"
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "kanban"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Link>
          <Link
            href="/pipeline?view=list"
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            List
          </Link>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">
            No leads in pipeline yet.
          </p>
          <Link
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : view === "kanban" ? (
        <LeadKanban leads={leads} />
      ) : (
        <LeadList leads={leads} />
      )}
    </div>
  );
}
