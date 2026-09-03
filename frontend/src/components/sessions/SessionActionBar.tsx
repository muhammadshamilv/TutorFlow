import { CheckCircle2, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { completeSession, startSession, type Session } from "@/api/sessions";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";

interface SessionActionBarProps {
    session: Session;
    onChanged: (updated: Session) => void;
}

export function SessionActionBar({ session, onChanged }: SessionActionBarProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStart = async () => {
        setIsSubmitting(true);
        try {
            const updated = await startSession(session.id);
            toast.success("Session started.");
            onChanged(updated);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            const updated = await completeSession(session.id);
            toast.success("Session marked as completed. Notes are now locked.");
            onChanged(updated);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (session.status === "scheduled") {
        return (
            <Button onClick={handleStart} disabled={isSubmitting}>
                <PlayCircle className="size-4" />
                {isSubmitting ? "Starting..." : "Start session"}
            </Button>
        );
    }

    if (session.status === "in_progress") {
        return (
            <Button onClick={handleComplete} disabled={isSubmitting}>
                <CheckCircle2 className="size-4" />
                {isSubmitting ? "Completing..." : "Complete session"}
            </Button>
        );
    }

    if (session.status === "completed") {
        return (
            <p className="text-sm text-muted-foreground">
                Session completed. Run the AI review below to wrap it up.
            </p>
        );
    }

    // ai_reviewed — terminal state, nothing left to do here.
    return (
        <p className="text-sm text-muted-foreground">
            This session is fully wrapped up. See the AI review below.
        </p>
    );
}