/**
 * Vitest setup file — runs before every test suite.
 * Extends expect() with @testing-library/jest-dom custom matchers
 * like toBeInTheDocument(), toHaveAttribute(), etc.
 */
import '@testing-library/jest-dom';

// Mock window.matchMedia (used by Next.js theming hooks)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock window.localStorage (jsdom may not have it fully implemented)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});
