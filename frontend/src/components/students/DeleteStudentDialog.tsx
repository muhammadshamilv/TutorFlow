import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/client";
import type { Student } from "@/api/students";
import { deleteStudent } from "@/api/students";
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

interface DeleteStudentDialogProps {
    student: Student;
    onDeleted: () => void;
}

export function DeleteStudentDialog({ student, onDeleted }: DeleteStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteStudent(student.id);
            toast.success("Student removed.");
            setOpen(false);
            onDeleted();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Remove {student.user.full_name}?</DialogTitle>
                    <DialogDescription>
                        This permanently deletes their profile, login, and all associated
                        sessions and notes. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Removing..." : "Remove student"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}