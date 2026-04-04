import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import MobileNav from './MobileNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card px-4 sticky top-0 z-40">
            <SidebarTrigger className="hidden md:flex mr-3" />
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">RF</span>
              </div>
              <span className="font-bold text-foreground text-sm">RotaFácil</span>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
