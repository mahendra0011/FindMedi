import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Home, Search, Brain, BrainCircuit, BookOpen, Users, Heart, Calendar, Activity,
  FileText, BarChart3, Bell, Settings, ChevronLeft, ChevronRight, LogOut, Menu, X, ClipboardList, ShieldCheck, UserRound,
  Package, Pill, History, NotebookPen
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';

const exploreNav = [
  { icon: Home, label: 'Mind Home', path: '/mind' },
  { icon: Search, label: 'Find Counsellor', path: '/mind/counselling' },
  { icon: BrainCircuit, label: 'Find Psychiatrist', path: '/mind/psychiatrists' },
  { icon: BookOpen, label: 'Resources', path: '/mind/resources' },
  { icon: Users, label: 'Peer Support', path: '/mind/peer' },
  { icon: Heart, label: 'My Wellness', path: '/mind/wellness' },
  { icon: Calendar, label: 'Session Schedule', path: '/mind/session-schedule' },
];

const dashboardNav = [
  { icon: LayoutDashboard, label: 'User Dashboard', path: '/mind/user' },
  { icon: Brain, label: 'Counsellor Dashboard', path: '/mind/counsellor' },
  { icon: BrainCircuit, label: 'Psychiatrist Dashboard', path: '/mind/psychiatrist' },
  { icon: ShieldCheck, label: 'Admin Dashboard', path: '/mind/admin' },
];

const providerTabs = [
  { icon: ClipboardList, label: 'Sessions', tab: 'sessions' },
  { icon: Package, label: 'Packages', tab: 'packages' },
  { icon: Users, label: 'Patients', tab: 'patients' },
  { icon: FileText, label: 'Notes', tab: 'notes' },
  { icon: BookOpen, label: 'Resources', tab: 'resources' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

const psychiatristTabs = [
  { icon: ClipboardList, label: 'Sessions', tab: 'sessions' },
  { icon: Package, label: 'Packages', tab: 'packages' },
  { icon: Users, label: 'Patients', tab: 'patients' },
  { icon: FileText, label: 'Notes', tab: 'notes' },
  { icon: Pill, label: 'Prescriptions', tab: 'prescriptions' },
  { icon: BookOpen, label: 'Resources', tab: 'resources' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

const userTabNav = [
  { icon: Home, label: 'Home', tab: 'home' },
  { icon: Activity, label: 'Wellness', tab: 'wellness' },
  { icon: Package, label: 'My Packages', tab: 'packages' },
  { icon: ClipboardList, label: 'Sessions', tab: 'sessions' },
  { icon: Calendar, label: 'Schedule', tab: 'schedule' },
  { icon: History, label: 'History', tab: 'history' },
  { icon: Pill, label: 'Treatment', tab: 'prescriptions' },
  { icon: FileText, label: 'Assignments', tab: 'assignments' },
  { icon: NotebookPen, label: 'Journal', tab: 'journal' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

const userTabGroups = [
  { title: 'Overview', icon: Home, tabs: ['home'] },
  { title: 'Wellness', icon: Activity, tabs: ['wellness', 'journal'] },
  { title: 'My Care', icon: ClipboardList, tabs: ['packages', 'sessions', 'assignments'] },
  { title: 'Settings', icon: Settings, tabs: ['settings'] },
];

const bottomNav = [
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

function SidebarContent({ collapsed, onToggleCollapse, onNavClick }: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); onNavClick?.(); };
  // User menu collapsible groups (default sab open)
  const [openUserGroups, setOpenUserGroups] = useState<Record<string, boolean>>({});
  const isUserGroupOpen = (title: string) => openUserGroups[title] !== false;
  const toggleUserGroup = (title: string) => setOpenUserGroups(prev => ({ ...prev, [title]: !isUserGroupOpen(title) }));

  const isActive = (path: string) => {
    if (path === '/mind') return location.pathname === '/mind';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Role-wise dashboard visibility:
  // - User sees only User Dashboard
  // - Counsellor sees only Counsellor Dashboard, Psychiatrist only Psychiatrist Dashboard
  // - Admin sees only Admin Dashboard
  // - /mind/user link staff roles (counsellor/psychiatrist/doctor/...) ko dikhta hi nahi
  const { user: authUser } = useAuth();
  const isStaffRole = !!authUser && authUser.role !== 'patient';
  const isCounsellorDash = location.pathname.startsWith('/mind/counsellor');
  const isPsychDash = location.pathname.startsWith('/mind/psychiatrist');
  const isProviderDash = isCounsellorDash || isPsychDash;
  const filteredDashboardNav = (() => {
    const p = location.pathname;
    if (p.startsWith('/mind/user') || p === '/mind/dashboard') return dashboardNav.filter(d => d.path === '/mind/user');
    if (p.startsWith('/mind/counsellor')) return dashboardNav.filter(d => d.path === '/mind/counsellor');
    if (p.startsWith('/mind/psychiatrist')) return dashboardNav.filter(d => d.path === '/mind/psychiatrist');
    if (p.startsWith('/mind/admin')) return dashboardNav.filter(d => d.path === '/mind/admin');
    if (isStaffRole) return dashboardNav.filter(d => d.path !== '/mind/user');
    return dashboardNav;
  })();

  const isUserDashboard = location.pathname.startsWith('/mind/user') || location.pathname === '/mind/dashboard';
  const currentTab = new URLSearchParams(location.search).get('tab') || 'home';
  const isUserTabActive = (tab: string) => currentTab === tab;

  const handleGoHome = () => { navigate('/'); onNavClick?.(); };
  const handleFindMedi = () => { navigate('/'); onNavClick?.(); };

  return (
    <div className={`flex flex-col h-full bg-sidebar text-sidebar-foreground ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-heading text-sm font-bold text-sidebar-primary-foreground leading-none">MindSupport</h1>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">by FindMedi</p>
          </div>
        )}
      </div>

      {isUserDashboard ? (
        <div className="px-2 pt-3 space-y-3">
          {collapsed ? (
            <div className="space-y-0.5">
              {userTabNav.map(item => {
                const Icon = item.icon;
                const active = isUserTabActive(item.tab);
                return (
                  <Link key={item.tab} to={`/mind/user?tab=${item.tab}`} onClick={onNavClick} title={item.label}
                    className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group justify-center ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                  </Link>
                );
              })}
            </div>
          ) : (
            userTabGroups.map(group => {
              const GroupIcon = group.icon;
              const open = isUserGroupOpen(group.title);
              const items = userTabNav.filter(i => group.tabs.includes(i.tab));
              return (
                <div key={group.title}>
                  <button
                    type="button"
                    onClick={() => toggleUserGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sidebar-foreground/50 hover:bg-sidebar-accent/60 rounded-xl transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <GroupIcon className="w-3.5 h-3.5" />
                      <span>{group.title}</span>
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                  </button>
                  {open && (
                    <div className="space-y-0.5 mt-1 ml-2 pl-3 border-l border-sidebar-border/60">
                      {items.map(item => {
                        const Icon = item.icon;
                        const active = isUserTabActive(item.tab);
                        return (
                          <Link key={item.tab} to={`/mind/user?tab=${item.tab}`} onClick={onNavClick}
                            className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : isProviderDash ? (
        /* Provider dashboards (counsellor / psychiatrist) — FindMedi dashboard + Mind dashboard + tabs */
        <div className="px-2 pt-3 space-y-4">
          <div>
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Dashboard</p>}
            <div className="space-y-0.5">
              <Link to="/dashboard" onClick={onNavClick} title={collapsed ? 'FindMedi Dashboard' : undefined}
                className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${location.pathname === '/dashboard' ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0 group-hover:scale-110 transition-transform" />
                {!collapsed && <span className="text-sm font-medium">FindMedi Dashboard</span>}
              </Link>
              {filteredDashboardNav.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path) && !new URLSearchParams(location.search).get('tab');
                return (
                  <Link key={item.path} to={item.path} onClick={onNavClick} title={collapsed ? 'Mind Dashboard' : undefined}
                    className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                    {!collapsed && <span className="text-sm font-medium">Mind Dashboard</span>}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Menu</p>}
            <div className="space-y-0.5">
              {(isPsychDash ? psychiatristTabs : providerTabs).map(item => {
                const Icon = item.icon;
                const _ptab = new URLSearchParams(location.search).get('tab');
                const active = _ptab === item.tab || (!_ptab && item.tab === 'sessions');
                const base = isCounsellorDash ? '/mind/counsellor' : '/mind/psychiatrist';
                return (
                  <Link key={item.tab} to={`${base}?tab=${item.tab}`} onClick={onNavClick} title={collapsed ? item.label : undefined}
                    className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Explore */}
          <div className="px-2 pt-3">
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Explore</p>}
            <div className="space-y-0.5">
              {exploreNav.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={onNavClick} title={collapsed ? item.label : undefined}
                    className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Dashboards */}
          <div className="px-2 pt-4">
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Dashboards</p>}
            <div className="space-y-0.5">
              {filteredDashboardNav.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={onNavClick} title={collapsed ? item.label : undefined}
                    className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!active ? 'group-hover:scale-110 transition-transform' : ''}`} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom */}
      <nav className="sidebar-nav min-h-0 flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overscroll-contain mt-2 border-t border-sidebar-border/50 pt-3">
        {bottomNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path} onClick={onNavClick} title={collapsed ? item.label : undefined}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon className="w-[18px] h-[18px]" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-2 pb-4 border-t border-sidebar-border pt-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button onClick={handleFindMedi} title={collapsed ? 'FindMedi Home' : undefined} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full ${collapsed ? 'justify-center' : ''}`}>
          <Home className="w-[18px] h-[18px]" />
          {!collapsed && <span className="text-sm">FindMedi Home</span>}
        </button>
        <button onClick={handleGoHome} title={collapsed ? 'Mind Home' : undefined} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full ${collapsed ? 'justify-center' : ''}`}>
          <Heart className="w-[18px] h-[18px]" />
          {!collapsed && <span className="text-sm">Mind Home</span>}
        </button>
        <button onClick={handleLogout} title={collapsed ? 'Logout' : undefined} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {onToggleCollapse && (
        <button onClick={onToggleCollapse} className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 max-md:hidden">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

export default function MindSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <button onClick={() => setSheetOpen(true)} className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-sidebar text-sidebar-foreground flex items-center justify-center shadow-lg">
          <Menu className="w-5 h-5" />
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-r border-sidebar-border">
            <SheetTitle className="sr-only">Mind Navigation</SheetTitle>
            <SheetDescription className="sr-only">MindSupport navigation sidebar</SheetDescription>
            <SidebarContent collapsed={false} onNavClick={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="sidebar-motion fixed left-0 top-0 h-screen z-50 shadow-2xl transition-all duration-300 max-md:hidden">
      <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
    </aside>
  );
}
