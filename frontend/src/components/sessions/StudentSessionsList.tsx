import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/api/client";
import { listSessions, type Session } from "@/api/sessions";
import { ScheduleSessionDialog } from "@/components/sessions/ScheduleSessionDialog";
import { SessionListItem } from "@/components/sessions/SessionListItem";
import { SessionListSkeleton } from "@/components/sessions/SessionListSkeleton";

interface StudentSessionsListProps {
    studentId: string;
}

export function StudentSessionsList({ studentId }: StudentSessionsListProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // The API scopes sessions to the requesting tutor already; we
            // filter client-side to this specific student for this view.
            const all = await listSessions();
            setSessions(all.filter((session) => session.student === studentId));
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sessions</h2>
                <ScheduleSessionDialog studentId={studentId} onScheduled={loadSessions} />
            </div>

            {isLoading && <SessionListSkeleton />}

            {!isLoading && error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            {!isLoading && !error && sessions.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No sessions scheduled yet.
                </div>
            )}

            {!isLoading && !error && sessions.length > 0 && (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <SessionListItem key={session.id} session={session} />
                    ))}
                </div>
            )}
        </div>
    );
}