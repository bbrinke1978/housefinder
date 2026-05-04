"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Briefcase, BarChart2, Users, Bug, Plus } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// Mobile bottom nav: 6 items — Dashboard, Deals, Buyers, Analytics, Map, Bugs/Features
// (Mobile uses the short "Bugs" label so all 6 items fit; the route stays /feedback)
const bottomNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Buyers", href: "/buyers", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Bugs", href: "/feedback", icon: Bug },
];

// JV partner bottom nav: 2 items only
const jvBottomNavItems = [
  { label: "Submit", href: "/jv-submit", icon: Plus },
  { label: "Ledger", href: "/jv-ledger", icon: BarChart2 },
];

interface MobileBottomNavProps {
  feedbackBadgeCount?: number;
  /** canManageUsers — when false, suppress any admin indicator (mobile nav has no admin link currently) */
  canManageUsers?: boolean;
  /** isJvPartner — when true, render the 2-item JV nav instead of the full 6-item nav */
  isJvPartner?: boolean;
}

export function MobileBottomNav({ feedbackBadgeCount = 0, isJvPartner = false }: MobileBottomNavProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  if (!isMobile) return null;

  const navItems = isJvPartner ? jvBottomNavItems : bottomNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl flex items-center justify-around px-1 safe-area-bottom"
      style={{ height: "calc(56px + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const showBadge = item.href === "/feedback" && feedbackBadgeCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-[44px] min-w-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[9px] font-medium transition-all duration-200 ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <item.icon
                className={`h-[20px] w-[20px] transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {showBadge && (
                <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
                  {feedbackBadgeCount > 9 ? "9+" : feedbackBadgeCount}
                </span>
              )}
            </div>
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
