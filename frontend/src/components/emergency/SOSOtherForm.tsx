import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { User, Phone, AlertCircle } from 'lucide-react';

interface SOSOtherFormProps {
  formData: {
    victimName: string;
    victimAge: string;
    victimCondition: string;
    shareOwnDetails: boolean;
  };
  onChange: (field: string, value: any) => void;
  currentUser: any;
}

export default function SOSOtherForm({ formData, onChange, currentUser }: SOSOtherFormProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-snug text-[11px]">
          All victim fields below are <strong>optional</strong>. In an urgent situation, you can immediately proceed without filling anything.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[11px] font-semibold text-foreground mb-1 block">
            Victim Name (Optional)
          </label>
          <Input
            placeholder="e.g. Unknown Person / Ramesh"
            value={formData.victimName}
            onChange={(e) => onChange('victimName', e.target.value)}
            className="h-9 text-xs rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-foreground mb-1 block">
            Approx Age (Optional)
          </label>
          <Input
            type="number"
            placeholder="e.g. 35"
            value={formData.victimAge}
            onChange={(e) => onChange('victimAge', e.target.value)}
            className="h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-foreground mb-1 block">
          Visible Injury / Condition Notes (Optional)
        </label>
        <Textarea
          placeholder="e.g. Road accident near traffic signal, unconscious, bleeding from head..."
          value={formData.victimCondition}
          onChange={(e) => onChange('victimCondition', e.target.value)}
          rows={2}
          className="text-xs rounded-xl resize-none"
        />
      </div>

      {/* Share Reporter Contact Toggle */}
      <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">Share my contact with responder</p>
          <p className="text-[11px] text-muted-foreground">
            Enables the ambulance driver to call you ({currentUser?.phone || 'your phone'}) for landmark directions.
          </p>
        </div>
        <Switch
          checked={formData.shareOwnDetails}
          onCheckedChange={(checked) => onChange('shareOwnDetails', checked)}
        />
      </div>
    </div>
  );
}
