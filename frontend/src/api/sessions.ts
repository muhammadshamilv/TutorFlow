import apiClient from "./client";
import type { SessionPlan, SessionReview } from "./ai";

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "ai_reviewed";

export interface Session {
    id: string;
    tutor: string;
    student: string;
    student_name: string;
    topic: string;
    scheduled_start: string;
    scheduled_end: string;
    status: SessionStatus;
    notes: string;
    ai_plan: SessionPlan | null;
    ai_plan_generated_at: string | null;
    ai_review: SessionReview | null;
    ai_review_generated_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSessionPayload {
    student: string;
    topic: string;
    scheduled_start: string;
    scheduled_end: string;
}

export interface RescheduleSessionPayload {
    topic?: string;
    scheduled_start?: string;
    scheduled_end?: string;
}

export interface StudentSession {
    id: string;
    tutor_name: string;
    topic: string;
    scheduled_start: string;
    scheduled_end: string;
    status: SessionStatus;
    notes: string;
    ai_review: SessionReview | null;
    ai_review_generated_at: string | null;
}

export async function listSessions(): Promise<Session[]> {
    const response = await apiClient.get<Session[]>("/sessions/");
    return response.data;
}

export async function listMySessions(): Promise<StudentSession[]> {
    const response = await apiClient.get<StudentSession[]>("/sessions/my-sessions/");
    return response.data;
}

export async function getSession(id: string): Promise<Session> {
    const response = await apiClient.get<Session>(`/sessions/${id}/`);
    return response.data;
}

export async function createSession(
    payload: CreateSessionPayload
): Promise<Session> {
    const response = await apiClient.post<Session>("/sessions/", payload);
    return response.data;
}

export async function rescheduleSession(
    id: string,
    payload: RescheduleSessionPayload
): Promise<Session> {
    const response = await apiClient.patch<Session>(`/sessions/${id}/`, payload);
    return response.data;
}

export async function cancelSession(id: string): Promise<void> {
    await apiClient.delete(`/sessions/${id}/`);
}

export async function saveSessionNotes(
    id: string,
    notes: string
): Promise<Session> {
    const response = await apiClient.patch<Session>(`/sessions/${id}/notes/`, {
        notes,
    });
    return response.data;
}

export async function startSession(id: string): Promise<Session> {
    const response = await apiClient.post<Session>(`/sessions/${id}/start/`);
    return response.data;
}

export async function completeSession(id: string): Promise<Session> {
    const response = await apiClient.post<Session>(`/sessions/${id}/complete/`);
    return response.data;
}
