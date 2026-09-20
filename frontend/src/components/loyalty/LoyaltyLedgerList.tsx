import React from 'react';

export default function LoyaltyLedgerList({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Abhi koi history nahi hai.</p>;
  return (
    <div className="space-y-1.5">
      {items.map((e: any) => (
        <div key={e._id || `${e.createdAt}-${e.points}`} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
          <div>
            <p className="font-semibold text-xs">{e.reason}</p>
            <p className="text-[11px] text-muted-foreground">{e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : ''}</p>
          </div>
          <p className={`font-black tabular-nums ${Number(e.points) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {Number(e.points) >= 0 ? '+' : ''}{e.points}
          </p>
        </div>
      ))}
    </div>
  );
}
