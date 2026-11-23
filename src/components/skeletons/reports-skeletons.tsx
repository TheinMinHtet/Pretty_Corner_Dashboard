import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SalesReportsHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
    </div>
  );
}

export function SalesReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-2xl border-[#EEDFE5] bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-7 w-36 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SalesReportsRevenueTrendSkeleton() {
  return (
    <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
      <CardHeader className="p-0 pb-3 space-y-2">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-3.5 w-64 rounded-md" />
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="h-[280px] w-full rounded-2xl bg-[#FAF7F8]/80 border border-[#F0E1E6]/40 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center opacity-60">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="w-full flex items-end justify-between gap-2 h-44 px-2">
            {[40, 65, 30, 85, 55, 90, 75, 60, 95, 70, 80, 85].map((h, idx) => (
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
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesReportsCategoryAndStatusSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      {/* Category Sales Skeleton */}
      <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <div className="my-6 flex items-center justify-center">
          <div className="h-44 w-44 rounded-full border-8 border-[#FAF4F6] flex items-center justify-center animate-pulse">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </Card>

      {/* Orders by Status Skeleton */}
      <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
        </div>
        <div className="my-6 flex items-center justify-center">
          <div className="h-44 w-44 rounded-full border-8 border-[#FAF4F6] flex items-center justify-center animate-pulse">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-2 rounded-xl bg-[#FAF7F8] border border-[#F0E1E6]/40 flex flex-col items-center gap-1"
            >
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-4 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function SalesReportsPaymentAndRetentionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      {/* Payment Methods Breakdown Skeleton */}
      <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
        <div className="space-y-2 pb-4 border-b border-[#F0E1E6]/60">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F8]/80 border border-[#F0E1E6]/40">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-2.5 w-16 rounded-md" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-3.5 w-20 rounded-md ml-auto" />
                <Skeleton className="h-2.5 w-12 rounded-md ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Customer Retention Skeleton */}
      <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-2 pb-4 border-b border-[#F0E1E6]/60">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
        </div>
        <div className="my-4 p-5 rounded-2xl bg-[#FAF7F8] border border-[#F0E1E6]/40 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
          <div className="h-20 w-20 rounded-full border-4 border-[#FAF4F6] flex items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#FAF7F8] border border-[#F0E1E6]/40 space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF7F8] border border-[#F0E1E6]/40 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SalesReportsTopSellersSkeleton() {
  return (
    <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
      <div className="space-y-2 pb-4 border-b border-[#F0E1E6]/60">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-3.5 w-64 rounded-md" />
      </div>
      <div className="pt-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#F0E1E6]">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TableRow key={i} className="border-b border-[#F0E1E6]/50">
                <TableCell className="w-12">
                  <Skeleton className="h-4 w-4 rounded-md" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-40 rounded-md" />
                      <Skeleton className="h-2.5 w-20 rounded-md" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-12 rounded-md ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-24 rounded-md ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function SalesReportsPageSkeleton() {
  return (
    <div className="space-y-5">
      <SalesReportsHeaderSkeleton />
      <SalesReportsKpiSkeleton />
      <SalesReportsRevenueTrendSkeleton />
      <SalesReportsCategoryAndStatusSkeleton />
      <SalesReportsPaymentAndRetentionSkeleton />
      <SalesReportsTopSellersSkeleton />
    </div>
  );
}
