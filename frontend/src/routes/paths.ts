/**
 * Central path definitions. Every Link/Navigate/useNavigate call should
 * import from here instead of writing a raw string, so a path never
 * drifts out of sync between the route declaration and its usages.
 */
export const paths = {
    root: "/",

    login: "/login",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",

    tutorHome: "/tutor",
    studentDetail: (studentId: string) => `/tutor/students/${studentId}`,
    sessionDetail: (sessionId: string) => `/tutor/sessions/${sessionId}`,

    studentHome: "/student",
} as const;

  /** Raw path patterns for <Route path="..."> declarations. */
export const routePatterns = {
    root: "/",
    login: "/login",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    tutorHome: "/tutor",
    studentDetail: "/tutor/students/:studentId",
    sessionDetail: "/tutor/sessions/:sessionId",
    studentHome: "/student",
} as const;