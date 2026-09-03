import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateSessionPlan, type SessionPlan } from "@/api/ai";
import { getApiErrorMessage } from "@/api/client";
import { AIErrorState } from "./AIErrorState"; 
import { AILoadingState } from "./AILoadingState";
import { AIResultCard, AIResultList } from "@/components/ai/AIResultCard";
import { Button } from "@/components/ui/button";

interface SessionPlanPanelProps {
  sessionId: string;
  initialPlan: SessionPlan | null;
  initialGeneratedAt: string | null;
}

export function SessionPlanPanel({
  sessionId,
  initialPlan,
  initialGeneratedAt,
}: SessionPlanPanelProps) {
  const [plan, setPlan] = useState<SessionPlan | null>(initialPlan);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateSessionPlan(sessionId);
      setPlan(response.ai_plan);
      setGeneratedAt(response.ai_plan_generated_at);
      toast.success("Session plan generated.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return <AILoadingState label="Generating a session plan tailored to this student..." />;
  }

  if (error) {
    return <AIErrorState message={error} onRetry={handleGenerate} isRetrying={isGenerating} />;
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          Generate a tailored plan before this session starts.
        </p>
        <Button variant="outline" onClick={handleGenerate}>
          <Sparkles className="size-4" />
          Generate AI plan
        </Button>
      </div>
    );
  }

  return (
    <AIResultCard title="AI session plan" generatedAt={generatedAt ?? undefined}>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Learning objectives
          </p>
          <AIResultList items={plan.learning_objectives} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Lesson outline
          </p>
          <AIResultList items={plan.lesson_outline} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Practice questions
          </p>
          <AIResultList items={plan.practice_questions} />
        </div>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
          <Sparkles className="size-3.5" />
          Regenerate
        </Button>
      </div>
    </AIResultCard>
  );
}