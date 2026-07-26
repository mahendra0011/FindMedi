import React, { useState } from 'react';
import { Download, Users, DollarSign, CalendarDays, Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

const EXPORTS = [
  { id: 'users', label: 'Users Export', icon: Users, desc: 'All platform users with role, status, contact info', endpoint: 'users' },
  { id: 'revenue', label: 'Revenue Report', icon: DollarSign, desc: 'Commission earnings, payouts, transaction ledger', endpoint: 'revenue' },
  { id: 'bookings', label: 'Bookings Report', icon: CalendarDays, desc: 'All appointments, lab bookings, pharmacy orders', endpoint: 'bookings' },
  { id: 'facilities', label: 'Facilities Report', icon: Building2, desc: 'Hospitals, clinics, labs, pharmacies with status', endpoint: 'facilities' },
  { id: 'audit', label: 'Audit Log Export', icon: FileText, desc: 'Complete audit trail for compliance', endpoint: 'audit' },
];

export default function DataExport() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const params = new URLSearchParams({ format: 'csv', ...dateRange });
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token');
      const url = `${baseUrl}/api/export/${type}?${params}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${type}-${getISTDateString()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${type} exported successfully`);
    } catch { toast.error('Export failed. Check backend /api/export/* endpoints.'); }
    setExporting(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Data Export & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Export platform data as CSV for finance, legal & compliance teams</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div><label className="text-xs font-medium mb-1 block">From</label><Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} /></div>
            <div><label className="text-xs font-medium mb-1 block">To</label><Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORTS.map(ex => (
          <Card key={ex.id}>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <ex.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{ex.label}</h3>
              <p className="text-xs text-muted-foreground mb-4">{ex.desc}</p>
              <Button onClick={() => handleExport(ex.id)} disabled={exporting === ex.id} className="w-full gap-2" variant="outline">
                {exporting === ex.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting === ex.id ? 'Exporting...' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
