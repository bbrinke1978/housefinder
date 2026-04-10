import { getTracerfyStatus, getTracerfyRunHistory, getTracerfyConfig } from "@/lib/tracerfy-actions";
import { SkipTracingSettings } from "@/components/skip-tracing-settings";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SkipTracingSettingsPage() {
  const [status, runHistory, config] = await Promise.all([
    getTracerfyStatus(),
    getTracerfyRunHistory(),
    getTracerfyConfig(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in-up">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e4d8c] via-[#1a3d6e] to-[#0f2645]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">
              SKIP TRACING
            </span>
          </div>
          <p className="text-white/70 text-sm">
            Tracerfy API integration — manage your skip trace account, view run history, and configure cost controls.
          </p>
        </div>
      </div>

      <SkipTracingSettings status={status} runHistory={runHistory} config={config} />
    </div>
  );
}
