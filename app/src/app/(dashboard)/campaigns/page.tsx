import { getSequences, getActiveEnrollments } from "@/lib/campaign-queries";
import { SequenceList } from "@/components/campaigns/sequence-list";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [sequences, enrollments] = await Promise.all([
    getSequences(),
    getActiveEnrollments(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e4d8c] via-[#1a3d6e] to-[#0f2645]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">CAMPAIGNS</span>
          </div>
          <p className="text-white/70 text-sm">
            Build multi-step email sequences and manage active lead outreach.
          </p>
        </div>
      </div>

      {/* Sequences section */}
      <div className="animate-fade-in-up stagger-1">
        <SequenceList sequences={sequences} />
      </div>

      {/* Active campaigns section */}
      <div className="animate-fade-in-up stagger-2 space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Active Campaigns
        </h2>
        <CampaignTable enrollments={enrollments} sequences={sequences} />
      </div>
    </div>
  );
}
