import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

/**
 * T3 (file 31): DDI decision support banner. Debounced POST /ddi/check for
 * the current drug list; major = red (blocks the parent's primary action
 * until an override reason is recorded), moderate = amber, minor = grey.
 *
 * Parent controls the gate via `onMajorStateChange(hasUncheckedMajor)`:
 * Pharmacy "Create Prescription" / "Dispense" and the doctor's sign button
 * stay disabled while a major interaction is un-overridden.
 */

export interface DdiInteraction {
  drugA: string;
  drugB: string;
  detectedPair: [string, string];
  severity: 'major' | 'moderate' | 'minor';
  effect: string;
  recommendation: string;
}

interface Props {
  /** Current drug names (strings) or medicine objects with name/medicineName. */
  drugs: Array<string | { name?: string; medicineName?: string; genericName?: string }>;
  /** Called whenever a major interaction is present but NOT yet overridden. */
  onMajorStateChange?: (blocked: boolean) => void;
  /** Optional prescription context for the override audit row. */
  prescriptionId?: string;
  prescriptionNo?: string;
  /** Reduce check spam while the user is still typing (default 300ms). */
  debounceMs?: number;
  /** Parent-controlled dismiss (e.g. modal closed). */
  active?: boolean;
}

const SEVERITY_STYLE: Record<string, { wrap: string; chip: string; Icon: typeof ShieldAlert }> = {
  major: { wrap: 'border-red-500/40 bg-red-500/5', chip: 'bg-red-500/10 text-red-700 border-red-500/30', Icon: ShieldAlert },
  moderate: { wrap: 'border-amber-500/40 bg-amber-500/5', chip: 'bg-amber-500/10 text-amber-700 border-amber-500/30', Icon: AlertTriangle },
  minor: { wrap: 'border-muted bg-muted/30', chip: 'bg-muted text-muted-foreground border-border', Icon: Info },
};

const OVERRIDE_REASONS = [
  'Benefit outweighs risk — monitored closely',
  'Dose adjusted / drugs spaced apart',
  'Short course, unavoidable combination',
  'Alternative unavailable in formulary',
  'Other (specify below)',
];

function pairKeyOf(i: DdiInteraction) {
  return [i.drugA, i.drugB].sort().join('::');
}

export default function DdiCheckBanner({ drugs, onMajorStateChange, prescriptionId, prescriptionNo, debounceMs = 300, active = true }: Props) {
  const [interactions, setInteractions] = useState<DdiInteraction[]>([]);
  const [unknownDrugs, setUnknownDrugs] = useState<string[]>([]);
  // Knowledge-base provenance (version + clinical review status) from /ddi/check.
  const [kb, setKb] = useState<{ version?: string; reviewStatus?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  // pairKey -> { reason, freeText }
  const [overrides, setOverrides] = useState<Record<string, { reason: string; freeText: string }>>({});
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const drugLabels = drugs
    .map((d) => (typeof d === 'string' ? d : d?.name || d?.medicineName || d?.genericName || ''))
    .map((s) => s.trim())
    .filter(Boolean);
  const key = drugLabels.map((s) => s.toLowerCase()).sort().join('|');

  const runCheck = useCallback(async () => {
    if (!active) return;
    if (drugLabels.length < 2) {
      setInteractions([]);
      setUnknownDrugs(drugLabels.length === 1 ? drugLabels : []);
      setError('');
      onMajorStateChange?.(false);
      return;
    }
    const mySeq = ++seq.current;
    setChecking(true);
    try {
      const r: any = await api.post('/ddi/check', { drugs: drugLabels });
      if (mySeq !== seq.current) return;
      const ints: DdiInteraction[] = r?.interactions || [];
      setInteractions(ints);
      setUnknownDrugs(r?.unknownDrugs || []);
      setKb(r?.knowledgeBase || null);
      setError('');
      const blocked = ints
        .filter((i) => i.severity === 'major')
        .some((i) => !overrides[pairKeyOf(i)]);
      onMajorStateChange?.(blocked);
    } catch (e: any) {
      if (mySeq !== seq.current) return;
      // Fail-safe: never claim "safe" when the check could not run — but a
      // network hiccup should not hard-block the clinician either.
      setError(e?.message || 'Interaction check unavailable');
    } finally {
      if (mySeq === seq.current) setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, overrides, onMajorStateChange]);

  useEffect(() => {
    if (!active) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(runCheck, debounceMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [key, active, debounceMs, runCheck]);

  const recordOverride = async (it: DdiInteraction) => {
    const pk = pairKeyOf(it);
    const form = overrides[pk] || { reason: OVERRIDE_REASONS[0], freeText: '' };
    const reason = [form.reason, form.freeText].filter(Boolean).join(' — ');
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await api.post('/ddi/override', {
        prescriptionId, prescriptionNo,
        pair: { drugA: it.drugA, drugB: it.drugB },
        severity: it.severity,
        effect: it.effect,
        reason,
      });
      const next = { ...overrides, [pk]: form };
      setOverrides(next);
      setOverrideFor(null);
      const blocked = interactions
        .filter((i) => i.severity === 'major')
        .some((i) => !next[pairKeyOf(i)]);
      onMajorStateChange?.(blocked);
    } catch {
      /* error toast handled by the api layer */
    } finally {
      setSaving(false);
    }
  };

  const overriddenCount = interactions.filter((i) => i.severity === 'major' && overrides[pairKeyOf(i)]).length;
  const majorCount = interactions.filter((i) => i.severity === 'major').length;

  if (!active) return null;

  // Quiet state: nothing flagged (still honest about coverage / checking).
  if (interactions.length === 0 && !error) {
    if (drugLabels.length < 2 || (!checking && unknownDrugs.length === 0)) {
      if (drugLabels.length >= 2) {
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2" data-testid="ddi-clear">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {checking ? 'Checking interactions…' : 'No known interactions found for this combination.'}
          </div>
        );
      }
      return null;
    }
  }

  return (
    <div className="space-y-2" data-testid="ddi-banner">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drug–Drug Interaction Check</span>
        <span className="text-[11px] text-muted-foreground">{checking ? 'Checking…' : `${interactions.length} alert(s)`}</span>
      </div>

      {error && <div className="text-xs text-amber-700 border border-amber-500/40 bg-amber-500/5 rounded-lg px-3 py-2">⚠ {error} — verify interactions manually.</div>}

      {unknownDrugs.length > 0 && (
        <div className="text-xs text-amber-700 border border-amber-500/40 bg-amber-500/5 rounded-lg px-3 py-2" data-testid="ddi-unknown">
          Not in interaction knowledge base (not checked): {unknownDrugs.join(', ')}
        </div>
      )}

      {interactions.map((it) => {
        const pk = pairKeyOf(it);
        const s = SEVERITY_STYLE[it.severity] || SEVERITY_STYLE.minor;
        const isOverridden = !!overrides[pk];
        const blocked = it.severity === 'major' && !isOverridden;
        const Icon = s.Icon;
        return (
          <div key={pk} className={`rounded-lg border p-3 ${s.wrap} ${blocked ? 'ring-1 ring-red-500/50' : ''}`} data-testid={`ddi-${it.severity}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className={`w-4 h-4 ${it.severity === 'major' ? 'text-red-600' : it.severity === 'moderate' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <span className={`text-[11px] font-bold uppercase px-1.5 py-0.5 rounded border ${s.chip}`}>{it.severity}</span>
                <span className="text-sm font-semibold">{it.drugA} + {it.drugB}</span>
              </div>
              {it.severity === 'major' && (isOverridden
                ? <span className="text-[11px] text-emerald-700 font-medium">Overridden ✓</span>
                : (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-red-700 underline"
                    onClick={() => setOverrideFor(overrideFor === pk ? null : pk)}
                    data-testid="ddi-override-trigger"
                  >
                    Override required
                  </button>
                ))}
            </div>
            <p className="text-xs mt-1.5 text-foreground/90">{it.effect}</p>
            <p className="text-xs mt-1 text-muted-foreground"><b>Recommendation:</b> {it.recommendation}</p>

            {overrideFor === pk && (
              <div className="mt-2 space-y-2 bg-background/70 rounded-md p-2 border border-border/60">
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  value={overrides[pk]?.reason || OVERRIDE_REASONS[0]}
                  onChange={(e) => setOverrides((o) => ({ ...o, [pk]: { reason: e.target.value, freeText: o[pk]?.freeText || '' } }))}
                  aria-label="Override reason"
                >
                  {OVERRIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Input
                  className="h-9 text-xs"
                  placeholder="Additional detail (mandatory if Other)"
                  value={overrides[pk]?.freeText || ''}
                  onChange={(e) => setOverrides((o) => ({ ...o, [pk]: { reason: o[pk]?.reason || OVERRIDE_REASONS[0], freeText: e.target.value } }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={saving || (overrides[pk]?.reason === 'Other (specify below)' && !overrides[pk]?.freeText?.trim())}
                    onClick={() => recordOverride(it)}
                    data-testid="ddi-override-confirm"
                  >
                    {saving ? 'Saving…' : 'Confirm override (logged)'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOverrideFor(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {majorCount > 0 && overriddenCount === majorCount && (
        <p className="text-[11px] text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> All major interactions overridden (audit-logged).</p>
      )}
      <p className="text-[10px] text-muted-foreground italic">
        Clinical decision support — not a substitute for professional judgement.
        {kb?.version ? ` · KB v${kb.version}` : ''}
        {kb?.reviewStatus ? ` (${kb.reviewStatus})` : ''}
      </p>
    </div>
  );
}
