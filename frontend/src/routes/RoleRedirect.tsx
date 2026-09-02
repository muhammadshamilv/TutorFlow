import { useAtomValue } from "jotai";
import { Navigate } from "react-router-dom";

import { authLoadingAtom, currentUserAtom } from "@/store/auth";

export function RoleRedirect() {
    const currentUser = useAtomValue(currentUserAtom);
    const authLoading = useAtomValue(authLoadingAtom);

    if (authLoading) return null;

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Navigate to={currentUser.role === "tutor" ? "/tutor" : "/student"} replace />
    );
}