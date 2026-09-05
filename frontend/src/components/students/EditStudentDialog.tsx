import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorMessage, getApiFieldErrors } from "@/api/client";
import type { Student } from "@/api/students";
import { updateStudent } from "@/api/students";
import { StudentProfileFields } from "@/components/students/StudentFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editStudentSchema, type EditStudentFormValues } from "@/schemas/students";

interface EditStudentDialogProps {
  student: Student;
  onUpdated: () => void;
}

export function EditStudentDialog({ student, onUpdated }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      first_name: student.user.first_name,
      last_name: student.user.last_name,
      subject: student.subject,
      current_level: student.current_level,
      learning_goals: student.learning_goals,
      weak_areas: student.weak_areas,
    },
  });

  const onSubmit = async (values: EditStudentFormValues) => {
    setIsSubmitting(true);
    try {
      await updateStudent(student.id, values);
      toast.success("Student updated.");
      setOpen(false);
      onUpdated();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof EditStudentFormValues, { message });
        }
      } else {
        toast.error(getApiErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit
          </Button>
        }
      />

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update {student.user.full_name}'s profile. Login email cannot be
            changed here.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-student-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First name</Label>
              <Input
                id="edit_first_name"
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last name</Label>
              <Input id="edit_last_name" {...register("last_name")} />
            </div>
          </div>

          <StudentProfileFields<EditStudentFormValues>
            register={register}
            errors={errors}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button type="submit" form="edit-student-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
