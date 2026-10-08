import React from 'react';

export interface PriceLine {
  name: string;
  price: number;
  qty?: number;
}

/** Thin stub: itemised bill block reused by Rental/Event/Membership flows. */
export default function PriceBreakup({
  lines,
  total,
  currency = '₹',
}: {
  lines: PriceLine[];
  total?: number;
  currency?: string;
}) {
  const computed = total ?? lines.reduce((s, l) => s + Number(l.price || 0) * Number(l.qty ?? 1), 0);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5" data-testid="price-breakup">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground truncate">
            {l.name}
            {Number(l.qty ?? 1) > 1 ? ` × ${l.qty}` : ''}
          </span>
          <span className="font-medium text-foreground shrink-0">
            {currency}
            {Number(l.price || 0) * Number(l.qty ?? 1)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-sm font-semibold">
        <span>Total</span>
        <span className="text-primary">
          {currency}
          {computed}
        </span>
      </div>
    </div>
  );
}
