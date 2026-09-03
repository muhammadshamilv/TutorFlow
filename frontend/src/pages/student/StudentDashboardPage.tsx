import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/api/client";
import { listMySessions, type StudentSession } from "@/api/sessions";
import { HomeworkList } from "@/components/student-view/HomeworkList";
import { PastSessionCard } from "@/components/student-view/PastSessionCard";
import { StudentDashboardSkeleton } from "@/components/student-view/StudentDashboardSkeleton";
import { UpcomingSessionCard } from "@/components/student-view/UpcomingSessionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { currentUserAtom } from "@/store/auth";

export function StudentDashboardPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const { logout } = useAuth();

  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMySessions();
      setSessions(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const upcomingList = sessions
      .filter(
        (s) =>
          (s.status === "scheduled" || s.status === "in_progress") &&
          new Date(s.scheduled_start).getTime() >= now
      )
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

    const pastList = sessions
      .filter((s) => s.status === "completed" || s.status === "ai_reviewed")
      .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());

    return { upcoming: upcomingList, past: pastList };
  }, [sessions]);

  if (isLoading) return <StudentDashboardSkeleton />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {currentUser?.first_name}</h1>
          <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
        </div>
        <Button variant="outline" onClick={() => logout()}>
          Log out
        </Button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past sessions</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No upcoming sessions scheduled.
              </div>
            ) : (
              upcoming.map((session) => (
                <UpcomingSessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No past sessions yet.
              </div>
            ) : (
              past.map((session) => <PastSessionCard key={session.id} session={session} />)
            )}
          </TabsContent>

          <TabsContent value="homework" className="mt-4">
            <HomeworkList sessions={sessions} />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}