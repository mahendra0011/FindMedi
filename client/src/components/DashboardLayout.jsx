import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import AppSidebar from './AppSidebar';

export default function DashboardLayout({ children }) {
  const mainRef = useRef(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main
        ref={mainRef}
        className={`dashboard-main h-screen overflow-y-auto overscroll-contain transition-all duration-300 ${isMobile ? 'p-4 pt-16' : 'p-6 md:p-8'}`}
        style={isMobile ? {} : { marginLeft: 256 }}
      >
        {children}
      </main>
    </div>
  );
}
