import { Pill, ShieldCheck, ThermometerSnowflake, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface MedicineCardProps {
  item: {
    id?: string;
    _id?: string;
    name: string;
    strength?: string;
    genericName?: string;
    manufacturer?: string;
    packSize?: string;
    mrp?: number;
    price: number;
    rxRequired?: boolean;
    rxSchedule?: 'OTC' | 'Rx' | 'Schedule H' | 'Schedule H1';
    coldChain?: boolean;
    substituteCount?: number;
    inStock?: boolean;
    imageUrl?: string;
  };
  onAddToCart?: () => void;
  onUploadRx?: () => void;
  onViewSubstitutes?: () => void;
}

export default function MedicineCard({ item, onAddToCart, onUploadRx, onViewSubstitutes }: MedicineCardProps) {
  if (!item) return null;

  const discount = item.mrp && item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  const isOutOfStock = item.inStock === false;

  return (
    <div className="bg-card border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-primary/30 transition-all">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                item.rxSchedule === 'OTC'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
              }`}
            >
              {item.rxSchedule || (item.rxRequired ? 'Rx Prescription' : 'OTC')}
            </span>

            {item.coldChain && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20">
                <ThermometerSnowflake className="w-2.5 h-2.5" /> Cold-Chain 2–8°C
              </span>
            )}
          </div>

          {discount > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {discount}% OFF
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-sm text-foreground line-clamp-1">
            {item.name} {item.strength && <span className="font-normal text-xs text-muted-foreground">({item.strength})</span>}
          </h3>
          {item.genericName && (
            <p className="text-xs text-muted-foreground line-clamp-1 font-mono mt-0.5">Salt: {item.genericName}</p>
          )}
          {item.manufacturer && (
            <p className="text-[11px] text-muted-foreground mt-0.5">By {item.manufacturer} · {item.packSize || '10 tablets'}</p>
          )}
        </div>

        {item.substituteCount && item.substituteCount > 0 ? (
          <button
            type="button"
            onClick={onViewSubstitutes}
            className="text-[11px] text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            ★ {item.substituteCount} cheaper generic substitutes available
          </button>
        ) : null}
      </div>

      <div className="pt-3 mt-3 border-t flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">₹{item.price}</span>
            {item.mrp && item.mrp > item.price && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isOutOfStock ? <span className="text-destructive font-semibold">Out of Stock</span> : 'Available for delivery'}
          </p>
        </div>

        <div>
          {item.rxRequired ? (
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={onUploadRx} disabled={isOutOfStock}>
              Upload Rx
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs font-semibold" onClick={onAddToCart} disabled={isOutOfStock}>
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
