import React, { useState, useCallback, useEffect } from 'react';
import { Search, Shield, Stethoscope, UserRound, CheckCircle, Ban, Trash2, Activity, Flag, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showFlagged, setShowFlagged] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, role: roleFilter };
      if (showFlagged) params.flagged = 'true';
      const data = await api.getUsers(params);
      setUsers(data?.users || data?.data || data || []);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [search, roleFilter, showFlagged]);

  useEffect(() => { loadUsers(); }, [search, roleFilter, showFlagged]);

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try { await api.deleteUser(id); loadUsers(); } catch { toast.error('Failed to delete user'); }
  };

  const handleBlock = async (id) => {
    if (!confirm('Toggle block status for this user?')) return;
    try { await api.blockUser(id); loadUsers(); } catch { toast.error('Failed to update user status'); }
  };

  const handleFlag = async (id, name) => {
    const reason = prompt(`Flag ${name} as suspicious? Enter reason:`);
    if (!reason) return;
    try { await api.flagUser(id, { reason }); toast.success('User flagged'); loadUsers(); } catch { toast.error('Failed to flag user'); }
  };

  const handleUnflag = async (id) => {
    try { await api.unflagUser(id); toast.success('User unflagged'); loadUsers(); } catch { toast.error('Failed to unflag user'); }
  };

  const roleColors = {
    superadmin: 'bg-destructive/10 text-destructive',
    admin: 'bg-primary/10 text-primary',
    doctor: 'bg-info/10 text-info',
    clinic_doctor: 'bg-info/10 text-info',
    patient: 'bg-success/10 text-success',
    lab_owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    pharmacy_owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const roleIcons = { superadmin: Shield, admin: Shield, doctor: Stethoscope, clinic_doctor: Stethoscope, patient: UserRound, lab_owner: Activity, pharmacy_owner: Activity };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all platform users — view, block, flag suspicious accounts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
        </div>
        <Button variant={showFlagged ? 'default' : 'outline'} size="sm" onClick={() => setShowFlagged(!showFlagged)} className="gap-2">
          <Flag className="w-4 h-4" />
          {showFlagged ? 'All Users' : 'Flagged Only'}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'superadmin', 'admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'pharmacy_owner'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Admins</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p></div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-info" /></div>
          <div><p className="text-xs text-muted-foreground">Doctors</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'doctor' || u.role === 'clinic_doctor').length}</p></div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><UserRound className="w-5 h-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Patients</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'patient').length}</p></div>
        </div>
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Flag className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Flagged</p><p className="font-heading text-xl font-bold">{users.filter(u => u.flagged).length}</p></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Flag</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const RoleIcon = roleIcons[u.role] || UserRound;
                return (
                  <tr key={u.id || u._id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${u.flagged ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex items-center gap-1 w-fit ${roleColors[u.role] || 'bg-muted text-muted-foreground'}`}>
                        <RoleIcon className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.flagged ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                            <Flag className="w-3 h-3" /> Flagged
                          </Badge>
                          {u.flagReason && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{u.flagReason}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {u.flagged ? (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => handleUnflag(u.id || u._id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Unflag
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => handleFlag(u.id || u._id, u.name)}>
                            <Flag className="w-3.5 h-3.5" /> Flag
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className={`gap-1 text-xs h-8 ${u.status === 'blocked' ? 'text-success' : ''}`} onClick={() => handleBlock(u.id || u._id)}>
                          {u.status === 'blocked' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {u.status === 'blocked' ? 'Unblock' : 'Block'}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-8 text-destructive" onClick={() => handleDelete(u.id || u._id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
