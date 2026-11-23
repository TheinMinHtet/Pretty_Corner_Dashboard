"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin runtime error caught:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-lg rounded-[32px] border border-[#EEDFE5] bg-white p-8 md:p-10 shadow-xs text-center space-y-6 transition-all duration-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-[#38262E]">
            Something went wrong
          </h2>
          <p className="text-sm text-[#7A6870] leading-relaxed">
            An unexpected error occurred while loading this administrative view.
            Your changes and store data remain secure.
          </p>
        </div>
        {error?.digest && (
          <p className="font-mono text-xs text-[#7A6870]/70 bg-[#FAF7F8] py-1.5 px-3 rounded-lg border border-[#EEDFE5]/60 inline-block">
            Digest: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white font-medium shadow-xs gap-2 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto h-11 px-6 rounded-2xl border-[#EEDFE5] text-[#38262E] hover:bg-[#FAF7F8] font-medium gap-2 transition-colors"
          >
            <Link href="/admin">
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
