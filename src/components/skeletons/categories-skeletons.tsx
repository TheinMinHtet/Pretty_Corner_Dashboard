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

export function CategoriesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-[24px] border-[#EEDFE5] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#F0E1E6]/60">
              <Skeleton className="h-4 w-20 rounded-md" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CategoriesTableSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#F0E1E6]">
          <TableHead className="w-[30%]">Category</TableHead>
          <TableHead className="w-[30%]">Description</TableHead>
          <TableHead className="w-[12%]">Products</TableHead>
          <TableHead className="w-[10%]">Status</TableHead>
          <TableHead className="w-[10%]">Created</TableHead>
          <TableHead className="w-[8%] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow key={i} className="border-b border-[#F0E1E6]/50">
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-9 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3.5 w-20 rounded-md" />
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
