import React, { useState } from 'react';
import {
  Phone, AlertTriangle, ShieldCheck, Heart, Baby, Users,
  Activity, Copy, Check, ExternalLink, X, LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';

export interface Helpline {
  number: string;
  name: string;
  category: 'emergency' | 'ambulance' | 'maternal' | 'mental_health' | 'women_child' | 'poison';
  description: string;
  available: string;
  tollFree: boolean;
}

export const NATIONAL_HELPLINES: Helpline[] = [
  {
    number: '112',
    name: 'National Emergency Number',
    category: 'emergency',
    description: 'All-in-one national emergency response for Police, Fire, and Medical Emergencies.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '108',
    name: 'Disaster & Medical Ambulance',
    category: 'ambulance',
    description: 'Emergency ambulance response for accidents, acute medical trauma, and hospital transport.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '102',
    name: 'Janani Shishu Suraksha (JSSK)',
    category: 'maternal',
    description: 'Free dedicated transport for pregnant women and sick neonates under National Health Mission.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '14416',
    name: 'Tele-MANAS Mental Health',
    category: 'mental_health',
    description: 'Govt. of India 24x7 National Tele-Mental Health Programme. Free confidential psychological support.',
    available: '24x7, Multilingual',
    tollFree: true,
  },
  {
    number: '181',
    name: 'Women in Distress Helpline',
    category: 'women_child',
    description: '24-hour emergency and non-emergency support for women facing domestic violence or harassment.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '1098',
    name: 'Childline India',
    category: 'women_child',
    description: 'Emergency response service for children in need of care, protection, and medical aid.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '1075',
    name: 'National Health Portal (MoHFW)',
    category: 'emergency',
    description: 'Ministry of Health and Family Welfare helpline for public health emergencies and viral outbreaks.',
    available: '24x7, 365 Days',
    tollFree: true,
  },
  {
    number: '1066',
    name: 'Poison Control Centre',
    category: 'poison',
    description: 'Immediate medical guidance for accidental poisoning, toxic ingestion, or chemical exposure.',
    available: '24x7 Emergency',
    tollFree: true,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NationalHelplinesModal({ open, onClose }: Props) {
  const [filter, setFilter] = useState('all');
  const [copiedNum, setCopiedNum] = useState<string | null>(null);

  if (!open) return null;

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(num);
    toast.success(`Copied helpline ${num} to clipboard`);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  const filtered = NATIONAL_HELPLINES.filter((h) => {
    if (filter === 'all') return true;
    return h.category === filter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="helpline-title"
    >
      <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-start justify-between bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive text-white flex items-center justify-center shrink-0 shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="helpline-title" className="text-lg font-bold text-foreground">
                Official National Emergency Helplines
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Government of India 24x7 toll-free emergency, ambulance & distress response numbers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter categories */}
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {[
            { key: 'all', label: 'All Helplines' },
            { key: 'emergency', label: '🚨 National (112)' },
            { key: 'ambulance', label: '🚑 Ambulance (108)' },
            { key: 'maternal', label: '👶 Mother & Child (102)' },
            { key: 'mental_health', label: '🧠 Tele-MANAS (14416)' },
            { key: 'women_child', label: '🛡️ Women & Child' },
            { key: 'poison', label: '🧪 Poison (1066)' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setFilter(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === cat.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Directory List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-border/60">
          {filtered.map((item) => (
            <div key={item.number} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xl font-extrabold text-destructive tracking-wide">
                    {item.number}
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {item.name}
                  </span>
                  {item.tollFree && (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30">
                      Toll-Free
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
                <p className="text-[11px] text-muted-foreground/80 font-medium">
                  Availability: {item.available}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyNumber(item.number)}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  {copiedNum === item.number ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-destructive hover:bg-destructive/90 text-white font-bold"
                >
                  <a href={`tel:${item.number}`}>
                    <Phone className="w-3.5 h-3.5" /> Call {item.number}
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" /> Free & Accessible across all telecom operators in India
          </span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
