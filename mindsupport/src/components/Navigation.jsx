import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { closeRealtimeSocket } from "@/lib/socket";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertTriangle,
    BarChart3,
    Bell,
    BookOpen,
    Brain,
    Calendar,
    CalendarClock,
    CheckCheck,
    CreditCard,
    Heart,
    Home,
    Info,
    LogIn,
    LogOut,
    Menu,
    MessageCircle,
    Palette,
    Globe,
    Phone,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/store/authSlice";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, selectNotifications, selectUnreadNotificationsCount, selectNotificationsStatus } from "@/store/notificationsSlice";
import { setMobileMenuOpen, selectMobileMenuOpen } from "@/store/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function notificationIcon(type = "") {
    if (type === "emergency") return AlertTriangle;
    if (type === "payment") return CreditCard;
    if (type === "booking" || type === "session") return CalendarClock;
    if (type === "message") return MessageCircle;
    return Bell;
}

function dashboardRoute(role) {
    if (role === "admin") return "/admin";
    if (role === "counsellor") return "/counsellor";
    return "/user";
}

function notificationRoute(user, notification) {
    if (!user) return "/login";
    if (notification?.type === "booking" || notification?.type === "session") {
        return user.role === "user" ? "/session-schedule" : dashboardRoute(user.role);
    }
    if (notification?.type === "message") {
        return user.role === "user" ? "/user?tab=chat" : dashboardRoute(user.role);
    }
    return dashboardRoute(user.role);
}

function shortTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

const NOTIFICATION_HTTP_POLL_MS = 30000;

const Navigation = () => {
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const isOpen = useAppSelector(selectMobileMenuOpen);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const user = useAppSelector((state) => state.auth.user);
    const notifications = useAppSelector(selectNotifications);
    const unreadNotifications = useAppSelector(selectUnreadNotificationsCount);
    const notificationsLoading = useAppSelector(selectNotificationsStatus) === "loading";
    const { theme, setTheme, themes } = useThemeContext();
    const { language, setLanguage, languages } = useLanguageContext();
    const dashboardRoute = user ? (user.role === "admin" ? "/admin" : user.role === "counsellor" ? "/counsellor" : "/user") : "/dashboard";
    const navItems = [
        { name: "Home", icon: Home, route: "/" },
        { name: "Resources", icon: BookOpen, route: "/resources" },
        ...(!user || user?.role === "user" || user?.role === "admin" ? [{ name: "Peer Support", icon: Users, route: "/peer" }] : []),
        ...(!user || user?.role === "user" ? [{ name: "Find Counsellor", icon: Calendar, route: "/counselling" }] : []),
        ...(user ? [{ name: "Dashboard", icon: BarChart3, route: dashboardRoute }] : []),
        ...(user && (user?.role === "user" || user?.role === "admin") ? [{ name: "My Wellness", icon: Heart, route: "/wellness" }] : []),
        { name: "About", icon: Info, route: "/about" },
    ];

    useEffect(() => {
        if (!user) return undefined;
        dispatch(fetchNotifications());
        const timer = window.setInterval(() => {
            dispatch(fetchNotifications());
        }, NOTIFICATION_HTTP_POLL_MS);
        return () => window.clearInterval(timer);
    }, [dispatch, user]);

    const handleMarkRead = async (notification, shouldNavigate = false) => {
        if (!notification?.id) return;
        if (!notification.read) {
            dispatch(markNotificationRead(notification.id));
        }
        if (shouldNavigate) {
            setNotificationsOpen(false);
            dispatch(setMobileMenuOpen(false));
            navigate(notificationRoute(user, notification));
        }
    };

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsRead());
        toast({ title: "Notifications marked read" });
    };

    const toggleNotifications = () => {
        setNotificationsOpen((prev) => !prev);
    };

    const signOut = () => {
        closeRealtimeSocket();
        dispatch(logout());
        setNotificationsOpen(false);
        navigate("/login");
    };
    return (<nav className="glass-nav motion-nav fixed top-0 w-full z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="motion-icon-pop p-2 rounded-lg bg-gradient-primary glow-primary">
              <Brain className="h-6 w-6 text-primary-foreground"/>
            </div>
            <span className="text-xl font-bold gradient-text">MindSupport</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:block">
            <div className="ml-6 flex items-center gap-2">
              {navItems.map((item) => (<a key={item.name} href={item.route} onClick={(e) => { e.preventDefault(); navigate(item.route); }} className="motion-link flex items-center space-x-1 px-2 2xl:px-3 py-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-glass/50 transition-all duration-200 whitespace-nowrap">
                  <item.icon className="h-4 w-4"/>
                  <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                </a>))}
            </div>
          </div>

          {/* 24/7 Support */}
          <div className="hidden xl:flex items-center ml-auto">
            <a href="tel:18005990019" className="flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all mr-3 whitespace-nowrap">
              <Phone className="h-3.5 w-3.5" />
              <span>24/7 Support: 1800-599-0019</span>
            </a>
          </div>

          {/* Theme & Language Selectors */}
          <div className="hidden xl:flex items-center gap-1.5 ml-1">
            {/* Theme Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Select Theme">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  {themes.map((t) => (
                    <DropdownMenuRadioItem key={t.id} value={t.id} className="cursor-pointer">
                      <span className="mr-2">{t.icon}</span>
                      {t.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Select Language">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
                  {languages.map((l) => (
                    <DropdownMenuRadioItem key={l.code} value={l.code} className="cursor-pointer">
                      <span className="mr-2 text-sm">{l.nativeName}</span>
                      <span className="text-foreground/60 text-xs">({l.name})</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* CTAs */}
          <div className="hidden xl:flex items-center ml-auto">
            {user ? (<>
              <div className="relative ml-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-10 w-10 rounded-xl"
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Button>
                {notificationsOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    loading={notificationsLoading}
                    unreadCount={unreadNotifications}
                    onMarkAllRead={handleMarkAllRead}
                    onOpenNotification={(notification) => handleMarkRead(notification, true)}
                  />
                )}
              </div>
              <Button variant="outline" size="icon" onClick={signOut} className="motion-button ml-2" aria-label="Logout">
                <LogOut className="h-4 w-4"/>
              </Button>
            </>) : (<>
              <Button variant="outline" onClick={() => navigate("/login")} className="motion-button ml-2 whitespace-nowrap">
                <LogIn className="h-4 w-4 mr-2"/>
                <span className="text-sm font-semibold tracking-wide">Login</span>
              </Button>
              <Button onClick={() => navigate("/signup")} className="motion-button ml-2 whitespace-nowrap">
                <UserPlus className="h-4 w-4 mr-2"/>
                <span className="text-sm font-semibold tracking-wide">Create Account</span>
              </Button>
            </>)}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden">
            <Button variant="ghost" size="sm" onClick={() => dispatch(setMobileMenuOpen(!isOpen))} className="text-foreground">
              {isOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (<div className="xl:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-glass/90 backdrop-blur-xl rounded-lg mt-2 border border-glass-border/30">
              {navItems.map((item) => (<a key={item.name} href={item.route} className="flex items-center space-x-2 block px-3 py-2 rounded-md text-foreground/80 hover:text-foreground hover:bg-glass/50" onClick={(e) => { e.preventDefault(); dispatch(setMobileMenuOpen(false)); navigate(item.route); }}>
                  <item.icon className="h-4 w-4"/>
                  <span>{item.name}</span>
                </a>))}
              <a href="tel:18005990019" className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all">
                <Phone className="h-4 w-4" />
                <span>24/7 Support: 1800-599-0019</span>
              </a>
              {/* Mobile Theme & Language */}
              <div className="flex gap-2 pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Palette className="h-4 w-4 mr-2" />
                      <span className="truncate">{themes.find((t) => t.id === theme)?.label || "Theme"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Theme</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={theme} onValueChange={(val) => { setTheme(val); dispatch(setMobileMenuOpen(false)); }}>
                      {themes.map((t) => (
                        <DropdownMenuRadioItem key={t.id} value={t.id} className="cursor-pointer">
                          <span className="mr-2">{t.icon}</span>
                          {t.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Globe className="h-4 w-4 mr-2" />
                      <span className="truncate">{languages.find((l) => l.code === language)?.name || "Language"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Language</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={language} onValueChange={(val) => { setLanguage(val); dispatch(setMobileMenuOpen(false)); }}>
                      {languages.map((l) => (
                        <DropdownMenuRadioItem key={l.code} value={l.code} className="cursor-pointer">
                          <span className="mr-2 text-sm">{l.nativeName}</span>
                          <span className="text-foreground/60 text-xs">({l.name})</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="pt-2 space-y-2">
                {user ? (<>
                  <Button onClick={toggleNotifications} variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <Bell className="h-4 w-4 mr-2"/>
                      Notifications
                    </span>
                    {unreadNotifications > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">{unreadNotifications}</span>}
                  </Button>
                  {notificationsOpen && (
                    <NotificationPanel
                      mobile
                      notifications={notifications}
                      loading={notificationsLoading}
                      unreadCount={unreadNotifications}
                      onMarkAllRead={handleMarkAllRead}
                      onOpenNotification={(notification) => handleMarkRead(notification, true)}
                    />
                  )}
                  <Button onClick={() => { dispatch(setMobileMenuOpen(false)); signOut(); }} variant="outline" className="w-full justify-center">
                    <LogOut className="h-4 w-4"/>
                  </Button>
                </>) : (<>
                  <Button onClick={() => { dispatch(setMobileMenuOpen(false)); navigate("/login"); }} variant="outline" className="w-full">
                    <LogIn className="h-4 w-4 mr-2"/>
                    <span className="text-sm font-semibold tracking-wide">Login</span>
                  </Button>
                  <Button onClick={() => { dispatch(setMobileMenuOpen(false)); navigate("/signup"); }} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2"/>
                    <span className="text-sm font-semibold tracking-wide">Create Account</span>
                  </Button>
                </>)}
              </div>
              {/* Auth buttons removed from mobile navigation as requested */}
            </div>
          </div>)}
      </div>
    </nav>);
};

function NotificationPanel({ notifications, loading, unreadCount, onMarkAllRead, onOpenNotification, mobile = false }) {
  return (
    <div
      className={`${mobile ? "static mt-2 w-full" : "absolute right-0 top-12 w-[360px]"} overflow-hidden rounded-2xl border border-glass-border/40 bg-background/95 shadow-2xl backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between border-b border-glass-border/30 p-4">
        <div>
          <div className="font-semibold">Notifications</div>
          <div className="text-xs text-foreground/60">{unreadCount} unread update{unreadCount === 1 ? "" : "s"}</div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-3.5 w-3.5" />
          Read
        </Button>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-2">
        {loading ? (
          <div className="rounded-xl border border-glass-border/30 bg-glass/30 p-4 text-sm text-foreground/70">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-glass-border/30 bg-glass/30 p-4 text-sm text-foreground/70">No notifications yet.</div>
        ) : (
          notifications.slice(0, 8).map((notification) => {
            const Icon = notificationIcon(notification.type);
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => onOpenNotification(notification)}
                className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:border-primary/40 hover:bg-glass/40 ${
                  notification.read ? "border-glass-border/20 bg-background/55" : "border-primary/30 bg-primary/10"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-0.5 rounded-lg p-2 ${notification.type === "emergency" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="line-clamp-1 text-sm font-semibold">{notification.title}</div>
                      <span className="shrink-0 text-[11px] text-foreground/45">{shortTime(notification.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/65">{notification.message}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
export default Navigation;
