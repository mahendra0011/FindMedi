import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import AppSidebar from './AppSidebar';

export default function DashboardLayout({ children }) {
  const mainRef = useRef(null);
  const location = useLocation();
  const isMobile = useIsMobile();
  const isAIChat = location.pathname === '/ai-chat';

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

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
