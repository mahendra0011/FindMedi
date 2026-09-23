import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Menu, X, Moon, Sun, UserRound, MapPin, ChevronDown, ShoppingCart, Lock, Check, Car, Navigation, Power, Users, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { allCities } from '@/data/cities';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const DEFAULT_MAIN_NAV = [
  { label: 'Home', path: '/' },
  { label: 'Find Hospital', path: '/hospitals' },
  { label: 'Find Clinic', path: '/clinic-doctors' },
  { label: 'Diagnostic Centers', path: '/diagnostic-centers' },
  { label: 'Book Test', path: '/all-tests' },
  { label: 'Buy Medicine', path: '/buy-medicine' },
];

const ON_DEMAND_SERVICES = [
  { label: 'Book Vehicles', path: '/find-vehicle', icon: '🚗', desc: 'On-demand transport & ambulance' },
  { label: 'Book Assistant', path: '/book-assistant', icon: '🧑‍⚕️', desc: 'Hospital attendant & caretaker' },
  { label: 'Book Lawyer', path: '/find-lawyer', icon: '⚖️', desc: 'In-app legal help & case consultation' },
];

const RIDER_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: '🧭 Rider Dashboard', path: '/rider/dashboard' },
  { label: '🔔 Requests', path: '/rider/dashboard?tab=requests' },
  { label: '💰 Earnings', path: '/rider/dashboard?tab=earnings' },
  { label: '🚗 Active Ride', path: '/rider/dashboard?tab=active' },
];

const ASSISTANT_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: '🧑‍⚕️ Assistant Dashboard', path: '/assistant/dashboard' },
  { label: '🔔 Requests', path: '/assistant/dashboard?tab=requests' },
  { label: '⏱️ Active Shift', path: '/assistant/dashboard?tab=active' },
  { label: '💰 Earnings', path: '/assistant/dashboard?tab=earnings' },
];

const LAWYER_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: '⚖️ Lawyer Dashboard', path: '/lawyer/dashboard' },
  { label: '🔔 Requests', path: '/lawyer/dashboard?tab=requests' },
  { label: '⚖️ Active Case', path: '/lawyer/dashboard?tab=active' },
  { label: '💰 Earnings', path: '/lawyer/dashboard?tab=earnings' },
];

const AMBULANCE_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: '🚑 Ambulance Dashboard', path: '/ambulance/dashboard' },
  { label: '🚨 Active Mission', path: '/ambulance/dashboard?tab=active' },
  { label: '📜 Mission History', path: '/ambulance/dashboard?tab=history' },
  { label: '🩺 Equipment & Specs', path: '/ambulance/dashboard?tab=vehicle' },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isRiderOnline, setIsRiderOnline] = useState(false);
  const [riderStatusLoading, setRiderStatusLoading] = useState(false);
  const [isAssistantOnline, setIsAssistantOnline] = useState(false);
  const [assistantStatusLoading, setAssistantStatusLoading] = useState(false);
  const [isLawyerOnline, setIsLawyerOnline] = useState(false);
  const [lawyerStatusLoading, setLawyerStatusLoading] = useState(false);
  const [isAmbulanceOnline, setIsAmbulanceOnline] = useState(false);
  const [ambulanceStatusLoading, setAmbulanceStatusLoading] = useState(false);

  const isRider = user?.role === 'rider';
  const isAssistant = user?.role === 'assistant';
  const isLawyer = user?.role === 'lawyer';
  const isAmbulance = user?.role === 'ambulance';

  useEffect(() => {
    if (isRider) {
      api.getRiderProfile()
        .then((res: any) => {
          const onlineVal = res?.rider?.isOnline !== undefined ? res.rider.isOnline : res?.profile?.isOnline;
          if (onlineVal !== undefined) {
            setIsRiderOnline(Boolean(onlineVal));
          }
        })
        .catch(() => {});
    }
    if (isAssistant) {
      api.getMyAssistantProfile()
        .then((res: any) => {
          const availVal = res?.profile?.isAvailable !== undefined ? res.profile.isAvailable : res?.isAvailable;
          if (availVal !== undefined) {
            setIsAssistantOnline(Boolean(availVal));
          }
        })
        .catch(() => {});
    }
    if (isLawyer) {
      api.getMyLawyerProfile()
        .then((res: any) => {
          const availVal = res?.profile?.isAvailable !== undefined ? res.profile.isAvailable : res?.isAvailable;
          if (availVal !== undefined) {
            setIsLawyerOnline(Boolean(availVal));
          }
        })
        .catch(() => {});
    }
    if (isAmbulance) {
      api.get('/ambulance/me')
        .then((res: any) => {
          if (res?.ambulance?.isOnline !== undefined) {
            setIsAmbulanceOnline(Boolean(res.ambulance.isOnline));
          }
        })
        .catch(() => {});
    }

    const handleSyncStatus = (e: any) => {
      if (e?.detail?.type === 'rider' && e.detail.isOnline !== undefined) {
        setIsRiderOnline(Boolean(e.detail.isOnline));
      }
      if (e?.detail?.type === 'assistant' && e.detail.isAvailable !== undefined) {
        setIsAssistantOnline(Boolean(e.detail.isAvailable));
      }
      if (e?.detail?.type === 'lawyer' && e.detail.isAvailable !== undefined) {
        setIsLawyerOnline(Boolean(e.detail.isAvailable));
      }
      if (e?.detail?.type === 'ambulance' && e.detail.isOnline !== undefined) {
        setIsAmbulanceOnline(Boolean(e.detail.isOnline));
      }
    };

    window.addEventListener('provider_status_changed', handleSyncStatus);
    return () => {
      window.removeEventListener('provider_status_changed', handleSyncStatus);
    };
  }, [isRider, isAssistant, isLawyer, isAmbulance]);

  const handleToggleOnline = async () => {
    if (riderStatusLoading) return;
    setRiderStatusLoading(true);
    try {
      const next = !isRiderOnline;
      await api.setRiderStatus(next);
      setIsRiderOnline(next);
      window.dispatchEvent(new CustomEvent('provider_status_changed', {
        detail: { type: 'rider', isOnline: next }
      }));

      const socket = getSocket();
      if (next) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              socket.emit('rider_go_online', {
                riderId: user?._id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => {
              socket.emit('rider_go_online', { riderId: user?._id });
            },
            { timeout: 5000 }
          );
        } else {
          socket.emit('rider_go_online', { riderId: user?._id });
        }
      } else {
        socket.emit('rider_go_offline', { riderId: user?._id });
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setRiderStatusLoading(false);
    }
  };

  const handleToggleAssistantOnline = async () => {
    if (assistantStatusLoading) return;
    setAssistantStatusLoading(true);
    try {
      const next = !isAssistantOnline;
      await api.setAssistantStatus(next);
      setIsAssistantOnline(next);
      window.dispatchEvent(new CustomEvent('provider_status_changed', {
        detail: { type: 'assistant', isAvailable: next }
      }));
      const socket = getSocket();
      socket.emit(next ? 'assistant_go_available' : 'assistant_go_unavailable', { assistantId: user?._id });
    } catch (err) {
      console.error('Failed to toggle assistant status:', err);
    } finally {
      setAssistantStatusLoading(false);
    }
  };

  const handleToggleLawyerOnline = async () => {
    if (lawyerStatusLoading) return;
    setLawyerStatusLoading(true);
    try {
      const next = !isLawyerOnline;
      await api.setLawyerStatus(next);
      setIsLawyerOnline(next);
      window.dispatchEvent(new CustomEvent('provider_status_changed', {
        detail: { type: 'lawyer', isAvailable: next }
      }));
      const socket = getSocket();
      socket.emit(next ? 'lawyer_go_available' : 'lawyer_go_unavailable', { lawyerId: user?._id });
    } catch (err) {
      console.error('Failed to toggle lawyer status:', err);
    } finally {
      setLawyerStatusLoading(false);
    }
  };

  const handleToggleAmbulanceOnline = async () => {
    if (ambulanceStatusLoading) return;
    setAmbulanceStatusLoading(true);
    try {
      const next = !isAmbulanceOnline;
      if (next) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
        );
        const res: any = await api.put('/ambulance/me/online', {
          online: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsAmbulanceOnline(Boolean(res.isOnline));
        window.dispatchEvent(new CustomEvent('provider_status_changed', {
          detail: { type: 'ambulance', isOnline: true }
        }));
      } else {
        const res: any = await api.put('/ambulance/me/online', { online: false });
        setIsAmbulanceOnline(Boolean(res.isOnline));
        window.dispatchEvent(new CustomEvent('provider_status_changed', {
          detail: { type: 'ambulance', isOnline: false }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle ambulance status:', err);
    } finally {
      setAmbulanceStatusLoading(false);
    }
  };


  const isDarkMode = document.documentElement.classList.contains('dark');
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark') ? 'true' : 'false');
  };
  const themeToggleLabel = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  const { totalItems } = useCart();
  const [selectedCity, setSelectedCity] = useState(() => (localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city')) || 'Jabalpur');

  useEffect(() => {
    const onCityChange = (e: any) => {
      const newCity = e.detail || localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city');
      if (newCity && newCity !== selectedCity) {
        setSelectedCity(newCity);
      }
    };
    window.addEventListener('cityChange', onCityChange);
    window.addEventListener('storage', onCityChange);
    return () => {
      window.removeEventListener('cityChange', onCityChange);
      window.removeEventListener('storage', onCityChange);
    };
  }, [selectedCity]);

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    localStorage.setItem('findmedi_city', cityName);
    window.dispatchEvent(new CustomEvent('cityChange', { detail: cityName }));
    setCityOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[1440px] mx-auto flex h-16 items-center px-3 sm:px-4 lg:px-6">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-3 xl:gap-5 min-w-0">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl text-foreground shrink-0">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg overflow-hidden shadow-sm">
              <img src="/logo.png" alt="FindMedi Logo" className="w-full h-full object-cover" />
            </div>
            <span className="whitespace-nowrap">FindMedi</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5">
            {isRider || isAssistant || isLawyer || isAmbulance ? (
              (isRider
                ? RIDER_NAV_ITEMS
                : isAssistant
                ? ASSISTANT_NAV_ITEMS
                : isLawyer
                ? LAWYER_NAV_ITEMS
                : AMBULANCE_NAV_ITEMS
              ).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))
            ) : (
              <>
                {DEFAULT_MAIN_NAV.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/mind"
                  className="px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  Mind Support
                </Link>

                {/* Services Dropdown (User instruction: ak dropdown bana dena nav bar me aayega nhi ye) */}
                <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        ON_DEMAND_SERVICES.some((s) => location.pathname.startsWith(s.path))
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span>Services</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 rounded-2xl shadow-xl border border-border bg-popover" align="start">
                    <div className="text-[11px] font-bold text-muted-foreground px-2.5 py-1 uppercase tracking-wider">
                      Care & Mobility Services
                    </div>
                    <div className="space-y-1">
                      {ON_DEMAND_SERVICES.map((s) => (
                        <Link
                          key={s.path}
                          to={s.path}
                          onClick={() => setServicesOpen(false)}
                          className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                            location.pathname.startsWith(s.path)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <span className="text-xl leading-none mt-0.5">{s.icon}</span>
                          <div>
                            <div className="text-xs font-bold leading-tight">{s.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Link
              to="/"
              className={`px-2 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                location.hash === '#about' || location.pathname === '/about'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              About
            </Link>
          </nav>
        </div>

        {/* Spacer - pushes everything after to the right */}
        <div className="flex-1" />

        {/* Utility items (online toggle, cart, dark mode, city, sign in) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Rider Online / Offline Switch */}
          {isRider && (
            <Button
              variant={isRiderOnline ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleOnline}
              disabled={riderStatusLoading}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                isRiderOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-border text-muted-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isRiderOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`} />
              {isRiderOnline ? 'Online' : 'Offline'}
            </Button>
          )}

          {/* Assistant Available / Unavailable Switch */}
          {isAssistant && (
            <Button
              variant={isAssistantOnline ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleAssistantOnline}
              disabled={assistantStatusLoading}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                isAssistantOnline ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'border-border text-muted-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAssistantOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`} />
              {isAssistantOnline ? 'Available' : 'Unavailable'}
            </Button>
          )}

          {/* Lawyer Available / Unavailable Switch */}
          {isLawyer && (
            <Button
              variant={isLawyerOnline ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleLawyerOnline}
              disabled={lawyerStatusLoading}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                isLawyerOnline ? 'bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200' : 'border-border text-muted-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLawyerOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`} />
              {isLawyerOnline ? 'Available' : 'Unavailable'}
            </Button>
          )}

          {/* Ambulance Online / Offline Switch */}
          {isAmbulance && (
            <Button
              variant={isAmbulanceOnline ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleAmbulanceOnline}
              disabled={ambulanceStatusLoading}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                isAmbulanceOnline ? 'bg-destructive hover:bg-destructive/90 text-white' : 'border-border text-muted-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAmbulanceOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`} />
              {isAmbulanceOnline ? 'Emergency Online' : 'Offline'}
            </Button>
          )}

          {/* Cart Icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => navigate('/cart')}
                className="h-9 w-9 rounded-full border-border/70 bg-background/80 shadow-sm relative shrink-0">
                <ShoppingCart className="w-4 h-4" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cart</TooltipContent>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                aria-label={themeToggleLabel}
                className="h-9 w-9 rounded-full border-border/70 bg-background/80 shadow-sm shrink-0"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{themeToggleLabel}</TooltipContent>
          </Tooltip>

          {/* City Selector */}
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2 text-muted-foreground hover:text-foreground text-sm hidden sm:flex shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="max-w-[70px] truncate">{selectedCity || 'All Cities'}</span>
                <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search city..." />
                <CommandList>
                  <CommandEmpty>No city found</CommandEmpty>
                  <CommandGroup heading="Available">
                    {allCities.filter(c => !c.locked).map((city) => (
                      <CommandItem
                        key={`${city.state}-${city.name}`}
                        value={`${city.name} ${city.state}`}
                        onSelect={() => handleCitySelect(city.name)}
                        className="text-sm"
                      >
                        <MapPin className="w-3.5 h-3.5 mr-2 text-primary" />
                        <span className="font-medium">{city.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{city.state}</span>
                        {selectedCity === city.name && <Check className="w-3.5 h-3.5 ml-1.5 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Coming Soon">
                    {allCities.filter(c => c.locked).map((city) => (
                      <CommandItem
                        key={`${city.state}-${city.name}`}
                        value={`${city.name} ${city.state}`}
                        disabled
                        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed select-none opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5 ml-2 shrink-0" />
                        <span>{city.name}</span>
                        <span className="ml-auto text-[10px]">{city.state}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Auth */}
          {!user && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="hidden sm:flex whitespace-nowrap shrink-0">
              Sign In
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(isRider ? '/rider/dashboard' : isAssistant ? '/assistant/dashboard' : isLawyer ? '/lawyer/dashboard' : '/dashboard')}
              className="hidden sm:flex gap-2 whitespace-nowrap shrink-0"
            >
              <UserRound className="w-4 h-4" />
              {isRider ? 'Rider Console' : isAssistant ? 'Assistant Console' : isLawyer ? 'Advocate Console' : 'Dashboard'}
            </Button>
          )}

          {/* Call to Action */}
          {isRider ? (
            <Button onClick={() => navigate('/rider/dashboard')} className="hidden sm:flex gap-2 whitespace-nowrap shrink-0 bg-teal-600 hover:bg-teal-700 text-white">
              <Car className="w-4 h-4" />
              Driver Console
            </Button>
          ) : isAssistant ? (
            <Button onClick={() => navigate('/assistant/dashboard')} className="hidden sm:flex gap-2 whitespace-nowrap shrink-0 bg-teal-600 hover:bg-teal-700 text-white">
              <Users className="w-4 h-4" />
              Assistant Console
            </Button>
          ) : isLawyer ? (
            <Button onClick={() => navigate('/lawyer/dashboard')} className="hidden sm:flex gap-2 whitespace-nowrap shrink-0 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
              <Scale className="w-4 h-4" />
              Advocate Console
            </Button>
          ) : null}

        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-border/50 bg-background">
          <div className="px-4 py-3 space-y-1">
            {isRider || isAssistant || isLawyer ? (
              (isRider ? RIDER_NAV_ITEMS : isAssistant ? ASSISTANT_NAV_ITEMS : LAWYER_NAV_ITEMS).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))
            ) : (
              <>
                {DEFAULT_MAIN_NAV.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/mind"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  Mind Support
                </Link>

                <div className="pt-2 pb-1 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Services
                </div>
                {ON_DEMAND_SERVICES.map((s) => (
                  <Link
                    key={s.path}
                    to={s.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </Link>
                ))}
              </>
            )}

            {user?.role === 'patient' && (
              <>
                <Link
                  to="/patient/lawyers"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-muted/50"
                >
                  ⚖️ My Lawyer Consultations
                </Link>
                <Link
                  to="/patient/assistants"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-muted/50"
                >
                  🧑‍⚕️ My Assistant Bookings
                </Link>
                <Link
                  to="/patient/rides"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  🚗 My Rides
                </Link>
              </>
            )}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.hash === '#about' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              About
            </Link>
            {!user && (
              <Button variant="ghost" size="sm" onClick={() => { navigate('/login'); setMobileOpen(false); }} className="w-full justify-start">
                Sign In
              </Button>
            )}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate(
                    isRider
                      ? '/rider/dashboard'
                      : isAssistant
                      ? '/assistant/dashboard'
                      : isLawyer
                      ? '/lawyer/dashboard'
                      : isAmbulance
                      ? '/ambulance/dashboard'
                      : '/dashboard'
                  );
                  setMobileOpen(false);
                }}
                className="w-full justify-start"
              >
                {isRider
                  ? 'Rider Console'
                  : isAssistant
                  ? 'Assistant Console'
                  : isLawyer
                  ? 'Advocate Console'
                  : isAmbulance
                  ? 'Ambulance Console'
                  : 'Dashboard'}
              </Button>
            )}
            {isRider ? (
              <Button onClick={() => { handleToggleOnline(); }} className={`w-full ${isRiderOnline ? 'bg-emerald-600' : 'bg-muted'}`}>
                {isRiderOnline ? 'Currently Online (Go Offline)' : 'Currently Offline (Go Online)'}
              </Button>
            ) : isAssistant ? (
              <Button onClick={() => { handleToggleAssistantOnline(); }} className={`w-full ${isAssistantOnline ? 'bg-teal-600' : 'bg-muted'}`}>
                {isAssistantOnline ? 'Currently Available (Go Offline)' : 'Currently Offline (Go Available)'}
              </Button>
            ) : isLawyer ? (
              <Button onClick={() => { handleToggleLawyerOnline(); }} className={`w-full ${isLawyerOnline ? 'bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900' : 'bg-muted'}`}>
                {isLawyerOnline ? 'Currently Available (Go Offline)' : 'Currently Offline (Go Available)'}
              </Button>
            ) : isAmbulance ? (
              <Button onClick={() => { handleToggleAmbulanceOnline(); }} className={`w-full ${isAmbulanceOnline ? 'bg-destructive text-white' : 'bg-muted'}`}>
                {isAmbulanceOnline ? 'Emergency Online (Go Offline)' : 'Currently Offline (Go Emergency Online)'}
              </Button>
            ) : null}

          </div>
        </div>
      )}
    </header>
  );
}