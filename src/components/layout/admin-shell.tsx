"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  FolderTree,
  Boxes,
  Users,
  Tag,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Search,
  Bell,
  ChevronRight,
  CheckCheck,
  RotateCcw,
  User,
  LogOut,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/context/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag, matchPrefix: true },
  { label: "Products", href: "/admin/products", icon: Sparkles, matchPrefix: true },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, matchPrefix: true },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes, matchPrefix: true },
  { label: "Customers", href: "/admin/customers", icon: Users, matchPrefix: true },
  { label: "Promotions", href: "/admin/promotions", icon: Tag, matchPrefix: true },
  { label: "Sales Reports", href: "/admin/reports", icon: BarChart3, matchPrefix: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, matchPrefix: true },
];

const NOTIFICATION_ICONS = {
  order: ShoppingBag,
  stock: AlertTriangle,
  system: Info,
} as const;

const NOTIFICATION_TONES = {
  order: "bg-[#FCEEF2] text-[#D96B91]",
  stock: "bg-amber-50 text-amber-600",
  system: "bg-slate-100 text-slate-600",
} as const;

const ROUTE_TITLES: Record<string, string> = {
  admin: "Dashboard",
  orders: "Orders",
  products: "Products",
  new: "New Product",
  categories: "Categories",
  inventory: "Inventory",
  customers: "Customers",
  promotions: "Promotions",
  reports: "Sales Reports",
  settings: "Settings",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    orders,
    products,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    settings,
    globalSearch,
    setGlobalSearch,
    resetDemoData,
    isAuthenticated,
    logout,
  } = useAdminStore();

  React.useEffect(() => {
    if (!isAuthenticated && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, pathname, router]);

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.orderStatus === "Pending").length,
    [orders]
  );

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => p.status === "Active" && p.stock <= p.lowStockThreshold
      ).length,
    [products]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      const label =
        ROUTE_TITLES[seg] ??
        (seg.startsWith("ord-") || seg.startsWith("prod-")
          ? seg.toUpperCase()
          : seg.charAt(0).toUpperCase() + seg.slice(1));
      crumbs.push({ label, href: acc });
    }
    return crumbs;
  }, [pathname]);

  const pageTitle =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : "Dashboard";

  // Early returns must come after every hook (Rules of Hooks).
  if (pathname === "/admin/login") {
    return <main className="min-h-screen bg-[#FFFCFC]">{children}</main>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFFCFC]">
        {/* Render children hidden to satisfy Next.js instant navigation validation */}
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    );
  }

  const isNavActive = (item: NavItem) => {
    if (item.href === "/admin") {
      return pathname === "/admin";
    }
    return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
  };

  const renderNavLinks = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item);
        const Icon = item.icon;
        const badgeCount =
          item.href === "/admin/orders"
            ? pendingOrdersCount
            : item.href === "/admin/inventory"
            ? lowStockCount
            : 0;

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
              active
                ? "bg-[#FCEEF2] text-[#D96B91] font-semibold"
                : "text-[#806B73] hover:bg-[#FDF6F8] hover:text-[#33272C]",
              isCollapsed && "justify-center px-2"
            )}
          >
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#D96B91]" />
            )}
            <Icon
              className={cn(
                "h-4.5 w-4.5 shrink-0 transition-colors",
                active
                  ? "text-[#D96B91]"
                  : "text-[#806B73] group-hover:text-[#33272C]"
              )}
            />
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      active
                        ? "bg-[#D96B91] text-white"
                        : "bg-[#FCEEF2] text-[#D96B91]"
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </>
            )}
          </Link>
        );

        if (isCollapsed) {
          return (
            <Tooltip key={item.href} delayDuration={100}>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                {badgeCount > 0 ? ` (${badgeCount})` : ""}
              </TooltipContent>
            </Tooltip>
          );
        }

        return linkContent;
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#FFFCFC]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-[#F0E1E6] bg-white transition-all duration-200 sticky top-0 h-screen shrink-0",
          collapsed ? "w-[74px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-[#F0E1E6] px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link
            href="/admin"
            className="flex items-center gap-2.5 overflow-hidden"
          >
            {collapsed ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCEEF2] border border-[#F0E1E6] font-serif text-base font-bold text-[#D96B91]">
                PC
              </div>
            ) : (
              <img
                src="/pretty-corner-logo.svg"
                alt="Pretty Corner"
                className="h-9 w-auto object-contain"
              />
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="h-8 w-8 text-[#806B73]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {renderNavLinks(collapsed)}

        <div className="border-t border-[#F0E1E6] p-3">
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="w-full text-[#806B73]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-3">
              <p className="text-xs font-semibold text-[#33272C]">
                {settings.storeName} Admin
              </p>
              <p className="text-[11px] text-[#806B73] mt-0.5">
                Boutique Operations v1.0
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#F0E1E6] bg-white/95 backdrop-blur-xs px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="flex h-16 items-center border-b border-[#F0E1E6] px-5">
                  <img
                    src="/pretty-corner-logo.svg"
                    alt="Pretty Corner"
                    className="h-9 w-auto"
                  />
                </div>
                {renderNavLinks(false, () => setMobileOpen(false))}
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1 text-xs text-[#806B73]">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                    <Link
                      href={crumb.href}
                      className={cn(
                        "truncate hover:text-[#D96B91] transition-colors",
                        idx === breadcrumbs.length - 1 &&
                          "text-[#33272C] font-medium"
                      )}
                    >
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-[#33272C] truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#806B73]" />
              <Input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search orders, products, SKU..."
                className="pl-9 bg-[#FDF6F8] border-[#F0E1E6] focus-visible:bg-white h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalSearch.trim()) {
                    const q = globalSearch.trim();
                    if (q.toUpperCase().startsWith("PC-2026")) {
                      router.push("/admin/orders");
                    } else {
                      router.push("/admin/products");
                    }
                  }
                }}
              />
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full border border-[#F0E1E6] bg-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-[#33272C]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D96B91] px-1 text-[10px] font-bold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#F0E1E6]">
                  <span className="text-xs font-semibold text-[#33272C]">
                    Notifications
                  </span>
                  {unreadNotifications > 0 && (
                    <button
                      onClick={() => {
                        markAllNotificationsRead();
                        toast.success("All notifications marked as read");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D96B91] hover:underline cursor-pointer"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#F0E1E6]/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#806B73]">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = NOTIFICATION_ICONS[n.type];
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.href) router.push(n.href);
                          }}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 hover:bg-[#FCEEF2]/40 transition-colors cursor-pointer",
                            !n.read && "bg-[#FCEEF2]/30"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                                NOTIFICATION_TONES[n.type]
                              )}
                            >
                              <Icon className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#33272C]">
                                  {n.title}
                                </span>
                                {!n.read && (
                                  <span className="h-2 w-2 rounded-full bg-[#D96B91] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#806B73] mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-full border border-[#F0E1E6] bg-white py-1 pl-1 pr-3 hover:bg-[#FCEEF2]/50 transition-colors cursor-pointer">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCEEF2] text-xs font-semibold text-[#D96B91]">
                    {settings.adminProfile.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-[#33272C] leading-tight">
                      {settings.adminProfile.name}
                    </p>
                    <p className="text-[10px] text-[#806B73] leading-tight">
                      {settings.adminProfile.role}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-xs font-semibold text-[#33272C]">
                    {settings.adminProfile.name}
                  </p>
                  <p className="text-[11px] font-normal text-[#806B73]">
                    {settings.adminProfile.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                  <User className="h-4 w-4" />
                  Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    resetDemoData();
                    toast.success("Demo data reset to defaults");
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Demo Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    toast.info("Signed out from administrator session");
                    router.push("/admin/login");
                  }}
                  className="text-rose-600 focus:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
