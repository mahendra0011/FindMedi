import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Search, Percent, DollarSign, CalendarDays, Users, CheckCircle, XCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function Promotions() {
  const [tab, setTab] = useState('coupons');
  const [coupons, setCoupons] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrderValue: 0, maxDiscount: 0, usageLimit: 0, applicableServices: ['all'], validFrom: '', validUntil: '' });
  const [listForm, setListForm] = useState({ facilityId: '', facilityType: 'hospital', facilityName: '', startDate: '', endDate: '', placement: 'homepage' });
  const [showListForm, setShowListForm] = useState(false);
  const [stats, setStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, lRes, sRes] = await Promise.all([
        api.getPlatformCoupons({ search }),
        api.getFeaturedListings({}),
        api.getPlatformCouponStats().catch(() => null),
      ]);
      setCoupons(cRes.coupons || []);
      setListings(lRes.listings || []);
      setStats(sRes);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.createPlatformCoupon(form);
      toast.success('Coupon created');
      setShowForm(false);
      setForm({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrderValue: 0, maxDiscount: 0, usageLimit: 0, applicableServices: ['all'], validFrom: '', validUntil: '' });
      load();
    } catch (err) { toast.error(err?.message || 'Failed to create coupon'); }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      await api.createFeaturedListing(listForm);
      toast.success('Featured listing created');
      setShowListForm(false);
      setListForm({ facilityId: '', facilityType: 'hospital', facilityName: '', startDate: '', endDate: '', placement: 'homepage' });
      load();
    } catch (err) { toast.error(err?.message || 'Failed to create listing'); }
  };

  const handleToggleCoupon = async (c) => {
    try {
      await api.updatePlatformCoupon(c._id, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Coupon deactivated' : 'Coupon activated');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Remove this featured listing?')) return;
    try { await api.deleteFeaturedListing(id); load(); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Marketing & Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide coupons & featured listings</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button onClick={() => setTab('coupons')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'coupons' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Tag className="w-4 h-4" /> Coupons
        </button>
        <button onClick={() => setTab('featured')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'featured' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Star className="w-4 h-4" /> Featured Listings
        </button>
      </div>

      {tab === 'coupons' && (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3"><Tag className="w-5 h-5 text-primary" /><div><p className="text-xs text-muted-foreground">Total Coupons</p><p className="text-xl font-bold">{stats.total}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="w-5 h-5 text-success" /><div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{stats.active}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><Users className="w-5 h-5 text-info" /><div><p className="text-xs text-muted-foreground">Total Uses</p><p className="text-xl font-bold">{stats.totalUses}</p></div></CardContent></Card>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search coupons..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2"><Plus className="w-4 h-4" /> New Coupon</Button>
          </div>

          {showForm && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-sm">Create Platform Coupon</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="text-xs font-medium mb-1 block">Code</label><Input placeholder="SAVE20" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">Description</label><Input placeholder="20% off on all services" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  <div><label className="text-xs font-medium mb-1 block">Type</label><select className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                  <div><label className="text-xs font-medium mb-1 block">Value</label><Input type="number" placeholder="20" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">Min Order</label><Input type="number" placeholder="0" value={form.minOrderValue} onChange={e => setForm({...form, minOrderValue: Number(e.target.value)})} /></div>
                  <div><label className="text-xs font-medium mb-1 block">Max Discount</label><Input type="number" placeholder="0" value={form.maxDiscount} onChange={e => setForm({...form, maxDiscount: Number(e.target.value)})} /></div>
                  <div><label className="text-xs font-medium mb-1 block">Valid From</label><Input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">Valid Until</label><Input type="date" value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})} required /></div>
                  <div className="col-span-full flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit">Create Coupon</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Discount</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Used</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Valid</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th></tr></thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3"><span className="font-mono font-bold text-foreground">{c.code}</span></td>
                    <td className="px-4 py-3">{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.usedCount}{c.usageLimit > 0 ? `/${c.usageLimit}` : ''}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.validFrom).toLocaleDateString()} - {new Date(c.validUntil).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge className={c.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => handleToggleCoupon(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</Button></td>
                  </tr>
                ))}
                {coupons.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-muted-foreground">No coupons yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'featured' && (
        <>
          <div className="flex justify-end"><Button onClick={() => setShowListForm(!showListForm)} className="gap-2"><Plus className="w-4 h-4" /> Add Featured Listing</Button></div>

          {showListForm && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-sm">New Featured Listing</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateListing} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium mb-1 block">Facility Name</label><Input value={listForm.facilityName} onChange={e => setListForm({...listForm, facilityName: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">Facility ID</label><Input value={listForm.facilityId} onChange={e => setListForm({...listForm, facilityId: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">Type</label><select className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm" value={listForm.facilityType} onChange={e => setListForm({...listForm, facilityType: e.target.value})}><option value="hospital">Hospital</option><option value="clinic">Clinic</option><option value="lab">Lab</option><option value="pharmacy">Pharmacy</option></select></div>
                  <div><label className="text-xs font-medium mb-1 block">Placement</label><select className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm" value={listForm.placement} onChange={e => setListForm({...listForm, placement: e.target.value})}><option value="homepage">Homepage</option><option value="category">Category</option><option value="search">Search</option></select></div>
                  <div><label className="text-xs font-medium mb-1 block">Start Date</label><Input type="date" value={listForm.startDate} onChange={e => setListForm({...listForm, startDate: e.target.value})} required /></div>
                  <div><label className="text-xs font-medium mb-1 block">End Date</label><Input type="date" value={listForm.endDate} onChange={e => setListForm({...listForm, endDate: e.target.value})} required /></div>
                  <div className="col-span-full flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowListForm(false)}>Cancel</Button>
                    <Button type="submit">Create Listing</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map(l => (
              <Card key={l._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div><p className="font-medium text-foreground">{l.facilityName || l.facilityId}</p><Badge variant="outline" className="text-xs mt-1">{l.facilityType}</Badge></div>
                    <Badge className={l.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>{l.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <Star className="w-3 h-3" /> {l.placement}
                    <span>·</span>
                    {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleDeleteListing(l._id)}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {listings.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No featured listings</div>}
          </div>
        </>
      )}
    </div>
  );
}
