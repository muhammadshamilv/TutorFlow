import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { paths } from "@/routes/paths";
import type { Session } from "@/api/sessions";

function formatRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateLabel = startDate.toLocaleDateString(undefined, {
        weekday: "short",
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

export function SessionListItem({ session }: { session: Session }) {
    return (
        <Link
            to={paths.sessionDetail(session.id)}
            className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm"
        >
            <div className="min-w-0">
                <p className="truncate font-medium">{session.topic}</p>
                <p className="text-sm text-muted-foreground">
                    {formatRange(session.scheduled_start, session.scheduled_end)}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                <SessionStatusBadge status={session.status} />
                <ChevronRight className="size-4 text-muted-foreground" />
            </div>
        </Link>
    );
}