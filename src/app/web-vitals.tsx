"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Only log in development when explicitly enabled
    if (process.env.NODE_ENV === "development") {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { __DEBUG_VITALS__?: boolean }).__DEBUG_VITALS__
      ) {
        console.debug(`[WebVitals] ${metric.name}: ${Math.round(metric.value)}ms`);
      }
    }
  });

  return null;
}
