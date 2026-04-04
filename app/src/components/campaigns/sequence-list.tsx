"use client";

import { useState } from "react";
import type { EmailSequenceSummary } from "@/types/index";
import { SequenceEditor } from "./sequence-editor";
import { fetchSequenceForEdit } from "@/lib/campaign-actions";
import type { EmailSequenceRow, EmailStepRow } from "@/db/schema";

interface SequenceListProps {
  sequences: EmailSequenceSummary[];
}

interface EditState {
  sequence: EmailSequenceRow;
  steps: EmailStepRow[];
}

export function SequenceList({ sequences }: SequenceListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleEdit = async (sequenceId: string) => {
    setLoading(sequenceId);
    try {
      const data = await fetchSequenceForEdit(sequenceId);
      if (data) setEditState(data);
    } finally {
      setLoading(null);
    }
  };

  const handleSuccess = () => {
    setShowCreate(false);
    setEditState(null);
  };

  if (showCreate) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">New Sequence</h2>
        </div>
        <SequenceEditor onSuccess={handleSuccess} onCancel={() => setShowCreate(false)} />
      </div>
    );
  }

  if (editState) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Edit Sequence
          </h2>
        </div>
        <SequenceEditor
          sequence={editState.sequence}
          steps={editState.steps}
          onSuccess={handleSuccess}
          onCancel={() => setEditState(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Email Sequences
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-colors"
        >
          + New Sequence
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No sequences yet. Create your first email sequence to start reaching out to leads.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-colors"
          >
            Create First Sequence
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className={`rounded-2xl border bg-card p-5 space-y-3 transition-colors hover:border-primary/40 ${
                seq.isActive ? "border-border" : "border-dashed border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {seq.name}
                </h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    seq.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {seq.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-base font-bold text-foreground">
                    {seq.stepCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Steps</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-base font-bold text-foreground">
                    {seq.activeEnrollments}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Enrolled</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-base font-bold text-foreground">
                    {seq.totalSent}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Sent</p>
                </div>
              </div>

              <button
                onClick={() => handleEdit(seq.id)}
                disabled={loading === seq.id}
                className="w-full rounded-xl border border-border py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {loading === seq.id ? "Loading..." : "Edit Sequence"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
