"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  User,
  LogOut,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { LanguageToggle } from "@/components/ui/language-toggle";
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
import { NotificationsDropdownSkeleton } from "@/components/skeletons/shell-skeletons";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
}

const NOTIFICATION_ICONS = {
  order: ShoppingBag,
  stock: AlertTriangle,
  system: Info,
} as const;

const NOTIFICATION_TONES = {
  order: "bg-[#FCEEF2] text-[#B73D67]",
  stock: "bg-amber-50 text-amber-600",
  system: "bg-slate-100 text-slate-600",
} as const;

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useIsMounted();
  const { t } = useLanguage();

  const {
    orders,
    notifications,
    inventoryStats,
    markNotificationRead,
    markAllNotificationsRead,
    settings,
    globalSearch,
    setGlobalSearch,
    isAuthenticated,
    session,
    logout,
    hydrated,
  } = useAdminStore();

  const activeUser = useMemo(() => {
    return {
      name: session?.user.name || settings.adminProfile.name,
      email: session?.user.email || settings.adminProfile.email,
      role: session?.user.role || settings.adminProfile.role,
    };
  }, [session?.user, settings.adminProfile]);

  React.useEffect(() => {
    if (!isAuthenticated && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, pathname, router]);

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: t.navDashboard, href: "/admin", icon: LayoutDashboard },
      { label: t.navOrders, href: "/admin/orders", icon: ShoppingBag, matchPrefix: true },
      { label: t.navProducts, href: "/admin/products", icon: Sparkles, matchPrefix: true },
      { label: t.navCategories, href: "/admin/categories", icon: FolderTree, matchPrefix: true },
      { label: t.navInventory, href: "/admin/inventory", icon: Boxes, matchPrefix: true },
      { label: t.navCustomers, href: "/admin/customers", icon: Users, matchPrefix: true },
      { label: t.navPromotions, href: "/admin/promotions", icon: Tag, matchPrefix: true },
      { label: t.navReports, href: "/admin/reports", icon: BarChart3, matchPrefix: true },
      { label: t.navSettings, href: "/admin/settings", icon: Settings, matchPrefix: true },
    ],
    [t]
  );

  const routeTitles: Record<string, string> = useMemo(
    () => ({
      admin: t.navDashboard,
      orders: t.navOrders,
      products: t.navProducts,
      new: t.navNewProduct,
      categories: t.navCategories,
      inventory: t.navInventory,
      customers: t.navCustomers,
      promotions: t.navPromotions,
      reports: t.navReports,
      settings: t.navSettings,
    }),
    [t]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.orderStatus === "Pending").length,
    [orders]
  );

  const lowStockCount = useMemo(
    () => inventoryStats?.lowStock ?? 0,
    [inventoryStats]
  );

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const unreadNotifications = visibleNotifications.length;

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      const label =
        routeTitles[seg] ??
        (seg.startsWith("ord-") || seg.startsWith("prod-")
          ? seg.toUpperCase()
          : seg.charAt(0).toUpperCase() + seg.slice(1));
      crumbs.push({ label, href: acc });
    }
    return crumbs;
  }, [pathname, routeTitles]);

  const pageTitle =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : t.navDashboard;

  // Early returns must come after every hook (Rules of Hooks).
  if (pathname === "/admin/login") {
    return <main className="min-h-screen bg-[#FFFCFC]">{children}</main>;
  }

  // Wait for client mount before branching on client-only auth/storage state
  // so SSR and initial hydration render identical markup.
  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="flex min-h-screen bg-[#FFFCFC] items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCEEF2] border border-[#F0E1E6] font-serif text-lg font-bold text-[#B73D67] shadow-xs">
            PC
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#806B73]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#B73D67] border-t-transparent" />
            <span>{t.loadingPrettyCorner}</span>
          </div>
        </div>
        {/* Render children hidden to satisfy Next.js instant navigation validation */}
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    );
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
      {navItems.map((item) => {
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
                ? "bg-[#FCEEF2] text-[#B73D67] font-semibold"
                : "text-[#806B73] hover:bg-[#FDF6F8] hover:text-[#33272C]",
              isCollapsed && "justify-center px-2"
            )}
          >
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#B73D67]" />
            )}
            <Icon
              className={cn(
                "h-4.5 w-4.5 shrink-0 transition-colors",
                active
                  ? "text-[#B73D67]"
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
                        ? "bg-[#B73D67] text-white"
                        : "bg-[#FCEEF2] text-[#B73D67]"
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
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return linkContent;
      })}
    </nav>
  );

  return (
    <div suppressHydrationWarning className="flex min-h-screen bg-[#FFFCFC]">
      {/* Desktop Sidebar */}
      <aside
        suppressHydrationWarning
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCEEF2] border border-[#F0E1E6] font-serif text-base font-bold text-[#B73D67]">
                PC
              </div>
            ) : (
              <Image
                src="/pretty-corner-logo.svg"
                alt="Pretty Corner"
                width={140}
                height={36}
                priority
                className="h-9 w-auto object-contain"
              />
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              aria-label={t.collapseSidebar}
              className="h-8 w-8 text-[#806B73] cursor-pointer"
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
              aria-label={t.expandSidebar}
              className="w-full text-[#806B73] cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-3">
              <p className="text-xs font-semibold text-[#33272C]">
                {settings.storeName}
              </p>
              <p className="text-[11px] text-[#806B73] mt-0.5">
                {t.boutiqueOperations}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div suppressHydrationWarning className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header suppressHydrationWarning className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#F0E1E6] bg-white/95 backdrop-blur-xs px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop Expand Sidebar Button (when collapsed) */}
            {collapsed && (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(false)}
                    aria-label={t.expandSidebar}
                    className="hidden lg:inline-flex h-8 w-8 shrink-0 text-[#806B73] cursor-pointer"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t.expandSidebar}</TooltipContent>
              </Tooltip>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col justify-between">
                <div>
                  <div className="flex h-16 items-center justify-between border-b border-[#F0E1E6] px-5">
                    <Image
                      src="/pretty-corner-logo.svg"
                      alt="Pretty Corner"
                      width={140}
                      height={36}
                      className="h-9 w-auto"
                    />
                    <LanguageToggle size="sm" />
                  </div>
                  {renderNavLinks(false, () => setMobileOpen(false))}
                </div>
                <div className="p-4 border-t border-[#F0E1E6] bg-[#FDF6F8]">
                  <p className="text-xs font-semibold text-[#33272C]">{settings.storeName}</p>
                  <p className="text-[11px] text-[#806B73]">{t.boutiqueOperations}</p>
                </div>
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
                        "truncate hover:text-[#B73D67] transition-colors",
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
                placeholder={t.searchPlaceholder}
                className="pl-9 bg-[#FDF6F8] border-[#F0E1E6] focus-visible:bg-white h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalSearch.trim()) {
                    const q = globalSearch.trim();
                    if (/^PC-/i.test(q)) {
                      router.push("/admin/orders");
                    } else {
                      router.push("/admin/products");
                    }
                  }
                }}
              />
            </div>

            {/* Language Toggle */}
            <LanguageToggle size="sm" />

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full border border-[#F0E1E6] bg-white cursor-pointer"
                  aria-label={t.notifications}
                >
                  <Bell className="h-4 w-4 text-[#33272C]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B73D67] px-1 text-[10px] font-bold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#F0E1E6]">
                  <span className="text-xs font-semibold text-[#33272C]">
                    {t.notifications}
                  </span>
                  {unreadNotifications > 0 && (
                    <button
                      onClick={() => {
                        markAllNotificationsRead();
                        toast.success(t.allMarkedReadToast);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B73D67] hover:underline cursor-pointer"
                    >
                      <CheckCheck className="h-3 w-3" /> {t.markAllRead}
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#F0E1E6]/60">
                  {!hydrated ? (
                    <NotificationsDropdownSkeleton count={3} />
                  ) : visibleNotifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#806B73]">
                      {t.noNotifications}
                    </div>
                  ) : (
                    visibleNotifications.map((n) => {
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
                                  <span className="h-2 w-2 rounded-full bg-[#B73D67] shrink-0" />
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCEEF2] text-xs font-semibold text-[#B73D67]">
                    {activeUser.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-[#33272C] leading-tight">
                      {activeUser.name}
                    </p>
                    <p className="text-[10px] text-[#806B73] leading-tight capitalize">
                      {activeUser.role}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-xs font-semibold text-[#33272C]">
                    {activeUser.name}
                  </p>
                  <p className="text-[11px] font-normal text-[#806B73]">
                    {activeUser.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                  <User className="h-4 w-4" />
                  {t.profileAndSettings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    toast.info(t.signOutToast);
                    router.push("/admin/login");
                  }}
                  className="text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main
          suppressHydrationWarning
          className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
