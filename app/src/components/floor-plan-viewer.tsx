"use client";

import { useCallback, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { FloorPlanPin } from "@/components/floor-plan-pin";
import { FloorPlanPinForm } from "@/components/floor-plan-pin-form";
import { PIN_COLORS } from "@/types";
import type { FloorPlanWithPins } from "@/types";
import type { FloorPlanPinRow } from "@/db/schema";

// Configure pdfjs worker — use the bundled worker from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface BudgetCategoryOption {
  id: string;
  name: string;
}

interface FloorPlanViewerProps {
  plan: FloorPlanWithPins;
  readOnly?: boolean;
  dealId: string;
  budgetCategories?: BudgetCategoryOption[];
}

interface PendingPin {
  xPct: number;
  yPct: number;
}

export function FloorPlanViewer({
  plan,
  readOnly = false,
  dealId,
  budgetCategories,
}: FloorPlanViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState(false);
  const [pins, setPins] = useState<FloorPlanPinRow[]>(plan.pins);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);

  const isPdf = plan.plan.mimeType === "application/pdf";

  // Calculate click position as percentage of content element
  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly || pendingPin) return;

      const el = contentRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;

      // Clamp to 0-1
      const clampedX = Math.max(0, Math.min(1, xPct));
      const clampedY = Math.max(0, Math.min(1, yPct));

      setPendingPin({ xPct: clampedX, yPct: clampedY });
    },
    [readOnly, pendingPin]
  );

  function handlePinCreated() {
    // Trigger page refresh by closing form — parent revalidatePath handles data update
    setPendingPin(null);
    // Optimistically can't get the new pin data without a refetch — page revalidation handles it
    // For instant feedback, we close the form and the server revalidation re-renders
  }

  function handlePinDeleted(pinId: string) {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
  }

  return (
    <div className="relative w-full">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={5}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: false }}
        panning={{ activationKeys: [] }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mb-2">
              <button
                type="button"
                onClick={() => zoomIn()}
                className="inline-flex items-center justify-center rounded-md border bg-background p-1.5 text-sm hover:bg-muted transition-colors"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                className="inline-flex items-center justify-center rounded-md border bg-background p-1.5 text-sm hover:bg-muted transition-colors"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                className="inline-flex items-center justify-center rounded-md border bg-background p-1.5 text-sm hover:bg-muted transition-colors"
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              {!readOnly && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Tap plan to drop a pin
                </span>
              )}
            </div>

            {/* Plan content area */}
            <div className="overflow-hidden rounded-lg border bg-muted/20">
              <TransformComponent
                wrapperClass="!w-full"
                contentClass="!w-full"
              >
                {/* Inner content div — click handler attached here for correct coordinates */}
                <div
                  ref={contentRef}
                  className="relative select-none"
                  style={{ cursor: readOnly ? "default" : "crosshair" }}
                  onClick={handleContentClick}
                >
                  {isPdf ? (
                    <Document
                      file={plan.sasUrl ?? undefined}
                      onLoadSuccess={({ numPages: n }) => {
                        setNumPages(n);
                        setPdfError(false);
                      }}
                      onLoadError={() => setPdfError(true)}
                      loading={
                        <div className="flex items-center justify-center w-full h-64 text-sm text-muted-foreground">
                          Loading PDF...
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center w-full h-64 text-sm text-red-500">
                          Failed to load PDF. The link may have expired.
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={700}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </Document>
                  ) : (
                    // Image plan
                    plan.sasUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={plan.sasUrl}
                        alt={`${plan.plan.floorLabel} floor plan`}
                        className="max-w-full block"
                        draggable={false}
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-64 text-sm text-muted-foreground">
                        Image not available.
                      </div>
                    )
                  )}

                  {/* Pin overlay — absolutely positioned on top of content */}
                  {pins.map((pin) => (
                    <div
                      key={pin.id}
                      style={{
                        position: "absolute",
                        left: `${pin.xPct * 100}%`,
                        top: `${pin.yPct * 100}%`,
                        transform: "translate(-50%, -100%)",
                        zIndex: 10,
                        pointerEvents: "auto",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FloorPlanPin
                        pin={pin}
                        color={PIN_COLORS[pin.category as keyof typeof PIN_COLORS] ?? "#6b7280"}
                        onDelete={readOnly ? undefined : handlePinDeleted}
                        dealId={dealId}
                      />
                    </div>
                  ))}
                </div>
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>

      {/* PDF page navigation */}
      {isPdf && numPages > 1 && !pdfError && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <span className="text-xs text-muted-foreground">
            Page {pageNumber} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Pin creation form modal */}
      {pendingPin && (
        <FloorPlanPinForm
          floorPlanId={plan.plan.id}
          xPct={pendingPin.xPct}
          yPct={pendingPin.yPct}
          budgetCategories={budgetCategories}
          onCreated={handlePinCreated}
          onCancel={() => setPendingPin(null)}
        />
      )}
    </div>
  );
}
