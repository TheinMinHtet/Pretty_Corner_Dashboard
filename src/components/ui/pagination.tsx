"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  limit?: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  className?: string;
  itemLabel?: string;
}

export function PaginationControl({
  page,
  totalPages,
  totalItems,
  limit = 10,
  isLoading = false,
  onPageChange,
  className,
  itemLabel = "items",
}: PaginationControlProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= limit)) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems ? Math.min((page - 1) * limit + 1, totalItems) : (page - 1) * limit + 1;
  const endItem = totalItems ? Math.min(page * limit, totalItems) : page * limit;

  // Build visible page numbers (sliding window around current page)
  const getPageNumbers = () => {
    const pages: (number | "dots")[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("dots");

      const start = Math.max(2, page - 1);
      const end = Math.min(safeTotalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < safeTotalPages - 2) pages.push("dots");
      pages.push(safeTotalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-[#F0E1E6] bg-white/70 backdrop-blur-sm rounded-b-[24px] select-none transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-[#806B73]">
          {totalItems !== undefined ? (
            <>
              Showing <span className="font-semibold text-[#33272C]">{startItem}</span>–
              <span className="font-semibold text-[#33272C]">{endItem}</span> of{" "}
              <span className="font-semibold text-[#33272C]">{totalItems}</span> {itemLabel}
            </>
          ) : (
            <>
              Page <span className="font-semibold text-[#33272C]">{page}</span> of{" "}
              <span className="font-semibold text-[#33272C]">{safeTotalPages}</span>
            </>
          )}
        </p>
        {isLoading && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#D96B91] font-medium animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="h-8 px-2.5 rounded-xl border-[#F0E1E6] hover:border-[#D96B91] hover:text-[#B73D67] text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Prev
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "dots") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-1.5 text-xs text-[#806B73] font-mono select-none"
                >
                  …
                </span>
              );
            }
            const isActive = p === page;
            return (
              <button
                key={p}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(p)}
                className={cn(
                  "min-w-8 h-8 px-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#FCEEF2] text-[#B73D67] shadow-xs border border-[#F0E1E6]"
                    : "text-[#806B73] hover:text-[#33272C] hover:bg-[#FDF6F8]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        <span className="sm:hidden text-xs font-medium text-[#806B73] px-2">
          {page} / {safeTotalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= safeTotalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="h-8 px-2.5 rounded-xl border-[#F0E1E6] hover:border-[#D96B91] hover:text-[#B73D67] text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
