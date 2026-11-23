import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProductsTableSkeleton } from "@/components/skeletons/products-skeletons";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
      <Card className="rounded-[32px] border-[#EEDFE5] bg-white overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <ProductsTableSkeleton rowCount={8} />
        </CardContent>
      </Card>
    </div>
  );
}
