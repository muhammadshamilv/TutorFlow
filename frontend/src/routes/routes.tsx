import type { RouteObject } from "react-router-dom";

import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { StudentDashboardPage } from "@/pages/student/StudentDashboardPage";
import { SessionDetailPage } from "@/pages/tutor/SessionDetailPage";
import { StudentDetailPage } from "@/pages/tutor/StudentDetailPage";
import { TutorDashboardPage } from "@/pages/tutor/TutorDashboardPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRedirect } from "@/routes/RoleRedirect";
import { routePatterns } from "@/routes/paths";

/** Routes reachable without being logged in. */
const publicRoutes: RouteObject[] = [
  { path: routePatterns.login, element: <LoginPage /> },
  { path: routePatterns.forgotPassword, element: <ForgotPasswordPage /> },
];

/** Routes only a tutor may view. */
const tutorRoutes: RouteObject[] = [
  {
    path: routePatterns.tutorHome,
    element: (
      <ProtectedRoute allowedRole="tutor">
        <TutorDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: routePatterns.studentDetail,
    element: (
      <ProtectedRoute allowedRole="tutor">
        <StudentDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: routePatterns.sessionDetail,
    element: (
      <ProtectedRoute allowedRole="tutor">
        <SessionDetailPage />
      </ProtectedRoute>
    ),
  },
];

/** Routes only a student may view. */
const studentRoutes: RouteObject[] = [
  {
    path: routePatterns.studentHome,
    element: (
      <ProtectedRoute allowedRole="student">
        <StudentDashboardPage />
      </ProtectedRoute>
    ),
  },
];

export const routes: RouteObject[] = [
  { path: routePatterns.root, element: <RoleRedirect /> },
  ...publicRoutes,
  ...tutorRoutes,
  ...studentRoutes,
];
