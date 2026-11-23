import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OrdersHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function OrdersFilterBarSkeleton() {
  return (
    <Card className="rounded-[24px] border-[#EEDFE5] bg-white">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Skeleton className="h-10 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersTableRowsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i} className="border-b border-[#F0E1E6]/50">
          <TableCell className="w-10 pl-4">
            <Skeleton className="h-4 w-4 rounded" />
          </TableCell>
          <TableCell className="w-[18%]">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </TableCell>
          <TableCell className="w-[22%]">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          </TableCell>
          <TableCell className="w-[16%]">
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </TableCell>
          <TableCell className="w-[18%]">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </TableCell>
          <TableCell className="w-[14%] text-right pr-4">
            <div className="space-y-1.5 ml-auto">
              <Skeleton className="h-4 w-20 rounded-md ml-auto" />
              <Skeleton className="h-3 w-14 rounded-md ml-auto" />
            </div>
          </TableCell>
          <TableCell className="w-[12%] text-right pr-4">
            <div className="flex items-center justify-end gap-1.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function OrdersTableSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <Table>
      <TableHeader className="bg-[#FAF7F8]/80">
        <TableRow>
          <TableHead className="w-10 pl-4">
            <Skeleton className="h-4 w-4 rounded" />
          </TableHead>
          <TableHead className="w-[18%]">Order / Date</TableHead>
          <TableHead className="w-[22%]">Customer</TableHead>
          <TableHead className="w-[16%]">Location</TableHead>
          <TableHead className="w-[18%]">Unified Status</TableHead>
          <TableHead className="w-[14%] text-right pr-4">Total</TableHead>
          <TableHead className="w-[12%] text-right pr-4">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <OrdersTableRowsSkeleton count={rowCount} />
      </TableBody>
    </Table>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="space-y-5">
      <OrdersHeaderSkeleton />
      <OrdersFilterBarSkeleton />
      <Card className="rounded-[24px] border-[#EEDFE5] bg-white overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <OrdersTableSkeleton rowCount={8} />
        </CardContent>
      </Card>
    </div>
  );
}
