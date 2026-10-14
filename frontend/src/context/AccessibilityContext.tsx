import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

interface AccessibilityContextType {
  elderMode: boolean;
  setElderMode: (value: boolean) => void;
  toggleElderMode: () => void;
  lowBandwidthMode: boolean;
  setLowBandwidthMode: (value: boolean) => void;
  toggleLowBandwidthMode: () => void;
  language: string;
  changeLanguage: (lang: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [elderMode, setElderModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('findmedi_elder_mode') === 'true';
  });

  const [lowBandwidthMode, setLowBandwidthState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('findmedi_low_bandwidth') === 'true';
  });

  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('findmedi_lang') || 'en';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (elderMode) {
      root.setAttribute('data-elder-mode', 'true');
      body.classList.add('elder-mode');
    } else {
      root.removeAttribute('data-elder-mode');
      body.classList.remove('elder-mode');
    }
    localStorage.setItem('findmedi_elder_mode', String(elderMode));
  }, [elderMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (lowBandwidthMode) {
      root.setAttribute('data-low-bandwidth', 'true');
      body.classList.add('low-bandwidth');
    } else {
      root.removeAttribute('data-low-bandwidth');
      body.classList.remove('low-bandwidth');
    }
    localStorage.setItem('findmedi_low_bandwidth', String(lowBandwidthMode));
  }, [lowBandwidthMode]);

  const setElderMode = (val: boolean) => setElderModeState(val);
  const toggleElderMode = () => setElderModeState(prev => !prev);

  const setLowBandwidthMode = (val: boolean) => setLowBandwidthState(val);
  const toggleLowBandwidthMode = () => setLowBandwidthState(prev => !prev);

  const changeLanguage = (newLang: string) => {
    setLanguageState(newLang);
    localStorage.setItem('findmedi_lang', newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        elderMode,
        setElderMode,
        toggleElderMode,
        lowBandwidthMode,
        setLowBandwidthMode,
        toggleLowBandwidthMode,
        language,
        changeLanguage,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
