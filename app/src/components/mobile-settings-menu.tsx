"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Settings, Mail, Search } from "lucide-react";

const menuItems = [
  { href: "/settings/mail", icon: Mail, label: "Mail Settings" },
  { href: "/settings/skip-tracing", icon: Search, label: "Skip Tracing" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileSettingsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Settings menu"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-background shadow-lg py-1 z-50">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
