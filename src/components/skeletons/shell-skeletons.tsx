import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsDropdownSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-[#F0E1E6]/60">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-3.5 py-3 flex items-start gap-2.5">
          <Skeleton className="h-6 w-6 rounded-lg shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-2.5 w-12 rounded-md" />
            </div>
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
