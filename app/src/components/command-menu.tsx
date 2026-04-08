"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  LayoutDashboard,
  MapPin,
  KanbanSquare,
  Briefcase,
  BarChart2,
  Settings,
  Search,
  Mail,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "View all leads" },
  { label: "Map", href: "/map", icon: MapPin, description: "Geographic view" },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, description: "Lead pipeline" },
  { label: "Deals", href: "/deals", icon: Briefcase, description: "Deal management" },
  { label: "Buyers", href: "/buyers", icon: Users, description: "Buyer CRM & contact list" },
  { label: "Analytics", href: "/analytics", icon: BarChart2, description: "Data insights" },
  { label: "Campaigns", href: "/campaigns", icon: Mail, description: "Email sequences & outreach" },
  { label: "Mail Settings", href: "/settings/mail", icon: Settings, description: "Sender details & Resend API key" },
  { label: "Settings", href: "/settings", icon: Settings, description: "App settings" },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = navigationItems.filter(
    (item) =>
      query === "" ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus the input after the dialog renders
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        navigate(filtered[activeIndex].href);
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2",
            "rounded-2xl border border-border bg-card shadow-2xl",
            "transition-all duration-150",
            "data-ending-style:opacity-0 data-ending-style:scale-95",
            "data-starting-style:opacity-0 data-starting-style:scale-95"
          )}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Go to page..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            ) : (
              <>
                <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation
                </p>
                {filtered.map((item, i) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      i === activeIndex
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        i === activeIndex ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="flex flex-1 items-baseline gap-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-4 py-2">
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">↑</kbd>
              <kbd className="ml-0.5 rounded border border-border px-1 py-0.5 text-[10px]">↓</kbd>
              {" navigate  "}
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">↵</kbd>
              {" select"}
            </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
