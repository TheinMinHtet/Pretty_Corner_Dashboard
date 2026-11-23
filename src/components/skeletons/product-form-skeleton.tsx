import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export function ProductFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F0E1E6]/60">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-60 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (General Info & Details) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-40 rounded-md" />
            </CardHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (Organization, Pricing, Stock, Media) */}
        <div className="space-y-6">
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-28 rounded-md" />
            </CardHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-[#EEDFE5] bg-white p-6 shadow-xs space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-[#F0E1E6]/60">
              <Skeleton className="h-5 w-24 rounded-md" />
            </CardHeader>
            <div className="pt-2">
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
