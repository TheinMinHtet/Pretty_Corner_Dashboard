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

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-52 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#EEDFE5]">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DashboardMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="rounded-[28px] border-[#EEDFE5] bg-white p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <div className="mt-4 pt-3 border-t border-[#F0E1E6]/50 flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 2-Column Revenue Area Chart Skeleton */}
      <Card className="col-span-1 lg:col-span-2 rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-60 rounded-md" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="h-[280px] w-full rounded-2xl bg-[#FAF7F8]/80 border border-[#F0E1E6]/40 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center opacity-60">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="w-full flex items-end justify-between gap-2 h-44 px-2">
            {[45, 70, 35, 80, 60, 95, 65, 85, 90, 75].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-[#F5EDF0] rounded-t-md animate-pulse"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between items-center opacity-60 pt-2 border-t border-[#F0E1E6]/40">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </Card>

      {/* 1-Column Orders Trend Card Skeleton */}
      <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-1.5 pb-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-48 rounded-md" />
        </div>
        <div className="h-[280px] w-full rounded-2xl bg-[#FAF7F8]/80 border border-[#F0E1E6]/40 p-4 flex flex-col justify-between">
          <div className="w-full flex items-end justify-between gap-2 h-48 px-2">
            {[30, 50, 45, 75, 60, 85, 40, 90].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-[#F5EDF0] rounded-t-md animate-pulse"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between items-center opacity-60 pt-2 border-t border-[#F0E1E6]/40">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function DashboardRecentOrdersSkeleton() {
  return (
    <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-[#F0E1E6]/60">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-52 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="pt-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#F0E1E6]">
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Township</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i} className="border-b border-[#F0E1E6]/50">
                <TableCell>
                  <Skeleton className="h-4 w-28 rounded-md" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 rounded-md ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function DashboardLowStockSkeleton() {
  return (
    <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-[#F0E1E6]/60">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-52 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F8] border border-[#F0E1E6]/50"
          >
            <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <DashboardMetricsSkeleton />
      <DashboardChartsSkeleton />
      <DashboardRecentOrdersSkeleton />
      <DashboardLowStockSkeleton />
    </div>
  );
}
