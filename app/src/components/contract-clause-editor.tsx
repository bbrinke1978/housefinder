"use client";

import { Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContractClause } from "@/types";

interface ContractClauseEditorProps {
  clauses: ContractClause[];
  onChange: (clauses: ContractClause[]) => void;
}

export function ContractClauseEditor({ clauses, onChange }: ContractClauseEditorProps) {
  function handleTitleChange(index: number, value: string) {
    const updated = clauses.map((c, i) => (i === index ? { ...c, title: value } : c));
    onChange(updated);
  }

  function handleBodyChange(index: number, value: string) {
    const updated = clauses.map((c, i) => (i === index ? { ...c, body: value } : c));
    onChange(updated);
  }

  function handleRemove(index: number) {
    const updated = clauses
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, order: i + 1 }));
    onChange(updated);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...clauses];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated.map((c, i) => ({ ...c, order: i + 1 })));
  }

  function handleMoveDown(index: number) {
    if (index === clauses.length - 1) return;
    const updated = [...clauses];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated.map((c, i) => ({ ...c, order: i + 1 })));
  }

  function handleAddClause() {
    const newClause: ContractClause = {
      id: `custom-${Date.now()}`,
      title: "",
      body: "",
      order: clauses.length + 1,
      isDefault: false,
    };
    onChange([...clauses, newClause]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Contract Clauses</p>
        <span className="text-xs text-muted-foreground">{clauses.length} clause{clauses.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-3">
        {clauses.map((clause, index) => (
          <div key={clause.id} className="border rounded-lg p-4 space-y-3 bg-background">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={clause.title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  placeholder="Clause title"
                  className="w-full text-sm font-medium bg-transparent border-0 border-b border-border focus:outline-none focus:border-primary pb-1 placeholder:text-muted-foreground/50"
                />
                <textarea
                  value={clause.body}
                  onChange={(e) => handleBodyChange(index, e.target.value)}
                  placeholder="Clause text..."
                  rows={4}
                  className="w-full text-xs text-muted-foreground bg-muted/40 rounded-md p-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === clauses.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                  aria-label="Remove clause"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddClause}
        className="w-full border-dashed"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Clause
      </Button>
    </div>
  );
}
