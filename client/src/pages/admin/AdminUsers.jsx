import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Trash2, Shield, Stethoscope, UserRound, Ban, CheckCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({ search, role: roleFilter });
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try { await api.deleteUser(id); loadUsers(); } catch { toast.error('Failed to delete user'); }
  };

  const handleBlock = async (id) => {
    try { await api.blockUser(id); loadUsers(); } catch { toast.error('Failed to update user status'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Users</h1>
        <p className="text-muted-foreground">View, block, or remove user accounts</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'superadmin', 'admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'pharmacy_owner'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Admins</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-info" /></div>
          <div><p className="text-sm text-muted-foreground">Doctors</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'doctor').length}</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><UserRound className="w-5 h-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Patients</p><p className="font-heading text-xl font-bold">{users.filter(u => u.role === 'patient').length}</p></div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const RoleIcon = roleIcons[u.role] || UserRound;
                  return (
                    <tr key={u._id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex items-center gap-1 w-fit ${roleColors[u.role]}`}>
                          <RoleIcon className="w-3 h-3" /> {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleBlock(u._id)}>
                            {u.status === 'blocked' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {u.status === 'blocked' ? 'Unblock' : 'Block'}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(u._id)}>
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
        </div>
      )}
    </div>
  );
}