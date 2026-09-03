import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AIErrorStateProps {
    message: string;
    onRetry: () => void;
    isRetrying: boolean;
}

export function AIErrorState({ message, onRetry, isRetrying }: AIErrorStateProps) {
    return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="flex-1">
                    <p className="text-sm text-destructive">{message}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={onRetry}
                        disabled={isRetrying}
                    >
                        <RefreshCw className="size-3.5" />
                        {isRetrying ? "Retrying..." : "Try again"}
                    </Button>
                </div>
            </div>
        </div>
    );
}