import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/api/client";
import { listStudents, type Student } from "@/api/students";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { StudentCard } from "@/components/students/StudentCard";
import { StudentListSkeleton } from "@/components/students/StudentListSkeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { currentUserAtom } from "@/store/auth";

export function TutorDashboardPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const { logout } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listStudents();
      setStudents(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your students</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {currentUser?.full_name} ({currentUser?.email})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddStudentDialog onCreated={loadStudents} />
          <Button variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </header>

      {isLoading && <StudentListSkeleton />}

      {!isLoading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && students.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium">No students yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first student to start scheduling sessions.
          </p>
        </div>
      )}

      {!isLoading && !error && students.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} onChanged={loadStudents} />
          ))}
        </div>
      )}
    </main>
  );
}