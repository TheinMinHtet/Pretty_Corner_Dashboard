import React, { Suspense } from "react";
import { Toaster } from "sonner";
import { AdminProvider } from "@/context/admin-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <TooltipProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#FFFCFC]" />}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              border: "1px solid #F0E1E6",
              background: "#FFFFFF",
              color: "#33272C",
            },
          }}
        />
      </TooltipProvider>
    </AdminProvider>
  );
}
