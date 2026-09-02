import { useAtomValue } from "jotai";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { currentUserAtom } from "@/store/auth";

export function TutorDashboardPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const { logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Tutor Dashboard</h1>
      <p className="text-muted-foreground">
        Logged in as {currentUser?.full_name} ({currentUser?.email})
      </p>
      <p className="text-sm text-muted-foreground">
        Student management arrives in Phase 4.
      </p>
      <Button variant="outline" onClick={() => logout()}>
        Log out
      </Button>
    </main>
  );
}