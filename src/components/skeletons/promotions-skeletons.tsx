import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function PromotionsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden rounded-[32px] border-[#EEDFE5] bg-white shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* 21:9 Banner Area */}
            <div className="relative w-full aspect-[21/9] sm:aspect-[2/1] bg-[#FAF7F8] p-3.5 flex items-start justify-between border-b border-[#F0E1E6]/60">
              <Skeleton className="h-6 w-20 rounded-full bg-black/20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
              </div>

              {/* Target Scope Box */}
              <div className="p-3 rounded-2xl bg-[#FAF7F8] border border-[#F0E1E6]/50 flex items-center justify-between">
                <Skeleton className="h-3.5 w-32 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>

              {/* Validity & Usage */}
              <div className="pt-2 border-t border-[#F0E1E6]/50 flex items-center justify-between">
                <Skeleton className="h-3.5 w-36 rounded-md" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 pt-0 border-t border-[#F0E1E6]/40 flex items-center justify-between mt-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PromotionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <PromotionsGridSkeleton count={6} />
    </div>
  );
}
