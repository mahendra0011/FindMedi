import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';

export default function DashboardLayout({ children }) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const mainRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const obs = new MutationObserver(() => {
      const aside = document.querySelector('aside');
      if (aside) setSidebarWidth(aside.offsetWidth);
    });
    const aside = document.querySelector('aside');
    if (aside) {
      setSidebarWidth(aside.offsetWidth);
      obs.observe(aside, { attributes: true, attributeFilter: ['class'] });
    }
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main
        ref={mainRef}
        className="dashboard-main h-screen overflow-y-auto overscroll-contain p-6 md:p-8 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}
