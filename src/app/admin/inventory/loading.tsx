import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  InventoryStatsSkeleton,
  InventoryTableSkeleton,
} from "@/components/skeletons/inventory-skeletons";

export default function AdminInventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
      </div>
      <InventoryStatsSkeleton />
      <Card className="rounded-[32px] border-[#EEDFE5] bg-white overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <InventoryTableSkeleton rowCount={8} />
        </CardContent>
      </Card>
    </div>
  );
}
