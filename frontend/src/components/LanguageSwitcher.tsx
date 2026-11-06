/**
 * 6.md §2.1 + 11.md §12: language switcher (EN | हिन्दी | regional).
 *
 * Persists to the same `findmedi_lang` key i18n.ts boots from, so the choice
 * survives reloads. First consumer of the react-i18next setup — more screens
 * adopt t() incrementally from here.
 */
import { useTranslation } from 'react-i18next';

const OPTIONS = [
  ['en', 'EN'],
  ['hi', 'हिन्दी'],
  ['mr', 'मराठी'],
  ['bn', 'বাংলা'],
  ['as', 'অসমীয়া'],
  ['or', 'ଓଡ଼ିଆ'],
  ['ta', 'தமிழ்'],
  ['te', 'తెలుగు'],
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0] as (typeof OPTIONS)[number][0];

  const set = (next: (typeof OPTIONS)[number][0]) => {
    try {
      window.localStorage.setItem('findmedi_lang', next);
    } catch { /* private mode — session-only */ }
    try { document.documentElement.lang = next; } catch { /* non-DOM */ }
    void i18n.changeLanguage(next);
  };

  return (
    <div data-testid="language-switcher" className="flex items-center gap-0.5 rounded-lg border px-1 py-0.5" role="group" aria-label="Language">
      {OPTIONS.map(([id, label]) => (
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
      ))}
    </div>
  );
}
