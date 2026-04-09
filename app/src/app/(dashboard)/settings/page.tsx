import { SettingsForm } from "@/components/settings-form";
import { getTargetCities, getAlertSettings, getDashboardSettings } from "@/lib/actions";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [cities, alertSettings, dashboardSettings] = await Promise.all([
    getTargetCities(),
    getAlertSettings(),
    getDashboardSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 animate-fade-in">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=75')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-2xl font-bold tracking-wide"
            >
              SETTINGS
            </span>
          </div>
          <p className="text-white/70 text-sm">
            Manage your scraper configuration and application preferences.
          </p>
        </div>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <SettingsForm
          initialCities={cities}
          initialAlertSettings={alertSettings}
          initialDashboardSettings={dashboardSettings}
        />
      </div>
    </div>
  );
}
