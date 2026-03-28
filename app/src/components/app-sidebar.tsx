"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, MapPin, KanbanSquare, Briefcase, Settings, LogOut } from "lucide-react";
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
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-md">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span
            style={{ fontFamily: "var(--font-display)" }}
            className="text-xl tracking-wide text-sidebar-foreground"
          >
            HOUSEFINDER
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
        <SidebarMenu>
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
