import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Filter, CalendarDays, UserRound, ArrowUpRight, Ban, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DoctorRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getRefunds({ limit: 500, page: 1 });
      setRefunds(res?.payments || res?.data || res || []);
    } catch {
      toast.error('Failed to load refunds');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    try {
      // Assuming a generic update endpoint or we simulate it if backend lacks it
      await api.put(`/payments/refund/${id}/status`, { status: action });
      toast.success(`Refund marked as ${action}`);
      setSelected(null);
      load();
    } catch {
      toast.error('Failed to update refund status');
    }
  };

  const filtered = refunds.filter(r => {
    const patientName = (r.patient || r.patientName || '').toLowerCase();
    const matchesSearch = patientName.includes(search.toLowerCase()) || (r._id || '').includes(search);
    const matchesFilter = filter === 'All' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalRefunded = refunds.filter(r => r.status === 'Refunded').reduce((acc, r) => acc + (r.refund_amount || r.amount || 0), 0);
  const pendingCount = refunds.filter(r => r.status === 'Pending').length;

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" /> Refunds & Cancellations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage refund requests from patient cancellations.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Refunded</p>
            <p className="text-2xl font-bold text-destructive">₹{totalRefunded.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Requests</p>
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-foreground">
              {refunds.filter(r => new Date(r.createdAt || r.date).getMonth() === new Date().getMonth()).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold text-foreground">{refunds.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient name or ID..." className="pl-10" />
          </div>
          <div className="flex gap-2">
            {['All', 'Pending', 'Refunded', 'Rejected'].map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="rounded-xl">
                {f}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No refund requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r._id} onClick={() => setSelected(r)} className="rounded-xl border hover:border-primary/50 p-4 flex items-center justify-between cursor-pointer transition-colors bg-background">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.status === 'Refunded' ? 'bg-destructive/10 text-destructive' : r.status === 'Rejected' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'}`}>
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.patient || r.patientName || 'Unknown Patient'}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDisplayDate(r.createdAt || r.date)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{r.reason || r.description || 'Cancellation'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="font-bold text-foreground">₹{(r.refund_amount || r.amount || 0).toLocaleString()}</p>
                  <Badge variant="outline" className={
                    r.status === 'Refunded' ? 'bg-destructive/10 text-destructive border-transparent' : 
                    r.status === 'Rejected' ? 'bg-muted text-muted-foreground border-transparent' : 
                    'bg-warning/10 text-warning border-transparent'
                  }>
                    {r.status || 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl border shadow-xl p-6" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-heading font-bold text-xl">Refund Request</h3>
                  <p className="text-xs text-muted-foreground">ID: {selected._id}</p>
                </div>
                <Badge className={
                  selected.status === 'Refunded' ? 'bg-destructive/10 text-destructive' : 
                  selected.status === 'Rejected' ? 'bg-muted text-muted-foreground' : 
                  'bg-warning/10 text-warning'
                }>
                  {selected.status || 'Pending'}
                </Badge>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold">₹{(selected.refund_amount || selected.amount || 0).toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Patient</p>
                    <p className="text-sm font-medium">{selected.patient || selected.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm font-medium">{formatDisplayDate(selected.createdAt || selected.date)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason for Cancellation</p>
                  <p className="text-sm p-3 bg-muted/30 rounded-xl">{selected.reason || selected.description || 'No reason provided by patient.'}</p>
                </div>
              </div>

              {selected.status === 'Pending' ? (
                <div className="flex gap-3">
                  <Button className="flex-1 gap-2 bg-success hover:bg-success/90" onClick={() => handleAction(selected._id, 'Refunded')}>
                    <CheckCircle2 className="w-4 h-4" /> Approve Refund
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleAction(selected._id, 'Rejected')}>
                    <Ban className="w-4 h-4" /> Reject
                  </Button>
                </div>
              ) : (
                <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
