"use client";

import { useState, useOptimistic, useTransition } from "react";
import { format } from "date-fns";
import { MessageSquare, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VoiceNoteInput } from "@/components/voice-note-input";
import { addLeadNote } from "@/lib/actions";
import type { LeadNote } from "@/types";

interface LeadNotesProps {
  leadId: string;
  initialNotes: LeadNote[];
}

export function LeadNotes({ leadId, initialNotes }: LeadNotesProps) {
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [optimisticNotes, addOptimisticNote] = useOptimistic(
    initialNotes,
    (state: LeadNote[], newNote: LeadNote) => [newNote, ...state]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;

    setNoteText("");

    startTransition(async () => {
      addOptimisticNote({
        id: `temp-${Date.now()}`,
        leadId,
        noteText: text,
        noteType: "user",
        previousStatus: null,
        newStatus: null,
        createdAt: new Date(),
      });

      await addLeadNote(leadId, text);
    });
  }

  function handleVoiceTranscript(transcript: string) {
    setNoteText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex flex-col gap-1">
            <VoiceNoteInput onTranscript={handleVoiceTranscript} />
          </div>
        </div>
        <Button type="submit" disabled={isPending || !noteText.trim()}>
          {isPending ? "Adding..." : "Add Note"}
        </Button>
      </form>

      {/* Notes list */}
      {optimisticNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {optimisticNotes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-3 ${
                note.noteType === "status_change"
                  ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20"
                  : "bg-card"
              }`}
            >
              {note.noteType === "status_change" ? (
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm">
                    Status changed from{" "}
                    <Badge variant="outline" className="mx-0.5">
                      {note.previousStatus}
                    </Badge>{" "}
                    to{" "}
                    <Badge variant="outline" className="mx-0.5">
                      {note.newStatus}
                    </Badge>
                  </span>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
