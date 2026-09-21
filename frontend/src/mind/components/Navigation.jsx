import { useState } from "react";
import { Button } from "@/mind/components/ui/button";
import {
    BarChart3,
    BookOpen,
    Brain,
    BrainCircuit,
    Calendar,
    Heart,
    Home,
    Info,
    Menu,
    Palette,
    Globe,
    Phone,
    Users,
    X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setMobileMenuOpen, selectMobileMenuOpen } from "@/mind/store/uiSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";
import { useThemeContext } from "@/mind/contexts/ThemeContext";
import { useLanguageContext } from "@/mind/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/mind/components/ui/dropdown-menu";

const Navigation = () => {
    const isOpen = useAppSelector(selectMobileMenuOpen);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { theme, setTheme, themes } = useThemeContext();
    const { language, setLanguage, languages } = useLanguageContext();
    const navItems = [
        { name: "Home", icon: Home, route: "/mind" },
        { name: "Resources", icon: BookOpen, route: "/mind/resources" },
        { name: "Peer Support", icon: Users, route: "/mind/peer" },
        { name: "Find Counsellor", icon: Calendar, route: "/mind/counselling" },
        { name: "Psychiatrist", icon: BrainCircuit, route: "/mind/psychiatrists" },
        { name: "Dashboard", icon: BarChart3, route: "/mind/dashboard" },
        { name: "My Wellness", icon: Heart, route: "/mind/wellness" },
        { name: "About", icon: Info, route: "/mind/about" },
    ];

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
            </div>
          </div>)}
      </div>
    </nav>);
};

export default Navigation;
