import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateSessionReview, type SessionReview } from "@/api/ai";
import { getApiErrorMessage } from "@/api/client";
import type { SessionStatus } from "@/api/sessions";
import { AIErrorState } from "@/components/ai/AIErrorState";
import { AILoadingState } from "@/components/ai/AILoadingState";
import { AIResultCard, AIResultList } from "@/components/ai/AIResultCard";
import { Button } from "@/components/ui/button";

interface SessionReviewPanelProps {
    sessionId: string;
    status: SessionStatus;
    initialReview: SessionReview | null;
    initialGeneratedAt: string | null;
    /** Called after a successful review so the parent can refresh the session (status becomes ai_reviewed). */
    onReviewed: (status: SessionStatus) => void;
}

export function SessionReviewPanel({
    sessionId,
    status,
    initialReview,
    initialGeneratedAt,
    onReviewed,
}: SessionReviewPanelProps) {
    const [review, setReview] = useState<SessionReview | null>(initialReview);
    const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await generateSessionReview(sessionId);
            setReview(response.ai_review);
            setGeneratedAt(response.ai_review_generated_at);
            onReviewed(response.status);
            toast.success("Session review generated.");
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsGenerating(false);
        }
    };

    if (isGenerating) {
        return <AILoadingState label="Reading the session notes and writing a review..." />;
    }

    if (error) {
        return <AIErrorState message={error} onRetry={handleGenerate} isRetrying={isGenerating} />;
    }

    // Not yet reviewed — only offer the button once the session is completed.
    if (!review) {
        if (status !== "completed") return null;

        return (
            <div className="flex items-center justify-between rounded-xl border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                    Generate a review and homework based on the notes above.
                </p>
                <Button onClick={handleGenerate}>
                    <Sparkles className="size-4" />
                    Run AI review
                </Button>
            </div>
        );
    }

    return (
        <AIResultCard title="AI session review" generatedAt={generatedAt ?? undefined}>
            <div className="space-y-3">
                <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Summary</p>
                    <p className="text-sm">{review.summary}</p>
                </div>
            <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Homework
                </p>
                <AIResultList items={review.homework_tasks} />
            </div>
            <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Next session suggestion
                </p>
                <p className="text-sm">{review.next_session_suggestion}</p>
            </div>
        </div>
    </AIResultCard>
    );
}