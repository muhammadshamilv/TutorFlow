import type { ReactNode } from "react";

interface AuthLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">TutorFlow</h1>
                    <p className="mt-1 text-sm text-muted-foreground">One-to-one tutoring, organized.</p>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>

                    {children}
                </div>

                {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
            </div>
        </main>
    );
}