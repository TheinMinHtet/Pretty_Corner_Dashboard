"use client";

import React, { useState } from "react";
import {
  Store,
  Truck,
  Bell,
  User,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
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

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useAdminStore();
  const [draft, setDraft] = useState(settings);

  const handleSave = () => {
    updateSettings(draft);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
            Store Settings
          </h2>
          <p className="text-sm text-[#806B73]">
            Configure Pretty Corner store details, delivery fees, payments, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetDemoData();
              toast.success("Demo data reset to defaults");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset Demo Data
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="store">
            <Store className="h-3.5 w-3.5 mr-1.5" /> Store & Contact
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck className="h-3.5 w-3.5 mr-1.5" /> Delivery & Payments
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery & Payments */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Fee Configuration (MMK)</CardTitle>
              <CardDescription>
                Standard shipping rates across Myanmar regions
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Yangon Delivery Fee (MMK)</Label>
                <Input
                  type="number"
                  value={draft.yangonDeliveryFee}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      yangonDeliveryFee: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mandalay Delivery Fee (MMK)</Label>
                <Input
                  type="number"
                  value={draft.mandalayDeliveryFee}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mandalayDeliveryFee: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Other Regions Fee (MMK)</Label>
                <Input
                  type="number"
                  value={draft.otherRegionDeliveryFee}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      otherRegionDeliveryFee: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Free Shipping Threshold (MMK)</Label>
                <Input
                  type="number"
                  value={draft.freeShippingThreshold}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

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
                  desc: "Notify immediately when a customer places an order",
                },
                {
                  key: "lowStockAlert",
                  label: "Low-Stock Alerts",
                  desc: "Warn when active SKUs drop below threshold",
                },
                {
                  key: "paymentFailureAlert",
                  label: "Payment Failure Alerts",
                  desc: "Alert when KBZPay or WavePay transactions fail",
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
