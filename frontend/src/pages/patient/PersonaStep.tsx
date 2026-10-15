/**
 * 6.md §4 persona step ("What brings you here?"). Shown once on the patient
 * dashboard when no persona is stored; skippable (generic adult defaults).
 * Persists via PUT /patient/persona (closed vocabulary, audited). Changes
 * dashboard DEFAULTS only in later turns — never permissions.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

const OPTIONS = [
  { id: 'adult', emoji: '🧑' },
  { id: 'parent', emoji: '👶' },
  { id: 'elderly', emoji: '🧓' },
  { id: 'caregiver', emoji: '🤝' },
  { id: 'fitness', emoji: '💪' },
  { id: 'chronic', emoji: '📋' },
  { id: 'maternity', emoji: '🤰' },
];

export default function PersonaStep() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/patient/persona')
      .then((res: any) => {
        if (!cancelled && !res?.persona) setVisible(true);
      })
      .catch(() => {
        /* offline — stay hidden rather than nag */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const choose = async (id: string | null) => {
    if (id) {
      try {
        await api.put('/patient/persona', { persona: id });
      } catch { /* offline — choice stands for this session */ }
    }
    setVisible(false);
  };

  return (
    <section data-testid="persona-step" className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{t('personaStep.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('personaStep.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => choose(null)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {t('personaStep.skip')}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(o.id)}
            className="rounded-xl border bg-background p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="text-xl">{o.emoji}</div>
            <div className="text-xs font-semibold mt-1">{t(`personaStep.options.${o.id}.label`)}</div>
            <div className="text-[11px] text-muted-foreground">{t(`personaStep.options.${o.id}.hint`)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
