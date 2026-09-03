import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { AIResultList } from "@/components/ai/AIResultCard";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { cn } from "@/lib/utils";
import type { StudentSession } from "@/api/sessions";

function formatDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function PastSessionCard({ session }: { session: StudentSession }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
                <div className="min-w-0">
                    <p className="truncate font-medium">{session.topic}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(session.scheduled_start)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <SessionStatusBadge status={session.status} />
                    <ChevronDown
                        className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
                    />
                </div>
            </button>

            {expanded && (
                <div className="space-y-4 border-t p-4">
                    <div>
                        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                            Session notes
                        </p>
                        <p className="whitespace-pre-wrap text-sm">
                            {session.notes || "No notes were recorded for this session."}
                        </p>
                    </div>

                    {session.ai_review && (
                        <>
                            <div>
                                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Summary
                                </p>
                                <p className="text-sm">{session.ai_review.summary}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Homework
                                </p>
                                <AIResultList items={session.ai_review.homework_tasks} />
                            </div>
                        </>
                    )}

                    {!session.ai_review && session.status === "completed" && (
                        <p className="text-sm text-muted-foreground">
                            Your tutor hasn't generated a review for this session yet.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}