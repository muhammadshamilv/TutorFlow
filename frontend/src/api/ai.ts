import apiClient from "./client";
import type { SessionStatus } from "./sessions";

export interface SessionPlan {
    learning_objectives: string[];
    lesson_outline: string[];
    practice_questions: string[];
}

export interface SessionReview {
    summary: string;
    homework_tasks: string[];
    next_session_suggestion: string;
}

export interface SessionPlanResponse {
    id: string;
    status: SessionStatus;
    ai_plan: SessionPlan;
    ai_plan_generated_at: string;
}

export interface SessionReviewResponse {
    id: string;
    status: SessionStatus;
    ai_review: SessionReview;
    ai_review_generated_at: string;
}

export interface ProgressSummaryResponse {
    summary: string;
}

export async function generateSessionPlan(
    sessionId: string
): Promise<SessionPlanResponse> {
    const response = await apiClient.post<SessionPlanResponse>(
        `/sessions/${sessionId}/ai-plan/`
    );
    return response.data;
}

export async function generateSessionReview(
    sessionId: string
): Promise<SessionReviewResponse> {
    const response = await apiClient.post<SessionReviewResponse>(
        `/sessions/${sessionId}/ai-review/`
    );
    return response.data;
}

export async function generateProgressSummary(
    studentId: string
): Promise<ProgressSummaryResponse> {
    const response = await apiClient.post<ProgressSummaryResponse>(
        `/students/${studentId}/progress-summary/`
    );
    return response.data;
}