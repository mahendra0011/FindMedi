import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Search, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function Cities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', state: '', isOnboarding: false });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCities({ search });
      setCities(res.cities || []);
    } catch { toast.error('Failed to load cities'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('City name required');
    try {
      await api.createCity(form);
      toast.success('City added');
      setShowForm(false);
      setForm({ name: '', state: '', isOnboarding: false });
      load();
    } catch (err) { toast.error(err?.message || 'Failed to create city'); }
  };

  const handleToggle = async (city) => {
    try {
      await api.updateCity(city._id, { isActive: !city.isActive });
      toast.success(city.isActive ? 'City deactivated' : 'City activated');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleToggleOnboarding = async (city) => {
    try {
      await api.updateCity(city._id, { isOnboarding: !city.isOnboarding, onboardingDate: !city.isOnboarding ? new Date() : null });
      toast.success(city.isOnboarding ? 'Onboarding closed' : 'Onboarding opened');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await api.deleteCity(id); toast.success('City deleted'); load(); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Region & City Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage cities where the platform is live, control onboarding</p>
        </div>
        <Badge variant="outline" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> {cities.length} cities</Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search cities..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus className="w-4 h-4" /> Add City</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-sm">Add New City</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-3 items-end">
              <div className="flex-1"><label className="text-xs font-medium mb-1 block">City Name</label><Input placeholder="e.g. Mumbai" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="flex-1"><label className="text-xs font-medium mb-1 block">State</label><Input placeholder="e.g. Maharashtra" value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">State</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Onboarding</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th></tr></thead>
          <tbody>
            {cities.map(c => (
              <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /><span className="font-medium text-foreground">{c.name}</span></div></td>
                <td className="px-4 py-3 text-muted-foreground">{c.state || '—'}</td>
                <td className="px-4 py-3"><Badge className={c.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>{c.isActive ? 'Live' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3">
                  {c.isOnboarding ? (
                    <Badge className="bg-info/10 text-info text-xs">Open {c.onboardingDate ? `(${new Date(c.onboardingDate).toLocaleDateString()})` : ''}</Badge>
                  ) : <span className="text-muted-foreground/50 text-xs">Closed</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => handleToggle(c)}>
                      {c.isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => handleToggleOnboarding(c)}>
                      {c.isOnboarding ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                      {c.isOnboarding ? 'Close' : 'Open'} Onboarding
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleDelete(c._id, c.name)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
            {cities.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-muted-foreground">No cities configured</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
