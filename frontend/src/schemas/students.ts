import { z } from "zod";

export const addStudentSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required."),
    last_name: z.string().trim().optional(),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .regex(/[A-Za-z]/, "Password must include at least one letter.")
        .regex(/[0-9]/, "Password must include at least one number."),
    subject: z.string().trim().min(1, "Subject is required."),
    current_level: z.string().trim().min(1, "Current level is required."),
    learning_goals: z.string().trim().optional(),
    weak_areas: z.string().trim().optional(),
});

export type AddStudentFormValues = z.infer<typeof addStudentSchema>;

export const editStudentSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required."),
    last_name: z.string().trim().optional(),
    subject: z.string().trim().min(1, "Subject is required."),
    current_level: z.string().trim().min(1, "Current level is required."),
    learning_goals: z.string().trim().optional(),
    weak_areas: z.string().trim().optional(),
});

export type EditStudentFormValues = z.infer<typeof editStudentSchema>;