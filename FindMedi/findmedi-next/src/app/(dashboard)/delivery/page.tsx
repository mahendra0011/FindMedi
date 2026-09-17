'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Package, IndianRupee, Star, TrendingUp, Bike, Wifi, WifiOff,
  MapPin, Clock, Phone, CheckCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';

interface DeliveryProfile {
  _id: string;
  name?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  status?: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  city?: string;
  availability?: string;
  phone?: string;
  rating?: number | string;
  totalDeliveries?: number;
}

interface DeliveryTask {
  _id: string;
  orderId?: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  deliveryOtp?: string;
  orderRef?: {
    phone?: string;
    total?: number;
  };
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [deliveries, setDeliveries] = useState<{ active: DeliveryTask[]; history: DeliveryTask[] }>({
    active: [],
    history: [],
  });
  const [deliveryTab, setDeliveryTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!user?._id) return;

    const loadData = async () => {
      try {
        const [prof, dels] = await Promise.allSettled([
          api.getDeliveryProfile(),
          api.getMyDeliveries(),
        ]);
        if (!mounted.current) return;

        if (prof.status === 'fulfilled') {
          setProfile(prof.value);
        }
        if (dels.status === 'fulfilled') {
          const val = dels.value;
          setDeliveries({
            active: Array.isArray(val?.active) ? val.active : [],
            history: Array.isArray(val?.history) ? val.history : [],
          });
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load delivery dashboard');
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    loadData();
    const userId = user?._id || '';
    const cleanup = joinRoom('join', userId);

    return () => {
      mounted.current = false;
      cleanup();
    };
  }, [user]);

  const toggleOnline = async (online: boolean) => {
    if (!profile?._id) return;
    try {
      await api.updateDeliveryProfile(profile._id, { isOnline: online, isAvailable: online });
      setProfile(p => p ? { ...p, isOnline: online, isAvailable: online } : null);
      getSocket().emit('deliveryboy:online', { deliveryPartnerId: profile._id, online });
      toast.success(online ? 'You are now online' : 'You are now offline');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  const updateStatus = async (deliveryId: string, status: string) => {
    try {
      await api.updateDeliveryStatus(deliveryId, status);
      const dels = await api.getMyDeliveries();
      if (mounted.current && dels) {
        setDeliveries({
          active: Array.isArray(dels.active) ? dels.active : [],
          history: Array.isArray(dels.history) ? dels.history : [],
        });
      }
      toast.success(`Status updated to ${status}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayEarnings = deliveries.history.reduce((s, d) => s + (d.orderRef?.total || 0), 0);

  const stats = [
    { icon: Package, label: "Today's Deliveries", value: deliveries.active.length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { icon: IndianRupee, label: "Today's Earnings", value: `₹${todayEarnings.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { icon: Star, label: 'Rating', value: profile?.rating || '5.0', color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { icon: TrendingUp, label: 'Total Deliveries', value: profile?.totalDeliveries || deliveries.history.length, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Delivery Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {profile?.name || user?.name}! Stay safe on the road.</p>
        </div>
        <Button
          onClick={() => toggleOnline(!profile?.isOnline)}
          className={`gap-2 rounded-xl transition-all ${profile?.isOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
        >
          {profile?.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {profile?.isOnline ? 'Online (Ready)' : 'Go Online'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{profile?.name || user?.name || 'Delivery Agent'}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {profile?.vehicleType || 'Motorbike'} • {profile?.vehicleNumber || 'KA-01-AB-1234'}
            </p>
            <Badge variant={profile?.status === 'approved' ? 'default' : 'secondary'} className="mt-1 text-xs">
              {profile?.status || 'Active'}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{profile?.city || 'Bangalore'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>{profile?.availability || 'Full Time'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 text-blue-500" />
            <span>{profile?.phone || user?.phone || 'Contact Verified'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{profile?.rating || '5.0'} Rating</span>
          </div>
        </div>
      </div>

      {/* Orders Hub */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Delivery Orders Hub</h2>
            <p className="text-xs text-muted-foreground">Manage active pickup/drop tasks and delivery history</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50">
            <button
              type="button"
              onClick={() => setDeliveryTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deliveryTab === 'active'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Active Orders</span>
              {deliveries.active?.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${deliveryTab === 'active' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                  {deliveries.active.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                deliveryTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Completed History</span>
              {deliveries.history?.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${deliveryTab === 'history' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                  {deliveries.history.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {deliveryTab === 'active' && (
          <div>
            {deliveries.active.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-sm">No active delivery tasks</p>
                <p className="text-xs text-muted-foreground/70 mt-1">New delivery orders in your zone will show up here automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.active.map(d => (
                  <motion.div
                    key={d._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted/20 rounded-2xl border border-border/60 p-5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">Order #{d.orderId || d._id?.slice(-6)}</p>
                        <Badge className="mt-1">{d.status}</Badge>
                      </div>
                      {d.orderRef?.phone && (
                        <a
                          href={`tel:${d.orderRef.phone}`}
                          className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <span><strong>Pickup:</strong> {d.pickupAddress || 'Pharmacy Partner Store'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                        <span><strong>Drop:</strong> {d.dropAddress || 'Customer Residence'}</span>
                      </div>
                      {d.deliveryOtp && (
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Package className="w-4 h-4 text-emerald-500" /> OTP: {d.deliveryOtp}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {d.status === 'Assigned' && (
                        <Button size="sm" onClick={() => updateStatus(d._id, 'Picked Up')} className="gap-1 rounded-xl">
                          <Package className="w-4 h-4" /> Picked Up
                        </Button>
                      )}
                      {d.status === 'Picked Up' && (
                        <Button size="sm" onClick={() => updateStatus(d._id, 'Out for Delivery')} className="gap-1 rounded-xl">
                          <Bike className="w-4 h-4" /> Out for Delivery
                        </Button>
                      )}
                      {d.status === 'Out for Delivery' && (
                        <Button size="sm" onClick={() => updateStatus(d._id, 'Delivered')} className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle className="w-4 h-4" /> Delivered
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {deliveryTab === 'history' && (
          <div>
            {deliveries.history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-sm">No completed deliveries yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Delivered orders will appear in your delivery history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.history.map((d, idx) => (
                  <div key={d._id || idx} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                    <div>
                      <p className="font-semibold text-sm text-foreground">Order #{d.orderId || d._id?.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Delivered to: {d.dropAddress || 'Customer'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                        Delivered
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!profile?.isOnline && (
        <div className="bg-muted/20 border border-dashed rounded-2xl p-6 text-center">
          <WifiOff className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground font-medium">You are currently offline</p>
          <p className="text-xs text-muted-foreground mt-1">Go online to start receiving instant delivery assignments</p>
          <Button onClick={() => toggleOnline(true)} className="mt-4 gap-2 rounded-xl">
            <Wifi className="w-4 h-4" /> Go Online
          </Button>
        </div>
      )}
    </div>
  );
}
