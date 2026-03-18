"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { LeadCard } from "@/components/lead-card";
import { updateLeadStatus } from "@/lib/actions";
import type { PipelineLead, LeadStatus } from "@/types";

const STATUS_COLUMNS: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-slate-50 dark:bg-slate-900/50" },
  {
    key: "contacted",
    label: "Contacted",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "follow_up",
    label: "Follow-Up",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    key: "closed",
    label: "Closed",
    color: "bg-green-50 dark:bg-green-900/20",
  },
  { key: "dead", label: "Dead", color: "bg-gray-50 dark:bg-gray-900/50" },
];

interface LeadKanbanProps {
  leads: PipelineLead[];
}

export function LeadKanban({ leads: initialLeads }: LeadKanbanProps) {
  const [leads, setLeads] = useState(initialLeads);

  const getColumnLeads = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.leadStatus === status),
    [leads]
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

      const newStatus = destination.droppableId as LeadStatus;

      // Optimistic update
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === draggableId
            ? { ...lead, leadStatus: newStatus }
            : lead
        )
      );

      try {
        await updateLeadStatus(draggableId, newStatus);
      } catch {
        // Revert on error
        setLeads(initialLeads);
      }
    },
    [initialLeads]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {STATUS_COLUMNS.map((col) => {
          const columnLeads = getColumnLeads(col.key);
          return (
            <div
              key={col.key}
              className={`flex-shrink-0 w-[280px] rounded-lg ${col.color} p-3`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground rounded-full bg-background px-2 py-0.5">
                  {columnLeads.length}
                </span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[100px] rounded-md transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent/50" : ""
                    }`}
                  >
                    {columnLeads.map((lead, index) => (
                      <Draggable
                        key={lead.id}
                        draggableId={lead.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <LeadCard lead={lead} />
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
