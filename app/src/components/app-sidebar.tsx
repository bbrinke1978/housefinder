"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, MapPin, Briefcase, Users, BarChart2, Settings, LogOut, Mail, FileText, ImageIcon, Search, Building2, Bug } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Deals", href: "/deals" },
  { label: "Contracts", href: "/contracts" },
  { label: "Photos", href: "/photos/inbox" },
  { label: "Buyers", href: "/buyers" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Analytics", href: "/analytics" },
  { label: "Map", href: "/map" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Feedback", href: "/feedback" },
];

const NAV_ICONS: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Deals: Briefcase,
  Contracts: FileText,
  Photos: ImageIcon,
  Buyers: Users,
  Wholesale: Building2,
  Analytics: BarChart2,
  Map: MapPin,
  Campaigns: Mail,
  Feedback: Bug,
};

interface AppSidebarProps {
  feedbackBadgeCount?: number;
}

export function AppSidebar({ feedbackBadgeCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-display font-bold tracking-wide text-sidebar-foreground">
            No BS Workbench
          </span>
        </div>
        <ThemeToggle />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-2 pt-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.label] ?? LayoutDashboard;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const showBadge = item.href === "/feedback" && feedbackBadgeCount > 0;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={<Link href={item.href} />}
                  className="transition-all duration-200 rounded-xl"
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground px-0.5">
                        {feedbackBadgeCount > 9 ? "9+" : feedbackBadgeCount}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="px-2">
        <SidebarSeparator />
        <div className="px-3 py-2 text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">Ctrl</kbd>
          {" + "}
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">K</kbd>
          <span className="ml-1">Quick navigation</span>
        </div>
        <SidebarMenu>
          {/* Mail Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/settings/mail")}
              render={<Link href="/settings/mail" />}
              className="transition-all duration-200 rounded-xl"
            >
              <Mail className="h-4 w-4" />
              <span className="font-semibold">Mail Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Skip Tracing */}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/settings/skip-tracing")}
              render={<Link href="/settings/skip-tracing" />}
              className="transition-all duration-200 rounded-xl"
            >
              <Search className="h-4 w-4" />
              <span className="font-semibold">Skip Tracing</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Settings gear icon */}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/settings"}
              render={<Link href="/settings" />}
              className="transition-all duration-200 rounded-xl"
            >
              <Settings className="h-4 w-4" />
              <span className="font-semibold">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
