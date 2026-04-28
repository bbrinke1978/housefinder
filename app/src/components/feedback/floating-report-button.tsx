"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { FeedbackForm } from "@/components/feedback/feedback-form";

/**
 * FloatingReportButton — fixed bottom-right button that opens a modal feedback form.
 * Renders on all authenticated pages via the dashboard layout.
 * Hidden on /feedback/* routes to avoid duplicate forms.
 * Pre-fills urlContext (current pathname + search) and browserContext (userAgent).
 */
export function FloatingReportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide on the feedback routes — the form is already on the page
  if (pathname.startsWith("/feedback")) return null;

  const urlContext =
    pathname +
    (typeof window !== "undefined" ? window.location.search : "");

  const browserContext =
    typeof navigator !== "undefined" ? navigator.userAgent : "";

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report bug or request feature"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:bottom-4"
      >
        <Bug className="h-5 w-5" />
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150"
          />
          <Dialog.Popup
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
              "rounded-2xl border border-border bg-card shadow-2xl",
              "max-h-[90vh] flex flex-col overflow-y-auto",
              "transition-all duration-150",
              "data-ending-style:opacity-0 data-ending-style:scale-95",
              "data-starting-style:opacity-0 data-starting-style:scale-95",
              "p-6"
            )}
          >
            {/* Close button */}
            <div className="flex items-center justify-end mb-2">
              <Dialog.Close
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <FeedbackForm
              urlContext={urlContext}
              browserContext={browserContext}
              onSuccess={() => setOpen(false)}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
