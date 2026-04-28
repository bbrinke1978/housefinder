import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/bottom-nav";
import { CommandMenu } from "@/components/command-menu";
import { PhotoFab } from "@/components/photo-fab";
import { MobileSettingsMenu } from "@/components/mobile-settings-menu";
import { FloatingReportButton } from "@/components/feedback/floating-report-button";
import { auth } from "@/auth";
import { countOpenFeedbackForUser } from "@/lib/feedback-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch feedback badge count server-side so the nav can display it without a client fetch
  let feedbackBadgeCount = 0;
  try {
    const session = await auth();
    if (session?.user?.id) {
      feedbackBadgeCount = await countOpenFeedbackForUser(session.user.id as string);
    }
  } catch {
    // Non-fatal — nav badge will just show 0
  }

  return (
    <SidebarProvider>
      <AppSidebar feedbackBadgeCount={feedbackBadgeCount} />
      <SidebarInset>
        {/* Mobile-only top bar with Settings gear */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <span className="text-base font-display font-bold tracking-wide text-foreground">No BS Workbench</span>
          <MobileSettingsMenu />
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 md:pb-8 min-h-screen bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <PhotoFab />
        <FloatingReportButton />
        <MobileBottomNav feedbackBadgeCount={feedbackBadgeCount} />
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
