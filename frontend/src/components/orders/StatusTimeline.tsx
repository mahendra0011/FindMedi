import React from 'react';

export interface TimelineStep {
  key: string;
  label: string;
  at?: string | null;
  done?: boolean;
  current?: boolean;
}

/** Thin stub: vertical journey timeline reused by Rental/Event/Membership flows. */
export default function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-2" data-testid="status-timeline">
      {steps.map((s) => (
        <li key={s.key} className="flex items-start gap-2.5">
          <span
            className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
              s.done ? 'bg-emerald-500' : s.current ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
            }`}
          />
          <div className="min-w-0">
            <p className={`text-xs font-medium ${s.current ? 'text-primary' : 'text-foreground'}`}>{s.label}</p>
            {s.at && <p className="text-[11px] text-muted-foreground">{s.at}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
