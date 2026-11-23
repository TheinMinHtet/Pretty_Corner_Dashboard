"use client";

import React, { useState } from "react";
import {
  Store,
  CreditCard,
  Bell,
  User,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
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
import { AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useAdminStore();
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#38262E]">
            Store Settings
          </h2>
          <p className="text-sm text-[#7A6870]">
            Configure Pretty Corner store details, payment methods, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsResetConfirmOpen(true)}
            className="border-[#EEDFE5] text-[#38262E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          >
            <RotateCcw className="h-4 w-4" /> Reset Demo Data
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Demo Data (P1 Guardrail) */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Reset Demo Data to Factory Defaults?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7A6870] pt-1">
              This action will reset all boutique configurations, orders, products, and inventory adjustments back to the original demo seed data. Any unsaved custom records will be permanently erased.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleReset}
            >
              Yes, Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="store">
            <Store className="h-3.5 w-3.5 mr-1.5" /> Store & Contact
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Stock & Alerts
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-3.5 w-3.5 mr-1.5" /> Admin Profile
          </TabsTrigger>
        </TabsList>

        {/* Store & Contact */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store & Contact Information</CardTitle>
              <CardDescription>
                Boutique identity and customer support channels
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Store Name</Label>
                <Input
                  value={draft.storeName}
                  onChange={(e) =>
                    setDraft({ ...draft, storeName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input
                  value={draft.tagline}
                  onChange={(e) =>
                    setDraft({ ...draft, tagline: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={draft.supportEmail}
                  onChange={(e) =>
                    setDraft({ ...draft, supportEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Support Phone</Label>
                <Input
                  value={draft.supportPhone}
                  onChange={(e) =>
                    setDraft({ ...draft, supportPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Viber Hotline</Label>
                <Input
                  value={draft.viberPhone}
                  onChange={(e) =>
                    setDraft({ ...draft, viberPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Boutique Address</Label>
                <Input
                  value={draft.address}
                  onChange={(e) =>
                    setDraft({ ...draft, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft({ ...draft, currency: e.target.value })
                  }
                  placeholder="MMK"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Social Channels</CardTitle>
              <CardDescription>
                Public links used on storefront content (PC-CT-006)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Facebook</Label>
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
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
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
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>TikTok</Label>
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
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Settings</CardTitle>
              <CardDescription>
                Enable or disable accepted checkout payment channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "kbzPay", label: "KBZPay" },
                { key: "wavePay", label: "WavePay" },
                { key: "cbPay", label: "CB Pay" },
                { key: "ayaPay", label: "AYA Pay" },
                { key: "cod", label: "Cash on Delivery (COD)" },
              ].map((pm) => {
                const k = pm.key as keyof typeof draft.paymentMethods;
                return (
                  <div
                    key={pm.key}
                    className="flex items-center justify-between rounded-xl border border-[#F0E1E6] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-[#33272C]">
                      {pm.label}
                    </span>
                    <Switch
                      checked={draft.paymentMethods[k]}
                      onCheckedChange={(checked) =>
                        setDraft({
                          ...draft,
                          paymentMethods: {
                            ...draft.paymentMethods,
                            [k]: checked,
                          },
                        })
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory & Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low-Stock Threshold</CardTitle>
              <CardDescription>
                Default reorder alert threshold for new products
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-xs">
              <div className="space-y-1.5">
                <Label>Default Threshold (Units)</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.defaultLowStockThreshold}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      defaultLowStockThreshold: Number(e.target.value),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which admin alerts appear in your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: "newOrderAlert",
                  label: "New Order Alerts",
                  desc: "Notify immediately when an order is created (fires once checkout records an order)",
                },
                {
                  key: "lowStockAlert",
                  label: "Low-Stock Alerts",
                  desc: "Warn when active SKUs cross their reorder threshold",
                },
                {
                  key: "paymentFailureAlert",
                  label: "Payment Failure Alerts",
                  desc: "Alert when a payment is marked Failed or Expired",
                },
                {
                  key: "dailySummaryEmail",
                  label: "Daily Summary Digest",
                  desc: "End-of-day revenue & order summary",
                },
              ].map((item) => {
                const k = item.key as keyof typeof draft.notifications;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-[#F0E1E6] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#33272C]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[#806B73]">{item.desc}</p>
                    </div>
                    <Switch
                      checked={draft.notifications[k]}
                      onCheckedChange={(checked) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            [k]: checked,
                          },
                        })
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Administrator Profile</CardTitle>
              <CardDescription>
                Manage your administrator display details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address</Label>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
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
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
