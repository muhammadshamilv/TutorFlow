import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-muted/20">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
        </div>
    );
}