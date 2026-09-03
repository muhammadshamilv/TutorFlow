import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface AIResultCardProps {
    title: string;
    generatedAt?: string;
    children: ReactNode;
}

export function AIResultCard({ title, generatedAt, children }: AIResultCardProps) {
    return (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
                    <h3 className="font-medium text-violet-900 dark:text-violet-200">{title}</h3>
                </div>
                {generatedAt && (
                    <span className="text-xs text-muted-foreground">
                        {new Date(generatedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </span>
                )}
            </div>
        {children}
    </div>
    );
}

export function AIResultList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc space-y-1 pl-5 text-sm">
            {items.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}