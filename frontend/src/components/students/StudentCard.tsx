import { Link } from "react-router-dom";

import { EditStudentDialog } from "@/components/students/EditStudentDialog";
import { DeleteStudentDialog } from "@/components/students/DeleteStudentDialog";
import { Badge } from "@/components/ui/badge";
import { paths } from "@/routes/paths";
import type { Student } from "@/api/students";

interface StudentCardProps {
    student: Student;
    onChanged: () => void;
}

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function StudentCard({ student, onChanged }: StudentCardProps) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
            <Link to={paths.studentDetail(student.id)} className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(student.user.full_name)}
                </div>
                <div className="min-w-0">
                    <p className="truncate font-medium">{student.user.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{student.user.email}</p>
                </div>
            </Link>

            <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{student.subject}</Badge>
                <Badge variant="outline">{student.current_level}</Badge>
            </div>

            {student.weak_areas && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Weak areas: </span>
                    {student.weak_areas}
                    </p>
            )}

            <div className="flex gap-2 pt-1">
                <EditStudentDialog student={student} onUpdated={onChanged} />
                <DeleteStudentDialog student={student} onDeleted={onChanged} />
            </div>
        </div>
    );
}