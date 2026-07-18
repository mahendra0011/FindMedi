import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Menu, X, Moon, Sun, UserRound, MapPin, ChevronDown, ShoppingCart, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { allCities, getStateForCity } from '@/data/cities';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Find Hospital', path: '/hospitals' },
  { label: 'Find Clinic', path: '/clinic' },
  { label: 'Find Diagnostic Centers', path: '/book-test' },
  { label: 'Book Test', path: '/all-tests' },
  { label: 'Buy Medicine', path: '/buy-medicine' },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const isDarkMode = document.documentElement.classList.contains('dark');
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark') ? 'true' : 'false');
  };
  const themeToggleLabel = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  const { totalItems } = useCart();
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('mediCore_city') || 'Jabalpur');

  const handleCitySelect = (cityName) => {
    if (cityName !== 'Jabalpur') return;
    setSelectedCity(cityName);
    localStorage.setItem('mediCore_city', cityName);
    setCityOpen(false);
  };

  const displayedCities = allCities.filter(c =>
    c.name === 'Jabalpur' || !['Jabalpur'].includes(c.name)
  );

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="whitespace-nowrap">MediCore</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-2 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
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

        {/* Utility items (cart, dark mode, city, sign in) */}
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
                    {allCities.filter(c => c.name === 'Jabalpur').map((city) => (
                      <CommandItem
                        key={city.name}
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
                    {allCities.filter(c => c.name !== 'Jabalpur').map((city) => (
                      <div
                        key={city.name}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed select-none"
                      >
                        <Lock className="w-3.5 h-3.5 ml-2 shrink-0" />
                        <span>{city.name}</span>
                        <span className="ml-auto text-[10px]">{city.state}</span>
                      </div>
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hidden sm:flex gap-2 whitespace-nowrap shrink-0">
              <UserRound className="w-4 h-4" />
              Dashboard
            </Button>
          )}

          {/* Book Appointment */}
          <Button onClick={() => navigate(user ? '/patient/appointments' : '/login')} className="hidden sm:flex gap-2 whitespace-nowrap shrink-0">
            <UserRound className="w-4 h-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-border/50 bg-background">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
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
              <Button variant="ghost" size="sm" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="w-full justify-start">
                Dashboard
              </Button>
            )}
            <Button onClick={() => { navigate(user ? '/patient/appointments' : '/login'); setMobileOpen(false); }} className="w-full">
              Book Appointment
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}