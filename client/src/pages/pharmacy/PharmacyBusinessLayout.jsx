import { useRef, useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Pill, Package, ShoppingCart, Users,
  Tag, RefreshCw, Settings, ChevronLeft, ChevronRight,
  Activity, LogOut, Home, Menu, FileText, BarChart3, Truck, Star
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/pharmacy-business/dashboard' },
  { icon: Pill,            label: 'Inventory', path: '/pharmacy-business/inventory' },
  { icon: ShoppingCart,    label: 'Orders',   path: '/pharmacy-business/orders' },
  { icon: FileText,        label: 'Prescriptions', path: '/pharmacy-business/prescriptions' },
  { icon: Users,           label: 'Staff',    path: '/pharmacy-business/staff' },
  { icon: Star,            label: 'Reviews',  path: '/pharmacy-business/reviews' },
  { icon: Tag,             label: 'Offers',   path: '/pharmacy-business/offers' },
  { icon: RefreshCw,       label: 'Returns',  path: '/pharmacy-business/returns' },
  { icon: BarChart3,       label: 'Analytics', path: '/pharmacy-business/analytics' },
  { icon: Truck,           label: 'Delivery',  path: '/pharmacy-business/delivery' },
  { icon: Settings,        label: 'Profile Settings', path: '/pharmacy-business/settings' },
];

function SidebarContent({ collapsed, onToggleCollapse, onNavClick }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className={`flex flex-col h-full bg-sidebar text-sidebar-foreground ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Brand Header */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-sidebar-primary/30">
          <Pill className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-heading text-base font-bold text-sidebar-primary-foreground leading-none">FindMedi</h1>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Pharmacy</p>
          </div>
        )}
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 p-3 bg-sidebar-accent/60 rounded-xl border border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize bg-success/20 text-success">
                Pharmacy
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav min-h-0 flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overscroll-contain">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!isActive ? 'group-hover:scale-110 transition-transform' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-2 pb-4 border-t border-sidebar-border pt-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <Link
          to="/"
          title={collapsed ? 'Home' : undefined}
          className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <Home className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-sm">Home</span>}
        </Link>
        <button
          onClick={() => { logout(); }}
          title={collapsed ? 'Logout' : undefined}
          className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 max-md:hidden"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

export default function PharmacyBusinessLayout() {
  const mainRef = useRef(null);
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      {isMobile ? (
        <>
          <button
            onClick={() => setSheetOpen(true)}
            className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-sidebar text-sidebar-foreground flex items-center justify-center shadow-lg hover:bg-sidebar-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-r border-sidebar-border">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Mobile navigation sidebar</SheetDescription>
              <SidebarContent collapsed={false} onNavClick={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <aside className="sidebar-motion fixed left-0 top-0 h-screen z-50 shadow-2xl transition-all duration-300 max-md:hidden">
          <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        </aside>
      )}

      <main
        ref={mainRef}
        className={`h-screen overflow-y-auto overscroll-contain transition-all duration-300 ${isMobile ? 'p-4 pt-16' : 'p-6 md:p-8'}`}
        style={isMobile ? {} : { marginLeft: collapsed ? 72 : 256 }}
      >
        <Outlet />
      </main>
    </div>
  );
}
