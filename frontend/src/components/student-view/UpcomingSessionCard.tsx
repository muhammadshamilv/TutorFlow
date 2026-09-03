import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import type { StudentSession } from "@/api/sessions";

function formatRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateLabel = startDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
    const startTime = startDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    const endTime = endDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    return `${dateLabel} · ${startTime} – ${endTime}`;
}

export function UpcomingSessionCard({ session }: { session: StudentSession }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="min-w-0">
                <p className="truncate font-medium">{session.topic}</p>
                <p className="text-sm text-muted-foreground">
                    {formatRange(session.scheduled_start, session.scheduled_end)}
                </p>
                <p className="text-xs text-muted-foreground">with {session.tutor_name}</p>
            </div>
        <SessionStatusBadge status={session.status} />
    </div>
    );
}