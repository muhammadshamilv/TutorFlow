import apiClient from "./client";
import type { User } from "./auth";

export interface Student {
    id: string;
    user: User;
    subject: string;
    current_level: string;
    learning_goals: string;
    weak_areas: string;
    created_at: string;
    updated_at: string;
}

export interface CreateStudentPayload {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    subject: string;
    current_level: string;
    learning_goals?: string;
    weak_areas?: string;
}

export interface UpdateStudentPayload {
    first_name?: string;
    last_name?: string;
    subject?: string;
    current_level?: string;
    learning_goals?: string;
    weak_areas?: string;
}

export async function listStudents(): Promise<Student[]> {
    const response = await apiClient.get<Student[]>("/students/");
    return response.data;
}

export async function getStudent(id: string): Promise<Student> {
    const response = await apiClient.get<Student>(`/students/${id}/`);
    return response.data;
}

export async function createStudent(
    payload: CreateStudentPayload
): Promise<Student> {
    const response = await apiClient.post<Student>("/students/", payload);
    return response.data;
}

export async function updateStudent(
    id: string,
    payload: UpdateStudentPayload
): Promise<Student> {
    const response = await apiClient.patch<Student>(`/students/${id}/`, payload);
    return response.data;
}

export async function deleteStudent(id: string): Promise<void> {
    await apiClient.delete(`/students/${id}/`);
}