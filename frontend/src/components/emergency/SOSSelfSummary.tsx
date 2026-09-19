import React from 'react';
import { User, Phone, Droplet, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SOSSelfSummaryProps {
  user: any;
}

export default function SOSSelfSummary({ user }: SOSSelfSummaryProps) {
  const bloodGroup = user?.bloodGroup || user?.medicalProfile?.bloodGroup || 'Not specified';
  const allergies = user?.medicalProfile?.allergies || 'None reported';
  const conditions = user?.medicalProfile?.conditions || 'None reported';

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name[0]?.toUpperCase() : 'U'}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{user?.name || 'Your Profile'}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> {user?.phone || 'No phone registered'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" /> Auto-Filled
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-card p-2.5 border border-border/80">
          <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
            <Droplet className="w-3 h-3 text-red-600" /> Blood Group
          </span>
          <span className="font-bold text-foreground mt-0.5 block">{bloodGroup}</span>
        </div>

        <div className="rounded-xl bg-card p-2.5 border border-border/80">
          <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Known Allergies
          </span>
          <span className="font-bold text-foreground mt-0.5 block truncate">{allergies}</span>
        </div>
      </div>

      <div className="rounded-xl bg-card p-2.5 border border-border/80 text-xs">
        <span className="text-[10px] text-muted-foreground block font-medium">
          Existing Medical Conditions:
        </span>
        <p className="font-medium text-foreground mt-0.5 text-[11px] line-clamp-2">{conditions}</p>
      </div>
    </div>
  );
}
