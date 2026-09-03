import { BookOpen } from "lucide-react";

import type { StudentSession } from "@/api/sessions";

interface HomeworkListProps {
    sessions: StudentSession[];
}

export function HomeworkList({ sessions }: HomeworkListProps) {
    const withHomework = sessions
        .filter((session) => session.ai_review?.homework_tasks?.length)
        .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());

    if (withHomework.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No homework yet. It appears here once your tutor reviews a completed session.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {withHomework.map((session) => (
                <div key={session.id} className="rounded-lg border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <BookOpen className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{session.topic}</p>
                    </div>
                    <ul className="list-disc space-y-1 pl-9 text-sm">
                        {session.ai_review!.homework_tasks.map((task, index) => (
                            <li key={index}>{task}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}