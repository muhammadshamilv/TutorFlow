import apiClient from "./client";

export type UserRole = "tutor" | "student";

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: UserRole;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface PasswordResetRequestPayload {
    email: string;
}

export interface PasswordResetConfirmPayload {
    uid: string;
    token: string;
    new_password: string;
}

export async function login(payload: LoginPayload): Promise<User> {
    const response = await apiClient.post<{ user: User }>(
        "/auth/login/",
        payload
    );
    return response.data.user;
}

export async function logout(): Promise<void> {
    await apiClient.post("/auth/logout/");
}

export async function fetchCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ user: User }>("/auth/me/");
    return response.data.user;
}

export async function requestPasswordReset(
    payload: PasswordResetRequestPayload
): Promise<string> {
    const response = await apiClient.post<{ detail: string }>(
        "/auth/password-reset/",
        payload
    );
    return response.data.detail;
}

export async function confirmPasswordReset(
    payload: PasswordResetConfirmPayload
): Promise<string> {
    const response = await apiClient.post<{ detail: string }>(
        "/auth/password-reset/confirm/",
        payload
    );
    return response.data.detail;
}