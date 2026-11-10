/** Compact language picker for the public navigation. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const OPTIONS = [
  { id: 'en', short: 'EN', native: 'English', english: 'English' },
  { id: 'hi', short: '\u0939\u093f', native: '\u0939\u093f\u0928\u094d\u0926\u0940', english: 'Hindi' },
  { id: 'mr', short: '\u092e', native: '\u092e\u0930\u093e\u0920\u0940', english: 'Marathi' },
  { id: 'bn', short: '\u09ac\u09be', native: '\u09ac\u09be\u0982\u09b2\u09be', english: 'Bengali' },
  { id: 'as', short: '\u0985', native: '\u0985\u09b8\u09ae\u09c0\u09df\u09be', english: 'Assamese' },
  { id: 'or', short: '\u13a0', native: '\u13a3\u13c2\u13a5\u13b8\u13a2', english: 'Odia' },
  { id: 'ta', short: '\u0ba4', native: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd', english: 'Tamil' },
  { id: 'te', short: '\u0c24\u0c46', native: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41', english: 'Telugu' },
] as const;

type LanguageId = (typeof OPTIONS)[number]['id'];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = (i18n.language || 'en').split('-')[0] as LanguageId;
  const activeLanguage = OPTIONS.find((option) => option.id === lang) || OPTIONS[0];
  const hindi = lang === 'hi';

  const setLanguage = (next: LanguageId) => {
    try {
      window.localStorage.setItem('findmedi_lang', next);
    } catch { /* private mode — session-only */ }
    try { document.documentElement.lang = next; } catch { /* non-DOM */ }
    void i18n.changeLanguage(next);
    setOpen(false);
  };

  return (
    <div data-testid="language-switcher">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${hindi ? '\u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902' : 'Select language'}: ${activeLanguage.english}`}
            className="h-9 shrink-0 gap-2 rounded-full border-border/70 bg-background/80 px-3 shadow-sm"
          >
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold">{activeLanguage.short}</span>
            <span className="hidden 2xl:inline text-xs">{hindi ? '\u092d\u093e\u0937\u093e' : 'Language'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle>{hindi ? '\u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902' : 'Select your language'}</DialogTitle>
            <DialogDescription>
              {hindi
                ? 'FindMedi \u0915\u0940 \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902\u0964'
                : 'Choose the language you want to use on FindMedi.'}
            </DialogDescription>
          </DialogHeader>
          <div role="listbox" aria-label={hindi ? '\u092d\u093e\u0937\u093e\u090f\u0901' : 'Languages'} className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {OPTIONS.map((option) => {
              const selected = lang === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setLanguage(option.id)}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border/70 hover:border-primary/50 hover:bg-muted/60'
                  }`}
                >
                  <span className="min-w-0">
                    <span lang={option.id} className="block truncate text-sm font-semibold">{option.native}</span>
                    <span className="block text-xs text-muted-foreground">{option.english}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
