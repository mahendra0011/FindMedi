import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MindSidebar from './MindSidebar';

export default function MindDashboardLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="h-screen overflow-hidden bg-background theme-findmedi">
      <MindSidebar />
      <main
        ref={mainRef}
        className={`dashboard-main h-screen overflow-y-auto overscroll-contain transition-all duration-300 flex flex-col ${isMobile ? 'p-4 pb-0 pt-16' : 'p-6 pb-0 md:p-8 md:pb-0 pt-6'}`}
        style={isMobile ? {} : { marginLeft: 256 }}
      >
        {children}
      </main>
    </div>
  );
}
