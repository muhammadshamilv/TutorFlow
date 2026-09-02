import { atom } from "jotai";

import type { User } from "@/api/auth";

/**
 * The currently logged-in user, or null if not authenticated.
 * This is the single source of truth for "who is logged in" across
 * the whole app (sidebar, route guards, role-based UI, etc).
 */
export const currentUserAtom = atom<User | null>(null);

/**
 * True while the app is checking for an existing session on first load
 * (calling GET /auth/me/ using the httpOnly cookie). Route guards use
 * this to show a skeleton instead of flashing a redirect.
 */
export const authLoadingAtom = atom<boolean>(true);

/**
 * Derived helpers.
 */
export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);
export const isTutorAtom = atom((get) => get(currentUserAtom)?.role === "tutor");
export const isStudentAtom = atom((get) => get(currentUserAtom)?.role === "student");