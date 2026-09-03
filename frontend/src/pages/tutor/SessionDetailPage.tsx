import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getApiErrorMessage } from "@/api/client";
import { getSession, type Session } from "@/api/sessions";
import { SessionActionBar } from "@/components/sessions/SessionActionBar";
import { SessionNotesEditor } from "@/components/sessions/SessionNotesEditor";
import { SessionStatusBadge } from "@/components/sessions/SessionStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/routes/paths";

function SessionDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="mb-6 h-6 w-32" />
      <Skeleton className="mb-2 h-8 w-72" />
      <Skeleton className="mb-6 h-4 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (isLoading) return <SessionDetailSkeleton />;

  if (error || !session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Session not found."}
        </div>
      </div>
    );
  }

  const locked = session.status === "completed" || session.status === "ai_reviewed";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{session.topic}</h1>
          <p className="text-sm text-muted-foreground">{session.student_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(session.scheduled_start)} – {formatDateTime(session.scheduled_end)}
          </p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4">
        <div className="mb-4">
          <SessionActionBar session={session} onChanged={setSession} />
        </div>

        <SessionNotesEditor
          key={session.id}
          sessionId={session.id}
          initialNotes={session.notes}
          locked={locked}
        />
      </div>

      {session.status === "completed" && (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          AI session review arrives in Phase 8. Run it from the button above once available.
        </div>
      )}

      {session.status === "ai_reviewed" && (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          AI review display arrives in Phase 8.
        </div>
      )}
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