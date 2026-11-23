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

export function CustomersTableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#F0E1E6]">
          <TableHead className="w-[30%]">Customer</TableHead>
          <TableHead className="w-[20%]">Location</TableHead>
          <TableHead className="w-[15%] text-right">Orders</TableHead>
          <TableHead className="w-[15%] text-right">Total Spent</TableHead>
          <TableHead className="w-[12%] text-right">AOV</TableHead>
          <TableHead className="w-[8%] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow key={i} className="border-b border-[#F0E1E6]/50">
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-2.5 w-16 rounded-md" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-6 w-14 rounded-full ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-20 rounded-md ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 rounded-md ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
