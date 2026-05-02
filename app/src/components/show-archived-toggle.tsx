"use client";

/**
 * ShowArchivedToggle — chip that toggles ?showArchived=true on the /deals page.
 * Preserves existing view and mine params.
 */

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Archive } from "lucide-react";

interface ShowArchivedToggleProps {
  active: boolean;
  view: string;
  mineOn: boolean;
}

export function ShowArchivedToggle({ active, view, mineOn }: ShowArchivedToggleProps) {
  const router = useRouter();

  const handleToggle = useCallback(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (mineOn) params.set("mine", "true");
    if (!active) params.set("showArchived", "true");
    router.push(`/deals?${params.toString()}`);
  }, [active, router, view, mineOn]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
        active
          ? "bg-muted text-foreground border border-border"
          : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
      }`}
    >
      <Archive className="h-3 w-3" />
      {active ? "Hiding archived" : "Show archived"}
    </button>
  );
}
