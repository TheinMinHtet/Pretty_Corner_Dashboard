import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProductsTableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#F0E1E6]">
          <TableHead className="w-[32%]">Product & SKU</TableHead>
          <TableHead className="w-[18%] hidden md:table-cell">Category</TableHead>
          <TableHead className="w-[18%]">Price</TableHead>
          <TableHead className="w-[14%]">Stock</TableHead>
          <TableHead className="w-[10%] hidden sm:table-cell">Status</TableHead>
          <TableHead className="w-[8%] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow key={i} className="border-b border-[#F0E1E6]/50">
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Skeleton className="h-6 w-24 rounded-full" />
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16 rounded-full" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-6 w-16 rounded-full" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
