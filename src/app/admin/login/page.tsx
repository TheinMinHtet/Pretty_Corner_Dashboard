"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
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
  const [email, setEmail] = useState("admin@prettycorner.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.loginEmptyToast);
      return;
    }

    setLoading(true);
    const success = login(email, password);
    setLoading(false);

    if (success) {
      toast.success(t.loginWelcomeToast);
      router.push("/admin");
    } else {
      toast.error(t.loginErrorToast);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@prettycorner.com");
    setPassword("admin123");
    toast.info(t.demoPin);
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-[#33272C]">
                {t.password}
              </Label>
              <span className="text-[11px] text-[#806B73]">{t.demoPin}</span>
            </div>
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-2xl bg-[#D96B91] hover:bg-[#c2567c] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>{loading ? t.authenticating : t.enterAdminPortal}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* 1-Click Demo Shortcut */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full text-center py-2.5 px-3 rounded-2xl border border-dashed border-[#F0E1E6] hover:border-[#D96B91] bg-[#FDF6F8] hover:bg-[#FCEEF2] text-xs text-[#806B73] hover:text-[#D96B91] font-medium transition-all duration-150 cursor-pointer"
            >
              ✨ {t.fillDemoCredentials}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Info */}
      <p className="text-[11px] text-[#806B73] mt-8 text-center">
        Protected by Pretty Corner Administrative Security. Authorized personnel only.
      </p>
    </div>
  );
}
