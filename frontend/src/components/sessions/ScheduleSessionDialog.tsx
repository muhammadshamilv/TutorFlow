import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorMessage, getApiFieldErrors } from "@/api/client";
import { createSession } from "@/api/sessions";
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
import { scheduleSessionSchema, type ScheduleSessionFormValues } from "@/schemas/sessions";

interface ScheduleSessionDialogProps {
  studentId: string;
  onScheduled: () => void;
}

export function ScheduleSessionDialog({ studentId, onScheduled }: ScheduleSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ScheduleSessionFormValues>({
    resolver: zodResolver(scheduleSessionSchema),
    defaultValues: { topic: "", scheduled_start: "", scheduled_end: "" },
  });

  const onSubmit = async (values: ScheduleSessionFormValues) => {
    setIsSubmitting(true);
    try {
      await createSession({
        student: studentId,
        topic: values.topic,
        scheduled_start: new Date(values.scheduled_start).toISOString(),
        scheduled_end: new Date(values.scheduled_end).toISOString(),
      });
      toast.success("Session scheduled.");
      reset();
      setOpen(false);
      onScheduled();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === "scheduled_start" || field === "scheduled_end" || field === "topic") {
            setError(field as keyof ScheduleSessionFormValues, { message });
          } else {
            toast.error(message);
          }
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
            <CalendarPlus className="size-4" />
            Schedule session
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a session</DialogTitle>
          <DialogDescription>
            Pick a time that doesn't overlap with another session of yours.
          </DialogDescription>
        </DialogHeader>

        <form
          id="schedule-session-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="Quadratic equations"
              aria-invalid={!!errors.topic}
              {...register("topic")}
            />
            {errors.topic && (
              <p className="text-sm text-destructive">{errors.topic.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Start</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                aria-invalid={!!errors.scheduled_start}
                {...register("scheduled_start")}
              />
              {errors.scheduled_start && (
                <p className="text-sm text-destructive">{errors.scheduled_start.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_end">End</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                aria-invalid={!!errors.scheduled_end}
                {...register("scheduled_end")}
              />
              {errors.scheduled_end && (
                <p className="text-sm text-destructive">{errors.scheduled_end.message}</p>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-session-form" disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
