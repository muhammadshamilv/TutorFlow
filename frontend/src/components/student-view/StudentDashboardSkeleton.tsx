import { Skeleton } from "@/components/ui/skeleton";

export function StudentDashboardSkeleton() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <Skeleton className="mb-2 h-8 w-56" />
            <Skeleton className="mb-8 h-4 w-40" />

            {Array.from({ length: 2 }).map((_, section) => (
                <div key={section} className="mb-8">
                    <Skeleton className="mb-3 h-5 w-32" />
                    <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, row) => (
                            <Skeleton key={row} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}