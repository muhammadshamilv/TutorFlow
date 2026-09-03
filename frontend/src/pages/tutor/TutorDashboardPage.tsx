import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/api/client";
import { listStudents, type Student } from "@/api/students";
import { Pagination } from "@/components/shared/Pagination";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { StudentCard } from "@/components/students/StudentCard";
import { StudentListSkeleton } from "@/components/students/StudentListSkeleton";
import { currentUserAtom } from "@/store/auth";

export function TutorDashboardPage() {
  const currentUser = useAtomValue(currentUserAtom);

  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listStudents(targetPage);
      setStudents(data.results);
      setTotalPages(data.total_pages);
      setTotalCount(data.count);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleStudentListChanged = () => loadStudents(page);
  const handleStudentCreated = () => {
    setPage(1);
    loadStudents(1);
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {currentUser?.first_name}
            {totalCount > 0 && ` · ${totalCount} student${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <AddStudentDialog onCreated={handleStudentCreated} />
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onChanged={handleStudentListChanged}
              />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}