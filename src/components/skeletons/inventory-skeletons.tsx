import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function InventoryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="rounded-[28px] border-[#EEDFE5] bg-white p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function InventoryTableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <Table className="w-full text-left border-collapse table-fixed min-w-[760px]">
      <TableHeader>
        <TableRow className="border-b border-[#F0E1E6] bg-[#FAF7F8]/80">
          <TableHead className="w-[36%] pl-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
            Product & SKU
          </TableHead>
          <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
            Category
          </TableHead>
          <TableHead className="w-[18%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
            Stock Level
          </TableHead>
          <TableHead className="w-[14%] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
            Status
          </TableHead>
          <TableHead className="w-[14%] pr-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow key={i} className="border-b border-[#F0E1E6]/50">
            <TableCell className="pl-6 py-3.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <Skeleton className="h-6 w-24 rounded-full" />
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-2 w-28 rounded-full" />
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <Skeleton className="h-6 w-20 rounded-full" />
            </TableCell>
            <TableCell className="pr-6 py-3.5 text-right">
              <Skeleton className="h-8 w-24 rounded-xl ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InventoryHistoryTableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <Table className="w-full text-left border-collapse table-fixed min-w-[760px]">
      <TableHeader>
        <TableRow className="border-b border-[#F0E1E6] bg-[#FAF7F8]/80">
          <TableHead className="w-[20%] pl-6 py-3.5">Date & Time</TableHead>
          <TableHead className="w-[30%] px-4 py-3.5">Product</TableHead>
          <TableHead className="w-[15%] px-4 py-3.5">Adjustment</TableHead>
          <TableHead className="w-[20%] px-4 py-3.5">Reason</TableHead>
          <TableHead className="w-[15%] pr-6 py-3.5 text-right">Adjusted By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow key={i} className="border-b border-[#F0E1E6]/50">
            <TableCell className="pl-6 py-3.5">
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <Skeleton className="h-6 w-20 rounded-full" />
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </TableCell>
            <TableCell className="pr-6 py-3.5 text-right">
              <Skeleton className="h-3.5 w-20 rounded-md ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
