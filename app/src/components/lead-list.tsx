"use client";

import { useState, useCallback } from "react";
import { LeadCard } from "@/components/lead-card";
import { VoiceNoteInput } from "@/components/voice-note-input";
import { updateLeadStatus, addLeadNote } from "@/lib/actions";
import type { PipelineLead, LeadStatus } from "@/types";

const STATUS_TABS: { key: LeadStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "follow_up", label: "Follow-Up" },
  { key: "closed", label: "Closed" },
  { key: "dead", label: "Dead" },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "closed", label: "Closed" },
  { value: "dead", label: "Dead" },
];

interface LeadListProps {
  leads: PipelineLead[];
}

export function LeadList({ leads: initialLeads }: LeadListProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeTab, setActiveTab] = useState<LeadStatus | "all">("all");
  const [noteFormId, setNoteFormId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const filteredLeads =
    activeTab === "all"
      ? leads
      : leads.filter((l) => l.leadStatus === activeTab);

  const handleStatusChange = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, leadStatus: newStatus } : l
        )
      );
      try {
        await updateLeadStatus(leadId, newStatus);
      } catch {
        setLeads(initialLeads);
      }
    },
    [initialLeads]
  );

  const handleAddNote = useCallback(
    async (leadId: string) => {
      if (!noteText.trim()) return;
      setSubmittingNote(true);
      try {
        await addLeadNote(leadId, noteText);
        setNoteText("");
        setNoteFormId(null);
      } catch {
        // Silently fail -- user can retry
      } finally {
        setSubmittingNote(false);
      }
    },
    [noteText]
  );

  const handleTranscript = useCallback(
    (text: string) => {
      setNoteText((prev) => (prev ? `${prev} ${text}` : text));
    },
    []
  );

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1 text-xs">
                ({leads.filter((l) => l.leadStatus === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div className="space-y-3">
        {filteredLeads.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No leads in this status.
          </p>
        )}
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <LeadCard lead={lead} />
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <select
                  value={lead.leadStatus}
                  onChange={(e) =>
                    handleStatusChange(lead.id, e.target.value as LeadStatus)
                  }
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setNoteFormId(noteFormId === lead.id ? null : lead.id)
                  }
                  className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {noteFormId === lead.id ? "Cancel" : "Add Note"}
                </button>
              </div>
            </div>

            {/* Inline note form */}
            {noteFormId === lead.id && (
              <div className="flex items-end gap-2 pt-2 border-t">
                <div className="flex-1">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type a note or use voice input..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <VoiceNoteInput onTranscript={handleTranscript} />
                  <button
                    onClick={() => handleAddNote(lead.id)}
                    disabled={submittingNote || !noteText.trim()}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {submittingNote ? "..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
