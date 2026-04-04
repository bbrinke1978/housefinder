"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Briefcase, BarChart2, Mail } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// Mobile bottom nav: 5 items — replaced "Buyers" with "Campaigns" (Buyers accessible from desktop sidebar)
const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Campaigns", href: "/campaigns", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Map", href: "/map", icon: MapPin },
];

export function MobileBottomNav() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl flex items-center justify-around px-1 safe-area-bottom"
      style={{ height: "calc(56px + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : item.href === "/deals"
            ? pathname === "/deals" || (pathname.startsWith("/deals") && !pathname.startsWith("/deals/buyers"))
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-200 ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon
              className={`h-[22px] w-[22px] transition-transform duration-200 ${
                isActive ? "scale-110" : ""
              }`}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span className="leading-none">{item.label}</span>
            {isActive && (
              <span className="absolute top-1.5 h-1 w-1 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
