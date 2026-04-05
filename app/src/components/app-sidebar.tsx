"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, MapPin, Briefcase, Users, BarChart2, Settings, LogOut, Mail, FileText, ImageIcon } from "lucide-react";
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
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Contracts", href: "/contracts", icon: FileText },
  { label: "Photos", href: "/photos/inbox", icon: ImageIcon },
  { label: "Buyers", href: "/deals/buyers", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Campaigns", href: "/campaigns", icon: Mail },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide text-sidebar-foreground">
            HouseFinder
          </span>
        </div>
        <ThemeToggle />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-2 pt-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/deals"
                ? pathname === "/deals" || (pathname.startsWith("/deals") && !pathname.startsWith("/deals/buyers"))
                : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={<Link href={item.href} />}
                  className="transition-all duration-200 rounded-xl"
                >
                  <item.icon className="h-4 w-4" />
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
          {/* Mail Settings gear icon */}
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
