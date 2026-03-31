"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
}

/**
 * BackButton — uses router.back() to preserve URL params (e.g. dashboard filters).
 * Falls back to fallbackHref if there's no history.
 */
export function BackButton({ fallbackHref = "/", label = "Back" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
