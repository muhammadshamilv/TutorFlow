import { Loader2, Sparkles } from "lucide-react";

export function AILoadingState({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="relative">
                <Sparkles className="size-4 text-violet-400" />
                <Loader2 className="absolute -right-1 -top-1 size-3 animate-spin text-violet-600" />
            </div>
            <p className="text-sm text-violet-900 dark:text-violet-200">{label}</p>
        </div>
    );
}