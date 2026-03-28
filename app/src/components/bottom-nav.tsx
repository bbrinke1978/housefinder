"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, KanbanSquare, Briefcase, Settings } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-warm-200/60 dark:border-dark-700/60 bg-white/90 dark:bg-dark-950/90 backdrop-blur-xl h-16 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs transition-all duration-200 ${
              isActive
                ? "text-brand-500 font-bold"
                : "text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
            }`}
          >
            <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
