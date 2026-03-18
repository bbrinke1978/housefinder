"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Settings } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background h-16 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-xs transition-colors ${
              isActive
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
