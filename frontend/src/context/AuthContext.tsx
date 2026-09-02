import { useSetAtom } from "jotai";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    type ReactNode,
} from "react";

import {
    fetchCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    type LoginPayload,
} from "@/api/auth";
import { authLoadingAtom, currentUserAtom } from "@/store/auth";

interface AuthContextValue {
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const setCurrentUser = useSetAtom(currentUserAtom);
    const setAuthLoading = useSetAtom(authLoadingAtom);

    const refreshUser = useCallback(async () => {
        try {
            const user = await fetchCurrentUser();
            setCurrentUser(user);
        } catch {
            setCurrentUser(null);
        }
    }, [setCurrentUser]);

    // On first app load, check whether a valid session cookie already
    // exists (e.g. the user refreshed the page) before rendering routes.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setAuthLoading(true);
            await refreshUser();
            if (!cancelled) {
                setAuthLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(
        async (payload: LoginPayload) => {
            const user = await loginRequest(payload);
            setCurrentUser(user);
        },
        [setCurrentUser]
    );

    const logout = useCallback(async () => {
        try {
            await logoutRequest();
        } finally {
            setCurrentUser(null);
        }
    }, [setCurrentUser]);

    return (
        <AuthContext.Provider value={{ login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }
    return context;
}
