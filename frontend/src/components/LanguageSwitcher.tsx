/**
 * 6.md §2.1 + 11.md §12: language switcher (EN | हिंदी).
 *
 * Persists to the same `findmedi_lang` key i18n.ts boots from, so the choice
 * survives reloads. First consumer of the react-i18next setup — more screens
 * adopt t() incrementally from here.
 */
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').startsWith('hi') ? 'hi' : 'en';

  const set = (next: 'en' | 'hi') => {
    try {
      window.localStorage.setItem('findmedi_lang', next);
    } catch { /* private mode — session-only */ }
    void i18n.changeLanguage(next);
  };

  const btn = (id: 'en' | 'hi', label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => set(id)}
      aria-pressed={lang === id}
      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
        lang === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div data-testid="language-switcher" className="flex items-center gap-0.5 rounded-lg border px-1 py-0.5" role="group" aria-label="Language">
      {btn('en', 'EN')}
      {btn('hi', 'हिं')}
    </div>
  );
}
