"use client";

/**
 * ShowDismissedToggle — chip that toggles ?showDismissed=true in the URL.
 * Rendered server-side with the current active state; client-side click
 * navigates by adding/removing the query param (preserving other filters).
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { EyeOff } from "lucide-react";

interface ShowDismissedToggleProps {
  active: boolean;
}

export function ShowDismissedToggle({ active }: ShowDismissedToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("showDismissed");
    } else {
      params.set("showDismissed", "true");
    }
    router.push(`/?${params.toString()}`);
  }, [active, router, searchParams]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-muted text-foreground border border-border"
          : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
      }`}
    >
      <EyeOff className="h-3 w-3" />
      {active ? "Hiding dismissed" : "Show dismissed"}
    </button>
  );
}
