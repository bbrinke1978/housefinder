import { SettingsForm } from "@/components/settings-form";
import { getTargetCities, getAlertSettings } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [cities, alertSettings] = await Promise.all([
    getTargetCities(),
    getAlertSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your scraper configuration and application preferences.
        </p>
      </div>
      <SettingsForm initialCities={cities} initialAlertSettings={alertSettings} />
    </div>
  );
}
