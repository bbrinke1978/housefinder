import Link from "next/link";
import { Settings } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/bottom-nav";
import { CommandMenu } from "@/components/command-menu";
import { PhotoFab } from "@/components/photo-fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile-only top bar with Settings gear */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <span className="text-base font-display font-bold tracking-wide text-foreground">No BS Homes</span>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 md:pb-8 min-h-screen bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <PhotoFab />
        <MobileBottomNav />
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
