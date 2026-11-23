import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriesTableSkeleton } from "@/components/skeletons/categories-skeletons";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <Card className="rounded-[32px] border-[#EEDFE5] bg-white overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <CategoriesTableSkeleton rowCount={6} />
        </CardContent>
      </Card>
    </div>
  );
}
