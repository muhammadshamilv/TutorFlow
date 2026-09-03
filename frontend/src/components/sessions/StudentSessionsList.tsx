import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/api/client";
import { listSessions, type Session } from "@/api/sessions";
import { Pagination } from "@/components/shared/Pagination";
import { ScheduleSessionDialog } from "@/components/sessions/ScheduleSessionDialog";
import { SessionListItem } from "@/components/sessions/SessionListItem";
import { SessionListSkeleton } from "@/components/sessions/SessionListSkeleton";

interface StudentSessionsListProps {
  studentId: string;
}

export function StudentSessionsList({ studentId }: StudentSessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        // Filtered server-side to this student, and paginated, so this
        // list stays fast even for a student with a long session history.
        const data = await listSessions({ page: targetPage, student: studentId });
        setSessions(data.results);
        setTotalPages(data.total_pages);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => {
    loadSessions(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    loadSessions(nextPage);
  };

  const handleScheduled = () => {
    setPage(1);
    loadSessions(1);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <ScheduleSessionDialog studentId={studentId} onScheduled={handleScheduled} />
      </div>

      {isLoading && <SessionListSkeleton />}

      {!isLoading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No sessions scheduled yet.
        </div>
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <>
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionListItem key={session.id} session={session} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}