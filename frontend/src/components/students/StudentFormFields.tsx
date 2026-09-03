import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProfileFieldsValues {
    subject: string;
    current_level: string;
    learning_goals?: string;
    weak_areas?: string;
}

interface StudentProfileFieldsProps<T extends ProfileFieldsValues> {
    register: UseFormRegister<T>;
    errors: FieldErrors<T>;
}

/**
 * Renders subject / level / goals / weak areas — the fields shared by
 * both the Add Student and Edit Student forms. Kept generic over the
 * exact form type so both schemas can reuse it without `any`.
 */
export function StudentProfileFields<T extends ProfileFieldsValues>({
    register,
    errors,
}: StudentProfileFieldsProps<T>) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                        id="subject"
                        placeholder="Mathematics"
                        aria-invalid={!!errors.subject}
                        {...register("subject" as never)}
                    />
                    {errors.subject && (
                        <p className="text-sm text-destructive">
                            {errors.subject.message as string}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="current_level">Current level</Label>
                    <Input
                        id="current_level"
                        placeholder="Grade 10"
                        aria-invalid={!!errors.current_level}
                        {...register("current_level" as never)}
                    />
                    {errors.current_level && (
                        <p className="text-sm text-destructive">
                            {errors.current_level.message as string}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="learning_goals">Learning goals</Label>
                <Textarea
                    id="learning_goals"
                    placeholder="What should this student achieve?"
                    rows={2}
                    {...register("learning_goals" as never)}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="weak_areas">Weak areas</Label>
                <Textarea
                    id="weak_areas"
                    placeholder="Specific topics or skills this student struggles with. The AI reads this directly, so be specific."
                    rows={3}
                    {...register("weak_areas" as never)}
                />
                <p className="text-xs text-muted-foreground">
                    Used directly in AI session plans and reviews — the more specific, the better the AI output.
                </p>
            </div>
        </>
    );
}