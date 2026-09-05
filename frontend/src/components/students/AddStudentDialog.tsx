import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createStudent } from "@/api/students";
import { getApiErrorMessage, getApiFieldErrors } from "@/api/client";
import { PasswordInput } from "@/components/auth/PasswordInput";
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
import { addStudentSchema, type AddStudentFormValues } from "@/schemas/students";

interface AddStudentDialogProps {
  onCreated: () => void;
}

export function AddStudentDialog({ onCreated }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      subject: "",
      current_level: "",
      learning_goals: "",
      weak_areas: "",
    },
  });

  const onSubmit = async (values: AddStudentFormValues) => {
    setIsSubmitting(true);
    try {
      await createStudent(values);
      toast.success("Student added successfully.");
      reset();
      setOpen(false);
      onCreated();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof AddStudentFormValues, { message });
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
          <Button>
            <Plus className="size-4" />
            Add student
          </Button>
        }
      />

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new student</DialogTitle>
          <DialogDescription>
            This creates a login for the student and their profile. Share the
            email and password with them so they can log in.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-student-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...register("last_name")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (student's login)</Label>
            <Input
              id="email"
              type="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Temporary password</Label>
            <PasswordInput
              id="password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <StudentProfileFields<AddStudentFormValues>
            register={register}
            errors={errors}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button type="submit" form="add-student-form" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
