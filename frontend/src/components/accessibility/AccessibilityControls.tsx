import React, { useState, useEffect } from 'react';
import {
  Accessibility, Eye, Type, Volume2, Globe, Sun, Moon, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { applyUserSettings, readStoredSettings } from '@/lib/settings';

export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [elderMode, setElderMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const settings = readStoredSettings();
    if (settings.elderMode) {
      setElderMode(true);
      document.documentElement.classList.add('elder-mode');
    }
    if (settings.highContrast) {
      setHighContrast(true);
      document.documentElement.classList.add('high-contrast');
    }
    if (settings.language) {
      setLanguage(settings.language);
    }
  }, []);

  const toggleElderMode = () => {
    const next = !elderMode;
    setElderMode(next);
    if (next) {
      document.documentElement.classList.add('elder-mode');
      toast.success('Elder Mode enabled: Text size enlarged and buttons highlighted.');
    } else {
      document.documentElement.classList.remove('elder-mode');
      toast.info('Elder Mode disabled.');
    }
    applyUserSettings({ elderMode: next });
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (next) {
      document.documentElement.classList.add('high-contrast');
      toast.success('High Contrast mode enabled.');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    applyUserSettings({ highContrast: next });
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    applyUserSettings({ language: lang });
    toast.success(lang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है।' : 'Language set to English.');
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border bg-card text-foreground shadow-lg hover:bg-muted transition-all text-xs font-semibold"
        aria-label="Accessibility & Elder Mode Settings"
        title="Accessibility Settings"
      >
        <Accessibility className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">Accessibility</span>
      </button>

      {/* Popover Settings Panel */}
      {open && (
        <div className="absolute bottom-12 left-0 w-72 bg-card border rounded-2xl shadow-2xl p-4 space-y-4 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Accessibility className="w-4 h-4 text-primary" /> Accessibility & Inclusion
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close accessibility panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Elder Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-primary" /> Elder Mode (Senior Care)
                </span>
                <p className="text-[11px] text-muted-foreground">Larger text, high-readability spacing</p>
              </div>
              <input
                type="checkbox"
                checked={elderMode}
                onChange={toggleElderMode}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" /> High Contrast
                </span>
                <p className="text-[11px] text-muted-foreground">Enhanced outline and dark backgrounds</p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={toggleHighContrast}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Language Switcher */}
            <div className="space-y-1.5 pt-2 border-t">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" /> Language / भाषा
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant={language === 'en' ? 'default' : 'outline'}
                  onClick={() => changeLanguage('en')}
                  className="h-7 text-xs font-medium"
                >
                  English
                </Button>
                <Button
                  size="sm"
                  variant={language === 'hi' ? 'default' : 'outline'}
                  onClick={() => changeLanguage('hi')}
                  className="h-7 text-xs font-medium"
                >
                  हिंदी (Hindi)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
