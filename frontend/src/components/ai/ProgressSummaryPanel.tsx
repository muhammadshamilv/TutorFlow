import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateProgressSummary } from "@/api/ai";
import { getApiErrorMessage } from "@/api/client";
import { AIErrorState } from "@/components/ai/AIErrorState";
import { AILoadingState } from "@/components/ai/AILoadingState";
import { AIResultCard } from "@/components/ai/AIResultCard";
import { Button } from "@/components/ui/button";

interface ProgressSummaryPanelProps {
    studentId: string;
}

export function ProgressSummaryPanel({ studentId }: ProgressSummaryPanelProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await generateProgressSummary(studentId);
            setSummary(response.summary);
            setGeneratedAt(new Date().toISOString());
            toast.success("Progress summary generated.");
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsGenerating(false);
        }
    };

    if (isGenerating) {
        return <AILoadingState label="Reviewing session history and summarizing progress..." />;
    }

    if (error) {
        return <AIErrorState message={error} onRetry={handleGenerate} isRetrying={isGenerating} />;
    }

    if (!summary) {
        return (
            <div className="flex items-center justify-between rounded-xl border border-dashed p-4">
                <div>
                    <p className="text-sm font-medium">Progress summary</p>
                    <p className="text-sm text-muted-foreground">
                        See where this student is improving and where they still struggle, across all
                        AI-reviewed sessions.
                    </p>
                </div>
                <Button variant="outline" onClick={handleGenerate} className="shrink-0">
                    <Sparkles className="size-4" />
                    Generate
                </Button>
            </div>
        );
    }

    return (
        <AIResultCard title="Progress summary" generatedAt={generatedAt ?? undefined}>
            <div className="space-y-3">
                <p className="text-sm leading-relaxed">{summary}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                    <Sparkles className="size-3.5" />
                    Regenerate
                </Button>
            </div>
        </AIResultCard>
    );
}