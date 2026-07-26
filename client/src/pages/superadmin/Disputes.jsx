import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function DisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([api.getDisputes({}), api.getDisputeStats()]);
      setDisputes(res.disputes || []);
      setStats(s);
    } catch { toast.error('Failed to load disputes'); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = filter === 'All' ? disputes : disputes.filter(d => d.status === filter);

  const handleResolve = async (id) => {
    if (!resolution) return;
    try {
      await api.updateDisputeStatus(id, { status: 'Resolved', resolution });
      setSelected(null);
      setResolution('');
      load();
    } catch { toast.error('Failed to resolve dispute'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Open', value: stats.open, color: 'text-warning' },
            { label: 'In Review', value: stats.inReview, color: 'text-info' },
            { label: 'Resolved', value: stats.resolved, color: 'text-success' },
            { label: 'Critical', value: stats.critical, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border/60 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Open', 'In Review', 'Resolved', 'Dismissed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f} ({f === 'All' ? disputes.length : disputes.filter(d => d.status === f).length})</button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disputes..." className="pl-10" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No disputes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.filter(d => !search || d.disputeId?.includes(search) || d.raisedByName?.toLowerCase().includes(search.toLowerCase())).map((d, i) => (
            <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${d.priority === 'Critical' ? 'text-destructive' : d.priority === 'High' ? 'text-warning' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground text-sm">#{d.disputeId}</span>
                    <Badge variant="outline" className="text-[10px]">{d.againstType}</Badge>
                  </div>
                  <p className="text-sm text-foreground">{d.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.raisedByName} → {d.againstName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={d.status === 'Resolved' ? 'bg-success/10 text-success' : d.status === 'Dismissed' ? 'bg-destructive/10 text-destructive' : d.status === 'In Review' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}>{d.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(d); setResolution(d.resolution || ''); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-4">#{selected.disputeId}</h3>
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Reason:</strong> {selected.reason}</div>
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Raised by:</strong> {selected.raisedByName}</div>
              <div className="p-3 bg-muted/20 rounded-xl text-sm"><strong>Against:</strong> {selected.againstName} ({selected.againstType})</div>
              {selected.description && <div className="p-3 bg-muted/20 rounded-xl text-sm">{selected.description}</div>}
            </div>
            {(selected.status === 'Open' || selected.status === 'In Review') && (
              <div className="space-y-3">
                <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background p-3 text-sm min-h-[80px]" placeholder="Resolution notes..." />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success" onClick={() => handleResolve(selected._id)}>Resolve</Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={async () => { try { await api.updateDisputeStatus(selected._id, { status: 'Dismissed' }); setSelected(null); load(); } catch { toast.error('Failed to dismiss'); } }}>Dismiss</Button>
                </div>
              </div>
            )}
            {selected.resolution && <div className="p-3 bg-success/10 rounded-xl text-sm mt-3"><strong>Resolution:</strong> {selected.resolution}</div>}
            <Button variant="outline" className="w-full mt-3" onClick={() => setSelected(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default DisputesTab;
