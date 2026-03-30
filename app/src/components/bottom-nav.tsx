"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, KanbanSquare, Briefcase, BarChart2 } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
];

export function MobileBottomNav() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl h-16 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs transition-all duration-200 ${
              isActive
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            <span>{item.label}</span>
            {isActive && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
