"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { X, Plus, Save, Sun, Moon, Monitor, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateTargetCities, updateAlertSettings } from "@/lib/actions";
import type { AlertSettings } from "@/lib/actions";

const ALERT_DEFAULTS: AlertSettings = {
  emailEnabled: true,
  smsEnabled: true,
  emailThreshold: 2,
  smsThreshold: 3,
};

interface SettingsFormProps {
  initialCities: string[];
  initialAlertSettings?: AlertSettings;
}

export function SettingsForm({ initialCities, initialAlertSettings }: SettingsFormProps) {
  const [cities, setCities] = useState<string[]>(initialCities);
  const [newCity, setNewCity] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAlertPending, startAlertTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  // Alert settings state
  const defaults = initialAlertSettings ?? ALERT_DEFAULTS;
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(defaults);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleAddCity() {
    const trimmed = newCity.trim();
    if (!trimmed) return;
    if (cities.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({ type: "error", text: `"${trimmed}" is already in the list` });
      return;
    }
    setCities((prev) => [...prev, trimmed]);
    setNewCity("");
    setMessage(null);
  }

  function handleRemoveCity(index: number) {
    setCities((prev) => prev.filter((_, i) => i !== index));
    setMessage(null);
  }

  function handleSave() {
    if (cities.length === 0) {
      setMessage({ type: "error", text: "At least one target city is required" });
      return;
    }

    startTransition(async () => {
      try {
        await updateTargetCities(cities);
        setMessage({ type: "success", text: "Target cities saved successfully" });
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to save",
        });
      }
    });
  }

  function handleSaveAlerts() {
    setAlertMessage(null);
    startAlertTransition(async () => {
      try {
        await updateAlertSettings(alertSettings);
        setAlertMessage({ type: "success", text: "Alert settings saved successfully" });
      } catch (err) {
        setAlertMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to save alert settings",
        });
      }
    });
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Target Cities */}
      <Card>
        <CardHeader>
          <CardTitle>Target Cities</CardTitle>
          <CardDescription>
            Configure which cities the scraper monitors for distressed properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* City tags */}
            <div className="flex flex-wrap gap-2">
              {cities.map((city, index) => (
                <span
                  key={`${city}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => handleRemoveCity(index)}
                    className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    aria-label={`Remove ${city}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {cities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No target cities configured. Add at least one.
                </p>
              )}
            </div>

            {/* Add city input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter city name..."
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCity();
                  }
                }}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleAddCity}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Save button and message */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {isPending ? "Saving..." : "Save Cities"}
              </Button>
              {message && (
                <span
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {message.type === "success" && (
                    <Check className="inline h-3.5 w-3.5 mr-1" />
                  )}
                  {message.text}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you receive alerts for new distressed properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Email alerts */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="emailEnabled" className="text-sm font-medium">
                  Email Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email notifications for new leads
                </p>
              </div>
              <input
                id="emailEnabled"
                type="checkbox"
                checked={alertSettings.emailEnabled}
                onChange={(e) =>
                  setAlertSettings((prev) => ({
                    ...prev,
                    emailEnabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>

            {alertSettings.emailEnabled && (
              <div className="ml-0 space-y-1">
                <Label htmlFor="emailThreshold" className="text-xs text-muted-foreground">
                  Minimum score for email alerts
                </Label>
                <Input
                  id="emailThreshold"
                  type="number"
                  min={1}
                  max={10}
                  value={alertSettings.emailThreshold}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      emailThreshold: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="max-w-[100px]"
                />
              </div>
            )}

            {/* SMS alerts */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="smsEnabled" className="text-sm font-medium">
                  SMS Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive text message notifications for high-priority leads
                </p>
              </div>
              <input
                id="smsEnabled"
                type="checkbox"
                checked={alertSettings.smsEnabled}
                onChange={(e) =>
                  setAlertSettings((prev) => ({
                    ...prev,
                    smsEnabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>

            {alertSettings.smsEnabled && (
              <div className="ml-0 space-y-1">
                <Label htmlFor="smsThreshold" className="text-xs text-muted-foreground">
                  Minimum score for SMS alerts
                </Label>
                <Input
                  id="smsThreshold"
                  type="number"
                  min={1}
                  max={10}
                  value={alertSettings.smsThreshold}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      smsThreshold: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="max-w-[100px]"
                />
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleSaveAlerts}
                disabled={isAlertPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {isAlertPending ? "Saving..." : "Save Alerts"}
              </Button>
              {alertMessage && (
                <span
                  className={`text-sm ${
                    alertMessage.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {alertMessage.type === "success" && (
                    <Check className="inline h-3.5 w-3.5 mr-1" />
                  )}
                  {alertMessage.text}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how the application looks. Your preference is saved in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={theme === value ? "default" : "outline"}
                onClick={() => setTheme(value)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
