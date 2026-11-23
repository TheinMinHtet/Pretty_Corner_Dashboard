"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root global error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF7F8] text-[#38262E] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded-[32px] border border-[#EEDFE5] bg-white p-8 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67] text-2xl font-black">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#38262E]">System Error</h1>
            <p className="text-sm text-[#7A6870] leading-relaxed">
              A critical application error occurred. Click below to reload the application.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="h-11 px-6 rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white font-medium transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
