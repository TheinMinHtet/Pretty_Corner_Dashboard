import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[#FAF4F6]/70 border border-[#F0E1E6]/40 transition-all duration-300",
        className
      )}
      {...props}
    />
  );
}
