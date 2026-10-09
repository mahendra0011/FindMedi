/**
 * File 19 §19.2: shared status atoms. All colour comes from the semantic
 * tokens in index.css — no hard-coded hex anywhere in ops UI.
 */
export function StatusPill({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const tone =
    /done|complete|paid|available|approved|delivered|active|settled|connected/.test(s)
      ? 'ok'
      : /pending|waiting|progress|partial|assigned|running|queued|scheduled/.test(s)
        ? 'warn'
        : /fail|miss|expire|cancel|reject|denied|blocked|down|deceased|blacklist/.test(s)
          ? 'bad'
          : 'neutral';
  const bg: Record<string, string> = {
    ok: 'background: hsl(var(--status-ok) / 0.14); color: hsl(var(--status-ok)); border-color: hsl(var(--status-ok) / 0.4)',
    warn: 'background: hsl(var(--status-warn) / 0.14); color: hsl(var(--status-warn)); border-color: hsl(var(--status-warn) / 0.4)',
    bad: 'background: hsl(var(--status-bad) / 0.12); color: hsl(var(--status-bad)); border-color: hsl(var(--status-bad) / 0.4)',
    neutral: 'background: hsl(var(--status-neutral) / 0.12); color: hsl(var(--status-neutral)); border-color: hsl(var(--status-neutral) / 0.35)',
  };
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={parseStyle(bg[tone])}>
      {status}
    </span>
  );
}

function parseStyle(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const part of css.split(';')) {
    const [k, ...rest] = part.split(':');
    if (!k || !rest.length) continue;
    const js = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[js] = rest.join(':').trim();
  }
  return out as React.CSSProperties;
}

export function SlaRing({ dueAt, label }: { dueAt?: string | Date | null; label?: string }) {
  if (!dueAt) return <span className="text-xs text-muted-foreground">{label || 'No SLA'}</span>;
  const ms = new Date(dueAt).getTime() - Date.now();
  const mins = Math.round(ms / 60000);
  const tone = ms < 0 ? 'bad' : mins <= 15 ? 'warn' : 'ok';
  const color = `hsl(var(--status-${tone}))`;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{ borderColor: color, color }}
      title={label}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {ms < 0 ? `${Math.abs(mins)}m overdue` : `${mins}m left`}
    </span>
  );
}

export function BedTile({ bed, selected, onClick }: { bed: any; selected?: boolean; onClick?: () => void }) {
  const s = String(bed?.status || '');
  const fill =
    s === 'Occupied' ? 'hsl(var(--status-bad) / 0.75)'
      : s === 'Under Cleaning' ? 'hsl(var(--status-warn) / 0.75)'
        : s === 'Maintenance' ? 'hsl(var(--status-neutral) / 0.6)'
          : 'hsl(var(--status-ok) / 0.75)';
  return (
    <button
      onClick={onClick}
      title={`${bed?.bedNumber} — ${s}${bed?.currentPatientName ? ` (${bed.currentPatientName})` : ''}`}
      aria-label={`Bed ${bed?.bedNumber}, ${s}`}
      className={`flex h-12 w-14 flex-col items-center justify-center rounded-md border text-[10px] font-bold text-white transition-transform hover:scale-105 ${selected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      style={{ background: fill, borderColor: 'transparent' }}
    >
      <span>{bed?.bedNumber}</span>
      <span className="font-normal opacity-90">{s === 'Available' ? 'free' : s === 'Occupied' ? 'occ' : '…'}</span>
    </button>
  );
}
