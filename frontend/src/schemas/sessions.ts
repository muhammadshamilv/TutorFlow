import { z } from "zod";

export const scheduleSessionSchema = z
    .object({
        topic: z.string().trim().min(1, "Topic is required."),
        scheduled_start: z.string().trim().min(1, "Start time is required."),
        scheduled_end: z.string().trim().min(1, "End time is required."),
    })
    .refine(
        (data) => new Date(data.scheduled_end) > new Date(data.scheduled_start),
        {
            message: "End time must be after the start time.",
            path: ["scheduled_end"],
        }
    );

export type ScheduleSessionFormValues = z.infer<typeof scheduleSessionSchema>;