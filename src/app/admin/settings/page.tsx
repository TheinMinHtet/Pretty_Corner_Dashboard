"use client";

import React, { useState } from "react";
import {
  Store,
  Truck,
  Bell,
  User,
  Save,
  RotateCcw,
  Building2,
  Plus,
  Trash2,
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

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useAdminStore();
  const [draft, setDraft] = useState<StoreSettings>(settings);

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
    toast.success("Demo data reset to defaults");
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
            onClick={handleReset}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Township Delivery Rates</CardTitle>
                  <CardDescription>
                    Service-area overrides for rider dispatch (PC-AD-003)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      townshipDeliveryFees: [
                        ...draft.townshipDeliveryFees,
                        {
                          id: `town-${Date.now()}`,
                          township: "",
                          city: "Yangon",
                          fee: draft.yangonDeliveryFee,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add Township
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {draft.townshipDeliveryFees.length === 0 ? (
                <p className="text-xs text-[#806B73]">
                  No township overrides yet — the regional fees above apply.
                </p>
              ) : (
                draft.townshipDeliveryFees.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_1fr_120px_auto] items-center gap-2"
                  >
                    <Input
                      value={row.township}
                      placeholder="Township"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          townshipDeliveryFees: draft.townshipDeliveryFees.map(
                            (r) =>
                              r.id === row.id
                                ? { ...r, township: e.target.value }
                                : r
                          ),
                        })
                      }
                    />
                    <Input
                      value={row.city}
                      placeholder="City"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          townshipDeliveryFees: draft.townshipDeliveryFees.map(
                            (r) =>
                              r.id === row.id
                                ? { ...r, city: e.target.value }
                                : r
                          ),
                        })
                      }
                    />
                    <Input
                      type="number"
                      value={row.fee}
                      aria-label={`Delivery fee for ${row.township || "township"}`}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          townshipDeliveryFees: draft.townshipDeliveryFees.map(
                            (r) =>
                              r.id === row.id
                                ? { ...r, fee: Number(e.target.value) }
                                : r
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${row.township || "township"}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          townshipDeliveryFees:
                            draft.townshipDeliveryFees.filter(
                              (r) => r.id !== row.id
                            ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                ))
              )}
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

          {/* In-Store Pickup Configuration (PC-AD-004) */}
          <Card className="rounded-[32px] border-[#F0E1E6]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#D96B91]" />
                    In-Store Pickup (Self-Collection)
                  </CardTitle>
                  <CardDescription>
                    Enable shoppers to pick up online orders directly from your physical boutique
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#806B73]">
                    {draft.pickupOptions?.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={draft.pickupOptions?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...(draft.pickupOptions || {
                            storeName: "Pretty Corner Flagship",
                            address: "No. 15, Sayar San Rd",
                            township: "Bahan",
                            city: "Yangon",
                            operatingHours: "10:00 AM - 7:30 PM",
                            contactPhone: "09-770011223",
                            instructions: "Present your order reference at collection desk.",
                          }),
                          enabled: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardHeader>
            {draft.pickupOptions?.enabled && (
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Pickup Location Name</Label>
                  <Input
                    value={draft.pickupOptions.storeName}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...draft.pickupOptions,
                          storeName: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Pretty Corner Flagship Boutique"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Collection Operating Hours</Label>
                  <Input
                    value={draft.pickupOptions.operatingHours}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...draft.pickupOptions,
                          operatingHours: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 10:00 AM - 7:30 PM (Daily)"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Store Address</Label>
                  <Input
                    value={draft.pickupOptions.address}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...draft.pickupOptions,
                          address: e.target.value,
                        },
                      })
                    }
                    placeholder="Street address & township"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Township & City</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={draft.pickupOptions.township}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          pickupOptions: {
                            ...draft.pickupOptions,
                            township: e.target.value,
                          },
                        })
                      }
                      placeholder="Township (e.g. Bahan)"
                    />
                    <Input
                      value={draft.pickupOptions.city}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          pickupOptions: {
                            ...draft.pickupOptions,
                            city: e.target.value,
                          },
                        })
                      }
                      placeholder="City (e.g. Yangon)"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Boutique Desk Phone</Label>
                  <Input
                    value={draft.pickupOptions.contactPhone}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...draft.pickupOptions,
                          contactPhone: e.target.value,
                        },
                      })
                    }
                    placeholder="09-xxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Customer Pickup Instructions</Label>
                  <Input
                    value={draft.pickupOptions.instructions}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        pickupOptions: {
                          ...draft.pickupOptions,
                          instructions: e.target.value,
                        },
                      })
                    }
                    placeholder="Instructions displayed to customers choosing in-store collection..."
                  />
                </div>
              </CardContent>
            )}
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
