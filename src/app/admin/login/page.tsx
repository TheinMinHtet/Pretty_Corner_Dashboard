"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminStore();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "1") {
        toast.error(t.sessionExpiredToast);
      }
    }
  }, [t.sessionExpiredToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.loginEmptyToast);
      return;
    }

    setLoading(true);
    const success = await login(email, password, rememberMe);
    setLoading(false);

    if (success) {
      toast.success(t.loginWelcomeToast);
      router.push("/admin");
    } else {
      toast.error(t.loginErrorToast);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FFFCFC] flex flex-col justify-center items-center px-4 py-12">
      {/* Top Language Toggle */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20">
        <LanguageToggle />
      </div>

      {/* Decorative Brand Header */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#FCEEF2] text-[#D96B91] mb-4 shadow-sm">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-3xl font-black tracking-tight text-[#33272C]">
          Pretty Corner
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#806B73] font-semibold mt-1">
          {t.loginPortalTitle}
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-[#F0E1E6] rounded-[32px] p-8 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between pb-6 border-b border-[#F0E1E6]">
          <div>
            <h2 className="text-lg font-bold text-[#33272C]">{t.adminLogin}</h2>
            <p className="text-xs text-[#806B73] mt-0.5">
              {t.secureAccessDesc}
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-[#D96B91]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-[#33272C]">
              {t.staffEmail}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#806B73]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@prettycorner.com"
                className="pl-10 h-11 rounded-2xl border-[#F0E1E6] focus-visible:ring-[#E99AB5]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-[#33272C]">
              {t.password}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#806B73]" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 h-11 rounded-2xl border-[#F0E1E6] focus-visible:ring-[#E99AB5]"
                required
              />
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-md border-[#F0E1E6] text-[#D96B91] focus:ring-[#E99AB5] accent-[#D96B91] cursor-pointer"
            />
            <Label
              htmlFor="rememberMe"
              className="text-xs text-[#806B73] hover:text-[#33272C] cursor-pointer select-none font-normal"
            >
              {t.rememberMe}
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-2xl bg-[#D96B91] hover:bg-[#c2567c] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.authenticating}</span>
              </>
            ) : (
              <>
                <span>{t.enterAdminPortal}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Footer Info */}
      <p className="text-[11px] text-[#806B73] mt-8 text-center">
        Protected by Pretty Corner Administrative Security. Authorized personnel only.
      </p>
    </div>
  );
}
