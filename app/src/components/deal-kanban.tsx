"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { DealCard } from "@/components/deal-card";
import { updateDealStatus } from "@/lib/deal-actions";
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

interface DealKanbanProps {
  deals: DealWithBuyer[];
}

export function DealKanban({ deals: initialDeals }: DealKanbanProps) {
  const [deals, setDeals] = useState(initialDeals);

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
                <h3 className="text-xs font-semibold">{col.label}</h3>
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
