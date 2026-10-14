import { useState } from 'react';
import { Search, Clock, Check, ChevronRight, Video, Home, Building2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ServiceItem {
  id?: string;
  code?: string;
  name: string;
  category?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  priceFrom?: number;
  modes?: string[]; // in_person, video, home_visit
  instructions?: string;
}

export interface FacilityServicesProps {
  services: ServiceItem[];
  onBookService?: (service: ServiceItem) => void;
}

export default function FacilityServices({ services = [], onBookService }: FacilityServicesProps) {
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filtered = services.filter((s) => {
    if (selectedCat !== 'All' && s.category !== selectedCat) return false;
    if (!query) return true;
    return `${s.name} ${s.description || ''} ${s.category || ''}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Treatments & Services Offered</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Explore standard procedures, consultations, and care packages</p>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            className="h-8 pl-8 text-xs rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((c) => (
            <button
              key={c as string}
              type="button"
              onClick={() => setSelectedCat(c as string)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedCat === c
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {c as string}
            </button>
          ))}
        </div>
      )}

      {/* Services List */}
      <div className="divide-y divide-border/60">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No matching services found.</p>
        ) : (
          filtered.map((s, idx) => (
            <div key={s.id || idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{s.name}</h4>
                  {s.category && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {s.category}
                    </span>
                  )}
                </div>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                  {s.durationMinutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.durationMinutes} mins
                    </span>
                  )}
                  {s.modes && s.modes.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      Modes: {s.modes.map((m) => m.replaceAll('_', ' ')).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-base font-bold text-foreground">
                    {s.price ? `₹${s.price}` : s.priceFrom ? `From ₹${s.priceFrom}` : 'Consult for Fee'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">inclusive of GST</span>
                </div>

                <Button size="sm" className="h-8 text-xs font-semibold px-4" onClick={() => onBookService?.(s)}>
                  Book
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
