"use client";

import React, { useState, useMemo } from "react";
import {
  Share2,
  Bell,
  User,
  Save,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { INITIAL_SETTINGS } from "@/data/mock-data";
import { StoreSettings } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useAdminStore();
  const { t } = useLanguage();
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Keep the editable draft in sync with persisted settings (including hydration).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirroring persisted settings into the draft form
    setDraft(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(draft);
    toast.success("Settings saved");
  };

  const handleReset = () => {
    resetDemoData();
    setDraft(INITIAL_SETTINGS);
    setIsResetConfirmOpen(false);
    toast.success("Demo data reset to defaults");
  };

  // Password Change State & Strength Meter
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "bg-slate-200", text: "text-slate-400" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-600" };
    if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500", text: "text-amber-600" };
    return { score: 3, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
  }, [newPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(t.currentPasswordRequiredToast);
      return;
    }
    if (newPassword.length < 8 || !/[0-9!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/.test(newPassword)) {
      toast.error(t.passwordLengthToast);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t.passwordMismatchToast);
      return;
    }

    setIsChangingPassword(true);
    try {
      const stored =
        typeof window !== "undefined"
          ? JSON.parse(
              window.sessionStorage.getItem("pretty_corner_auth_session_v1") ||
                window.localStorage.getItem("pretty_corner_auth_session_v1") ||
                "null"
            )
          : null;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (stored?.token) {
        headers["Authorization"] = `Bearer ${stored.token}`;
      }

      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(t.passwordChangedToast);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Failed to update password");
      }
    } catch (err) {
      console.error("Change password error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = (name || "").trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "AD";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EEDFE5]/60">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#38262E]">
            {t.settingsPageTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6870] mt-1 leading-relaxed">
            {t.settingsPageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => setIsResetConfirmOpen(true)}
            className="rounded-2xl border-[#EEDFE5] bg-white text-[#38262E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all font-medium text-xs sm:text-sm h-10 px-4 active:scale-[0.98] shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#7A6870]" />
            {t.resetDemoData}
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white transition-all font-semibold text-xs sm:text-sm h-10 px-5 shadow-xs hover:shadow-sm active:scale-[0.98]"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {t.saveSettingsBtn}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Demo Data */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[28px] border-[#EEDFE5] p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-rose-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              Reset Demo Data to Defaults?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7A6870] pt-2 leading-relaxed">
              This action will reset boutique configurations, orders, products, and inventory adjustments back to the original demo seed data. Any unsaved custom records will be permanently erased.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
              className="rounded-xl border-[#EEDFE5] text-[#38262E] hover:bg-stone-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold"
              onClick={handleReset}
            >
              Yes, Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Tabs */}
      <Tabs defaultValue="social" className="space-y-5">
        <TabsList className="h-11 rounded-[22px] bg-white/95 border border-[#EEDFE5] p-1 shadow-2xs gap-1 inline-flex">
          <TabsTrigger
            value="social"
            className="rounded-[18px] px-4 py-2 text-xs font-semibold text-[#7A6870] transition-all data-[state=active]:bg-[#B73D67] data-[state=active]:text-white data-[state=active]:shadow-xs hover:text-[#38262E]"
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            {t.socialChannelsTitle}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-[18px] px-4 py-2 text-xs font-semibold text-[#7A6870] transition-all data-[state=active]:bg-[#B73D67] data-[state=active]:text-white data-[state=active]:shadow-xs hover:text-[#38262E]"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {t.tabStockAlerts}
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="rounded-[18px] px-4 py-2 text-xs font-semibold text-[#7A6870] transition-all data-[state=active]:bg-[#B73D67] data-[state=active]:text-white data-[state=active]:shadow-xs hover:text-[#38262E]"
          >
            <User className="h-3.5 w-3.5 mr-1.5" />
            {t.tabAdminProfile}
          </TabsTrigger>
        </TabsList>

        {/* 1. Social Channels Tab */}
        <TabsContent value="social">
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white shadow-2xs overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-[#F5EDF0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67]">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-[#38262E]">
                    {t.socialChannelsTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6870] mt-0.5">
                    {t.socialChannelsDesc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Facebook */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#EEDFE5] bg-[#FAF7F8]/40 p-4 transition-all hover:border-[#1877F2]/40 hover:bg-white hover:shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                        <Label className="text-xs font-bold text-[#38262E]">
                          Facebook
                        </Label>
                      </div>
                      {draft.socialLinks.facebook ? (
                        <a
                          href={draft.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1877F2] hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                    <Input
                      value={draft.socialLinks.facebook}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          socialLinks: {
                            ...draft.socialLinks,
                            facebook: e.target.value,
                          },
                        })
                      }
                      placeholder="https://facebook.com/prettycorner"
                      className="rounded-xl border-[#EEDFE5] bg-white text-xs h-10 focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#7A6870] mt-3">
                    Directs shoppers to your official Facebook boutique page.
                  </p>
                </div>

                {/* Instagram */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#EEDFE5] bg-[#FAF7F8]/40 p-4 transition-all hover:border-[#E1306C]/40 hover:bg-white hover:shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1306C]/10 text-[#E1306C]">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                        </div>
                        <Label className="text-xs font-bold text-[#38262E]">
                          Instagram
                        </Label>
                      </div>
                      {draft.socialLinks.instagram ? (
                        <a
                          href={draft.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E1306C] hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                    <Input
                      value={draft.socialLinks.instagram}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          socialLinks: {
                            ...draft.socialLinks,
                            instagram: e.target.value,
                          },
                        })
                      }
                      placeholder="https://instagram.com/prettycorner"
                      className="rounded-xl border-[#EEDFE5] bg-white text-xs h-10 focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#7A6870] mt-3">
                    Showcases curated cosmetic looks and new arrival reels.
                  </p>
                </div>

                {/* TikTok */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#EEDFE5] bg-[#FAF7F8]/40 p-4 transition-all hover:border-black/40 hover:bg-white hover:shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900/10 text-stone-900">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                          </svg>
                        </div>
                        <Label className="text-xs font-bold text-[#38262E]">
                          TikTok
                        </Label>
                      </div>
                      {draft.socialLinks.tiktok ? (
                        <a
                          href={draft.socialLinks.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-900 hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                    <Input
                      value={draft.socialLinks.tiktok}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          socialLinks: {
                            ...draft.socialLinks,
                            tiktok: e.target.value,
                          },
                        })
                      }
                      placeholder="https://tiktok.com/@prettycorner"
                      className="rounded-xl border-[#EEDFE5] bg-white text-xs h-10 focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#7A6870] mt-3">
                    Connects live beauty reviews, swatches, and creator videos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Stock & Alerts Tab */}
        <TabsContent value="notifications" className="space-y-5">
          {/* Low-Stock Threshold */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white shadow-2xs overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-[#F5EDF0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-[#38262E]">
                    {t.lowStockThresholdTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6870] mt-0.5">
                    {t.lowStockThresholdDesc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-md space-y-3">
                <Label className="text-xs font-semibold text-[#38262E]">
                  {t.defaultThresholdLabel}
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={draft.defaultLowStockThreshold}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          defaultLowStockThreshold: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 pr-16 text-sm h-11 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 font-semibold text-[#38262E]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-[#7A6870]">
                      Units
                    </span>
                  </div>
                </div>

                {/* Preset Threshold Chips */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-[#7A6870]">
                    Quick Presets:
                  </span>
                  {[5, 10, 15, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, defaultLowStockThreshold: val })
                      }
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        draft.defaultLowStockThreshold === val
                          ? "bg-rose-50 text-[#B73D67] border-rose-200 shadow-2xs"
                          : "bg-white text-[#514149] border-[#EEDFE5] hover:bg-rose-50/40"
                      }`}
                    >
                      {val} units
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#7A6870] leading-relaxed pt-1">
                  When a product&apos;s available inventory dips to or below this count, it triggers an operational reorder alert badge across the inventory ledger and dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white shadow-2xs overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-[#F5EDF0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-[#38262E]">
                    {t.notificationPrefsTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6870] mt-0.5">
                    {t.notificationPrefsDesc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5">
              {[
                {
                  key: "newOrderAlert",
                  label: "New Order Alerts",
                  desc: "Instantly notify the operations team when a customer completes checkout on the storefront.",
                },
                {
                  key: "lowStockAlert",
                  label: "Low-Stock Alerts",
                  desc: "Broadcast reorder warnings whenever an active SKU crosses its threshold limit.",
                },
                {
                  key: "paymentFailureAlert",
                  label: "Payment Failure Alerts",
                  desc: "Alert when a mobile wallet transaction expires or fails validation.",
                },
              ].map((item) => {
                const k = item.key as keyof typeof draft.notifications;
                const isChecked = Boolean(draft.notifications[k]);
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                      isChecked
                        ? "border-[#F1D3DF] bg-[#FAF7F8]/60 hover:bg-[#FAF7F8]"
                        : "border-[#F0E1E6] bg-white hover:bg-stone-50/50"
                    }`}
                  >
                    <div className="space-y-0.5 pr-4">
                      <p className="text-sm font-bold text-[#38262E]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[#7A6870] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            [k]: checked,
                          },
                        })
                      }
                      className="data-[state=checked]:bg-[#B73D67]"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Admin Profile Tab */}
        <TabsContent value="profile">
          <Card className="rounded-[28px] border-[#EEDFE5] bg-white shadow-2xs overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-[#F5EDF0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B73D67] text-white font-bold text-base shadow-xs">
                    {getInitials(draft.adminProfile.name)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#38262E] flex items-center gap-2">
                      {draft.adminProfile.name || t.adminProfileTitle}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-[#7A6870] mt-0.5">
                      {draft.adminProfile.role || "Store Administrator"} • {draft.adminProfile.email}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#7A6870] bg-[#FAF7F8] px-3 py-1.5 rounded-xl border border-[#EEDFE5] self-start sm:self-auto">
                  <ShieldCheck className="h-4 w-4 text-[#B73D67]" />
                  <span>Session Authenticated</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#38262E]">
                    {t.fullNameLabel}
                  </Label>
                  <Input
                    value={draft.adminProfile.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        adminProfile: {
                          ...draft.adminProfile,
                          name: e.target.value,
                        },
                      })
                    }
                    className="rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#38262E]">
                    {t.roleLabel}
                  </Label>
                  <Input
                    value={draft.adminProfile.role}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        adminProfile: {
                          ...draft.adminProfile,
                          role: e.target.value,
                        },
                      })
                    }
                    className="rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#38262E]">
                    {t.emailAddressLabel}
                  </Label>
                  <Input
                    type="email"
                    value={draft.adminProfile.email}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        adminProfile: {
                          ...draft.adminProfile,
                          email: e.target.value,
                        },
                      })
                    }
                    className="rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#38262E]">
                    {t.phoneNumberLabel}
                  </Label>
                  <Input
                    value={draft.adminProfile.phone}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        adminProfile: {
                          ...draft.adminProfile,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Authentication Card (Change Password) */}
          <Card className="rounded-[32px] border border-[#EEDFE5] bg-white shadow-2xs overflow-hidden mt-6 transition-all duration-200">
            <CardHeader className="p-6 pb-4 border-b border-[#F5EDF0]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCEEF2] text-[#B73D67] shadow-2xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight text-[#38262E]">
                    {t.securityPasswordTitle}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#7A6870] mt-0.5">
                    {t.securityPasswordDesc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePasswordChange} className="space-y-5 max-w-xl">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-bold text-[#38262E]">
                    {t.currentPasswordLabel}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6870]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6870] hover:text-[#38262E] transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-bold text-[#38262E]">
                      {t.newPasswordLabel}
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6870]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="pl-10 pr-10 rounded-xl border-[#EEDFE5] bg-[#FAF7F8]/40 focus:bg-white focus:border-[#B73D67] focus:ring-2 focus:ring-[#B73D67]/15 transition-all text-sm h-11 text-[#38262E]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6870] hover:text-[#38262E] transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold text-[#38262E]">
                      {t.confirmPasswordLabel}
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6870]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`pl-10 pr-10 rounded-xl bg-[#FAF7F8]/40 focus:bg-white focus:ring-2 transition-all text-sm h-11 text-[#38262E] ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                            : "border-[#EEDFE5] focus:border-[#B73D67] focus:ring-[#B73D67]/15"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6870] hover:text-[#38262E] transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator & Live Requirements Checklist */}
                {newPassword && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7A6870] font-medium">Password Strength:</span>
                      <span className={`font-bold ${passwordStrength.text}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    {/* Segmented bar */}
                    <div className="grid grid-cols-3 gap-1.5 h-1.5">
                      <div
                        className={`rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 1 ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 2 ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 3 ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                    </div>
                    {/* Compact checklist */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#7A6870] pt-1">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          newPassword.length >= 8 ? "text-emerald-700 font-semibold" : ""
                        }`}
                      >
                        {newPassword.length >= 8 ? <Check className="h-3 w-3" /> : "•"} At least 8 characters
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          /[0-9!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/.test(newPassword)
                            ? "text-emerald-700 font-semibold"
                            : ""
                        }`}
                      >
                        {/[0-9!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/.test(newPassword) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          "•"
                        )}{" "}
                        Number or symbol
                      </span>
                      {confirmPassword && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            newPassword === confirmPassword
                              ? "text-emerald-700 font-semibold"
                              : "text-rose-600 font-semibold"
                          }`}
                        >
                          {newPassword === confirmPassword ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            "•"
                          )}{" "}
                          Passwords match
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="rounded-2xl bg-[#B73D67] hover:bg-[#982F53] text-white font-semibold text-xs sm:text-sm h-11 px-6 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>{t.updatePasswordBtn}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
