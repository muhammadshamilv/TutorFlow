import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { saveSessionNotes } from "@/api/sessions";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/useDebounce";

interface SessionNotesEditorProps {
    sessionId: string;
    initialNotes: string;
    locked: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1000;

export function SessionNotesEditor({ sessionId, initialNotes, locked }: SessionNotesEditorProps) {
    const [notes, setNotes] = useState(initialNotes);
    const [saveState, setSaveState] = useState<SaveState>("idle");

    const debouncedNotes = useDebounce(notes, AUTOSAVE_DELAY_MS);

    // Tracks the last value actually persisted, so we never fire a save
    // for the initial mount or for a value that hasn't really changed.
    const lastSavedRef = useRef(initialNotes);

    useEffect(() => {
        if (locked) return;
        if (debouncedNotes === lastSavedRef.current) return;

        let cancelled = false;

        (async () => {
            setSaveState("saving");
            try {
                await saveSessionNotes(sessionId, debouncedNotes);
                if (cancelled) return;
                lastSavedRef.current = debouncedNotes;
                setSaveState("saved");
            } catch {
                if (cancelled) return;
                setSaveState("error");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedNotes, sessionId, locked]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label htmlFor="session-notes" className="text-sm font-medium">
                    Session notes
                </label>
                <SaveIndicator state={saveState} locked={locked} />
            </div>

            <Textarea
                id="session-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={locked}
                placeholder={
                    locked
                    ? "Notes are locked because this session is completed."
                    : "Type notes during the session — they save automatically."
                }
                rows={10}
                className="resize-y"
            />
        </div>
    );
}

function SaveIndicator({ state, locked }: { state: SaveState; locked: boolean }) {
    if (locked) {
        return <span className="text-xs text-muted-foreground">Locked</span>;
    }

    if (state === "saving") {
        return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Saving...
            </span>
        );
    }

    if (state === "saved") {
        return (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3" /> Saved
            </span>
        );
    }

    if (state === "error") {
        return <span className="text-xs text-destructive">Couldn't save — check your connection</span>;
    }

    return null;
}