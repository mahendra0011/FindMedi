/**
 * 11.md §7 shared kit: SlotPicker.
 * Morning/afternoon/evening grouped slot buttons with disabled + selected
 * states and an optional hold-countdown note. Pure presentational — slot
 * fetching/hold timers stay in the caller (booking flows own them).
 */
export interface KitSlot {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const GROUPS = [
  { key: 'morning', label: 'Morning', match: (t: string) => Number(t.slice(0, 2)) < 12 },
  { key: 'afternoon', label: 'Afternoon', match: (t: string) => { const h = Number(t.slice(0, 2)); return h >= 12 && h < 17; } },
  { key: 'evening', label: 'Evening', match: () => true },
];

export default function SlotPicker({
  slots,
  selectedId,
  onSelect,
  holdNote,
}: {
  slots: KitSlot[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  holdNote?: string;
}) {
  const ungrouped = slots.filter((s) => !/^\d{1,2}:\d{2}/.test(s.label));
  const timed = slots.filter((s) => /^\d{1,2}:\d{2}/.test(s.label));
  // First-match wins: evening is the fallback bucket, not a catch-all overlay.
  const groups = GROUPS.map((g) => ({ ...g, items: [] as typeof timed }));
  for (const s of timed) {
    const g = groups.find((gg) => gg.match(s.label));
    g?.items.push(s);
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const renderSlot = (s: KitSlot) => {
    const active = selectedId === s.id;
    return (
      <button
        key={s.id}
        type="button"
        disabled={s.disabled}
        title={s.disabled ? s.disabledReason || 'Unavailable' : s.sub || s.label}
        onClick={() => onSelect(s.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          active
            ? 'bg-primary text-primary-foreground border-primary'
            : s.disabled
              ? 'bg-muted text-muted-foreground border-border/40 line-through cursor-not-allowed'
              : 'bg-background hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        {s.label}
        {s.sub && <span className="block text-[10px] font-normal opacity-70">{s.sub}</span>}
      </button>
    );
  };

  return (
    <div data-testid="slot-picker" className="space-y-2">
      {visibleGroups.map((g) => (
        <div key={g.key}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">{g.items.map(renderSlot)}</div>
        </div>
      ))}
      {ungrouped.length > 0 && <div className="flex flex-wrap gap-1.5">{ungrouped.map(renderSlot)}</div>}
      {slots.length === 0 && <p className="text-xs text-muted-foreground">No slots available for this day.</p>}
      {holdNote && <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">{holdNote}</p>}
    </div>
  );
}
