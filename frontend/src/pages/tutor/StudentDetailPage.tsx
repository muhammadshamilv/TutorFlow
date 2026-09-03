import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getApiErrorMessage } from "@/api/client";
import { getStudent, type Student } from "@/api/students";
import { ProgressSummaryPanel } from "@/components/ai/ProgressSummaryPanel";
import { StudentSessionsList } from "@/components/sessions/StudentSessionsList";
import { DeleteStudentDialog } from "@/components/students/DeleteStudentDialog";
import { EditStudentDialog } from "@/components/students/EditStudentDialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/routes/paths";

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-32" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-48" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStudent(studentId);
      setStudent(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  if (isLoading) return <DetailSkeleton />;

  if (error || !student) {
    return (
      <div>
        <BackLink />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Student not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{student.user.full_name}</h1>
          <p className="text-sm text-muted-foreground">{student.user.email}</p>
        </div>
        <div className="flex gap-2">
          <EditStudentDialog student={student} onUpdated={loadStudent} />
          <DeleteStudentDialog
            student={student}
            onDeleted={() => navigate(paths.tutorHome, { replace: true })}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Badge variant="secondary">{student.subject}</Badge>
        <Badge variant="outline">{student.current_level}</Badge>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Learning goals</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {student.learning_goals || "Not set."}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Weak areas</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {student.weak_areas || "Not set."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ProgressSummaryPanel studentId={student.id} />
      </div>

      <div className="mt-8 border-t pt-6">
        <StudentSessionsList studentId={student.id} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to={paths.tutorHome}
      className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back to students
    </Link>
  );
}