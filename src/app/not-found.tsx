import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-[32px] border border-[#EEDFE5] bg-white p-8 md:p-12 shadow-xs text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FCEEF2] text-[#B73D67]">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-[#38262E]">
            404 - Page Not Found
          </h1>
          <p className="text-sm text-[#7A6870] leading-relaxed max-w-sm mx-auto">
            The page or resource you are looking for does not exist or has been relocated.
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            className="h-11 px-6 rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white font-medium shadow-xs gap-2 transition-colors"
          >
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Return to Pretty Corner Admin
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
