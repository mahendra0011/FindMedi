/**
 * Dashboard layout — wraps all authenticated dashboard routes.
 *
 * Ported from client/src/components/DashboardLayout.jsx.
 * Migration changes:
 *   - react-router-dom useLocation → next/navigation usePathname
 *   - AppSidebar import path → @/components/shared/layout/AppSidebar
 *   - useIsMobile hook ported from old project
 */
'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import AppSidebar from '@/components/shared/layout/AppSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isAIChat = pathname === '/ai-chat';

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main
        ref={mainRef}
        className={`dashboard-main h-screen overflow-y-auto overscroll-contain transition-all duration-300 flex flex-col ${isAIChat ? 'p-0 pt-16 md:pt-0' : (isMobile ? 'p-4 pb-0 pt-16' : 'p-6 pb-0 md:p-8 md:pb-0')}`}
        style={isMobile ? {} : { marginLeft: 256 }}
      >
        {children}
      </main>
    </div>
  );
}
