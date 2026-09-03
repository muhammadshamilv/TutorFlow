import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/api/sessions";

const STATUS_LABELS: Record<SessionStatus, string> = {
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    ai_reviewed: "AI reviewed",
};

const STATUS_STYLES: Record<SessionStatus, string> = {
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ai_reviewed: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
    return (
        <Badge className={cn("border-none font-medium", STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
        </Badge>
    );
}