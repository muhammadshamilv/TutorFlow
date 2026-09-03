import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import type { UserRole } from "@/api/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/routes/paths";
import { authLoadingAtom, currentUserAtom } from "@/store/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If provided, only users with this role may view the route. */
  allowedRole?: UserRole;
}

function FullPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const authLoading = useAtomValue(authLoadingAtom);
  const location = useLocation();

  if (authLoading) {
    return <FullPageSkeleton />;
  }

  if (!currentUser) {
    return <Navigate to={paths.login} state={{ from: location.pathname }} replace />;
  }

  if (allowedRole && currentUser.role !== allowedRole) {
    // Logged in, but wrong role for this page — send to their own home.
    const homePath = currentUser.role === "tutor" ? paths.tutorHome : paths.studentHome;
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
}