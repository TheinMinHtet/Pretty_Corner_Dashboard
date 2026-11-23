import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-36 rounded-lg" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-44 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Customer, Items, Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details Card */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
            <CardHeader className="p-0 pb-4 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <CardContent className="p-0 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3.5 w-32 rounded-md" />
              </div>
            </CardContent>
          </Card>

          {/* Order Items Table Card */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
            <CardHeader className="p-0 pb-4 border-b border-[#F0E1E6]/60 flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-[#F0E1E6]/40 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40 rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-20 rounded-md ml-auto" />
                    <Skeleton className="h-3 w-12 rounded-md ml-auto" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline Events Card */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
            <CardHeader className="p-0 pb-4 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-full mt-1 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-48 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Summary & Payment) */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
            <CardHeader className="p-0 pb-4 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-32 rounded-md" />
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
              <div className="pt-3 border-t border-[#F0E1E6]/60 flex justify-between">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method & Reference Card */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs">
            <CardHeader className="p-0 pb-4 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[#F0E1E6]/40">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
