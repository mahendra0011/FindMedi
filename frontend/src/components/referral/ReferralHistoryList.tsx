import React from 'react';

const BADGE: Record<string, string> = {
  pending: 'bg-slate-200 text-slate-700',
  qualified: 'bg-blue-100 text-blue-700',
  rewarded: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  fraud_flagged: 'bg-red-100 text-red-700',
};

export default function ReferralHistoryList({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Abhi kisi ko refer nahi kiya.</p>;
  return (
    <div className="space-y-1.5">
      {items.map((r: any) => (
        <div key={r._id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
          <p className="font-semibold text-xs">{r.refereeId?.name || r.refereeId?.email || 'New user'}</p>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${BADGE[r.status] || BADGE.pending}`}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}
