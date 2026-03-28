"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { DealCard } from "@/components/deal-card";
import { updateDealStatus } from "@/lib/deal-actions";
import { getStageGuide } from "@/lib/wholesaling-guide";
import type { DealWithBuyer, DealStatus } from "@/types";

const DEAL_STATUS_COLUMNS: {
  key: DealStatus;
  label: string;
  color: string;
}[] = [
  { key: "lead", label: "Lead", color: "bg-slate-50 dark:bg-slate-900/50" },
  {
    key: "qualified",
    label: "Qualified",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "analyzed",
    label: "Analyzed",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  {
    key: "offered",
    label: "Offered",
    color: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    key: "under_contract",
    label: "Under Contract",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    key: "marketing",
    label: "Marketing",
    color: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    key: "assigned",
    label: "Assigned",
    color: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    key: "closing",
    label: "Closing",
    color: "bg-teal-50 dark:bg-teal-900/20",
  },
  {
    key: "closed",
    label: "Closed",
    color: "bg-green-50 dark:bg-green-900/20",
  },
  { key: "dead", label: "Dead", color: "bg-gray-50 dark:bg-gray-900/50" },
];

interface ColumnGuideProps {
  colKey: DealStatus;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function ColumnGuide({ colKey, open, onToggle, onClose }: ColumnGuideProps) {
  const guide = getStageGuide(colKey);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!guide) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground hover:bg-background hover:text-foreground transition-colors leading-none"
        title={`${guide.title} stage guide`}
        aria-label={`Show guide for ${guide.title} stage`}
      >
        i
      </button>

      {open && (
        <div
          className="absolute left-0 top-6 z-50 w-72 rounded-lg border bg-popover text-popover-foreground shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1">{guide.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {guide.description}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Criteria
              </p>
              <ul className="space-y-0.5">
                {guide.criteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="text-green-500 flex-shrink-0 mt-px">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Next steps
              </p>
              <ol className="space-y-0.5">
                {guide.nextSteps.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="flex-shrink-0 font-medium text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {guide.script && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Script
                </p>
                <div className="rounded border-l-2 border-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1.5">
                  <pre className="whitespace-pre-wrap text-[10px] font-mono text-blue-900 dark:text-blue-200 leading-relaxed">
                    {guide.script}
                  </pre>
                </div>
              </div>
            )}

            {guide.tips && guide.tips.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Tips
                </p>
                <ul className="space-y-0.5">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="flex-shrink-0 text-amber-500">★</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DealKanbanProps {
  deals: DealWithBuyer[];
}

export function DealKanban({ deals: initialDeals }: DealKanbanProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [openGuide, setOpenGuide] = useState<DealStatus | null>(null);

  const getColumnDeals = useCallback(
    (status: DealStatus) => deals.filter((d) => d.status === status),
    [deals]
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const newStatus = destination.droppableId as DealStatus;

      // Optimistic update
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === draggableId ? { ...deal, status: newStatus } : deal
        )
      );

      try {
        await updateDealStatus(draggableId, newStatus);
      } catch {
        // Revert on error
        setDeals(initialDeals);
      }
    },
    [initialDeals]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {DEAL_STATUS_COLUMNS.map((col) => {
          const columnDeals = getColumnDeals(col.key);
          return (
            <div
              key={col.key}
              className={`flex-shrink-0 min-w-[180px] w-[200px] rounded-lg ${col.color} p-2.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-0.5">
                  <h3 className="text-xs font-semibold">{col.label}</h3>
                  <ColumnGuide
                    colKey={col.key}
                    open={openGuide === col.key}
                    onToggle={() =>
                      setOpenGuide((prev) =>
                        prev === col.key ? null : col.key
                      )
                    }
                    onClose={() => setOpenGuide(null)}
                  />
                </div>
                <span className="text-xs text-muted-foreground rounded-full bg-background px-1.5 py-0.5">
                  {columnDeals.length}
                </span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[80px] rounded-md transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent/50" : ""
                    }`}
                  >
                    {columnDeals.map((deal, index) => (
                      <Draggable
                        key={deal.id}
                        draggableId={deal.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <DealCard deal={deal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
