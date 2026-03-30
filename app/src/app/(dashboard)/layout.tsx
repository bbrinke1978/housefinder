import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/bottom-nav";
import { CommandMenu } from "@/components/command-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 md:pb-8 min-h-screen bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
