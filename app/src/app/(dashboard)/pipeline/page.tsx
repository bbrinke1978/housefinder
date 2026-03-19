import Link from "next/link";
import { getPipelineLeads } from "@/lib/queries";
import { LeadKanban } from "@/components/lead-kanban";
import { LeadList } from "@/components/lead-list";
import { LayoutGrid, List, KanbanSquare } from "lucide-react";

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
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-52 animate-fade-in">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=75')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-dark-950/30 to-dark-950/70" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-lg">
                  <KanbanSquare className="h-5 w-5 text-white" />
                </div>
                <span
                  style={{ fontFamily: "var(--font-display)" }}
                  className="text-2xl tracking-wide"
                >
                  PIPELINE
                </span>
              </div>
              <p className="text-white/70 text-sm">
                {leads.length} leads in your pipeline
              </p>
            </div>
            <div className="flex rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
              <Link
                href="/pipeline?view=kanban"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  view === "kanban"
                    ? "bg-white text-dark-950 shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </Link>
              <Link
                href="/pipeline?view=list"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  view === "list"
                    ? "bg-white text-dark-950 shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
                List
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in-up stagger-1">
        {leads.length === 0 ? (
          <div className="card-warm text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warm-200 dark:bg-dark-700">
              <KanbanSquare className="h-7 w-7 text-warm-500" />
            </div>
            <p
              style={{ fontFamily: "var(--font-heading)" }}
              className="text-xl font-semibold text-dark-950 dark:text-dark-100"
            >
              No leads in pipeline yet
            </p>
            <p className="mt-2 text-sm text-dark-500 dark:text-dark-400 mb-4">
              Properties will appear here once they have a lead status.
            </p>
            <Link href="/" className="btn-brand inline-flex items-center gap-2">
              Go to Dashboard
            </Link>
          </div>
        ) : view === "kanban" ? (
          <LeadKanban leads={leads} />
        ) : (
          <LeadList leads={leads} />
        )}
      </div>
    </div>
  );
}
