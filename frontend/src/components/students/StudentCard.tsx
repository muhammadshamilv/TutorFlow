import { Link } from "react-router-dom";

import { DeleteStudentDialog } from "@/components/students/DeleteStudentDialog";
import { EditStudentDialog } from "@/components/students/EditStudentDialog";
import { Badge } from "@/components/ui/badge";
import { avatarColorClasses } from "@/lib/avatarColor";
import { paths } from "@/routes/paths";
import type { Student } from "@/api/students";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

interface StudentCardProps {
  student: Student;
  onChanged: () => void;
}

export function StudentCard({ student, onChanged }: StudentCardProps) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link to={paths.studentDetail(student.id)} className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorClasses(
            student.id
          )}`}
        >
          {initials(student.user.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight group-hover:text-primary">
            {student.user.full_name}
          </p>
          <p className="truncate text-sm text-muted-foreground">{student.user.email}</p>
        </div>
      </Link>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{student.subject}</Badge>
        <Badge variant="outline">{student.current_level}</Badge>
      </div>

      {student.weak_areas && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Weak areas: </span>
          {student.weak_areas}
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-1">
        <EditStudentDialog student={student} onUpdated={onChanged} />
        <DeleteStudentDialog student={student} onDeleted={onChanged} />
      </div>
    </div>
  );
}