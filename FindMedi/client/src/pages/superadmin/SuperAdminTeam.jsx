import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, UserRound, ShieldCheck, ShieldOff, Trash2, Mail, Clock,
  Search, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function SuperAdminTeam() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({ role: 'superadmin', limit: 100 });
      setAdmins(res?.users || res?.data || res || []);
    } catch { toast.error('Failed to load team'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggleBlock = async (id, name) => {
    try {
      await api.blockUser(id);
      toast.success(`User ${name} status toggled`);
      load();
    } catch { toast.error('Failed to update user'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name}?`)) return;
    try {
      await api.deleteUser(id);
      toast.success(`${name} deleted`);
      load();
    } catch { toast.error('Failed to delete user'); }
  };

  const filtered = admins.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Super Admin Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform administrators</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs px-3 py-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          {admins.length} Admin{admins.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search admins..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((admin, i) => (
          <motion.div key={admin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`overflow-hidden ${admin.status === 'blocked' ? 'opacity-60' : ''}`}>
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{admin.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Mail className="w-3 h-3" />
                          {admin.email}
                        </div>
                      </div>
                    </div>
                    <Badge className={`text-[10px] ${admin.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                      {admin.status === 'blocked' ? 'Blocked' : 'Active'}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Role: {admin.role}</span>
                    <span className="mx-1">·</span>
                    <span>{admin.isVerified ? 'Verified' : 'Not verified'}</span>
                  </div>
                </div>

                <div className="flex border-t">
                  <button onClick={() => handleToggleBlock(admin.id, admin.name)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${admin.status === 'blocked' ? 'text-success hover:bg-success/5' : 'text-destructive hover:bg-destructive/5'}`}>
                    {admin.status === 'blocked' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                    {admin.status === 'blocked' ? 'Unblock' : 'Block'}
                  </button>
                  <div className="w-px bg-border" />
                  <button onClick={() => handleDelete(admin.id, admin.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No super admins found</div>
        )}
      </div>
    </div>
  );
}
