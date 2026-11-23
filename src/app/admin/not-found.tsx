import React from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-lg rounded-[32px] border border-[#EEDFE5] bg-white p-8 md:p-10 shadow-xs text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67]">
          <Search className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-[#38262E]">
            Admin Resource Not Found
          </h2>
          <p className="text-sm text-[#7A6870] leading-relaxed">
            The requested product, order, category, or administrative record could not be found.
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            className="h-11 px-6 rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white font-medium shadow-xs gap-2 transition-colors"
          >
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
