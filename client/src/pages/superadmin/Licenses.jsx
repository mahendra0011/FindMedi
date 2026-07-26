import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function LicensesTab() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getLicenses({}), api.getLicenseStats()]);
      setLicenses(res.licenses || []);
      setStats(s);
    } catch { toast.error('Failed to load licenses'); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Active', value: stats.active, color: 'text-success' },
            { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-warning' },
            { label: 'Expired', value: stats.expired, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Active', 'Expiring Soon', 'Expired', 'Revoked'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? licenses.length : licenses.filter(l => l.status === f).length})</button>
        ))}
      </div>
      {licenses.filter(l => filter === 'All' || l.status === filter).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <FileCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No licenses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {licenses.filter(l => filter === 'All' || l.status === filter).map((l, i) => {
            const daysLeft = Math.ceil((new Date(l.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <motion.div key={l._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{l.facilityName || 'Unknown Facility'}</span>
                      <Badge variant="outline" className="text-[10px]">{l.facilityType}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{l.licenseType}: <span className="font-mono">{l.licenseNumber}</span></p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Issued: {new Date(l.issueDate).toLocaleDateString()}</span>
                      <span>Expires: {new Date(l.expiryDate).toLocaleDateString()}</span>
                      {daysLeft > 0 && daysLeft <= 30 && <span className="text-warning font-medium">{daysLeft}d left</span>}
                      {daysLeft <= 0 && <span className="text-destructive font-medium">Expired</span>}
                    </div>
                  </div>
                  <Badge className={
                    l.status === 'Active' ? 'bg-success/10 text-success' :
                    l.status === 'Expiring Soon' ? 'bg-warning/10 text-warning' :
                    l.status === 'Expired' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted-foreground/10 text-muted-foreground'
                  }>{l.status}</Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LicensesTab;
