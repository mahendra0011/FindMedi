/**
 * Manage Users — ported from client/src/pages/admin/AdminUsers.jsx (Phase 4).
 * Role-filtered user directory with block/unblock and delete.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, Shield, Stethoscope, UserRound, Ban, CheckCircle, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { users } from '@/lib/api';
import type { User } from '@/types/models/user';

const roleColors: Record<string, string> = {
  superadmin: 'bg-destructive/10 text-destructive',
  admin: 'bg-primary/10 text-primary',
  doctor: 'bg-info/10 text-info',
  clinic_doctor: 'bg-info/10 text-info',
  patient: 'bg-success/10 text-success',
  lab_owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pharmacy_owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const roleIcons: Record<string, LucideIcon> = {
  superadmin: Shield,
  admin: Shield,
  doctor: Stethoscope,
  clinic_doctor: Stethoscope,
  patient: UserRound,
  lab_owner: Activity,
  pharmacy_owner: Activity,
};

const allRoleFilters = ['All', 'superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'pharmacy_owner'];
const hospitalRoleFilters = [
  'All',
  'hospital_admin',
  'doctor',
  'patient',
  'nurse',
  'radiologist',
  'dietitian',
  'physiotherapist',
  'counselor',
  'accountant',
  'security',
  'technician',
  'helper',
];

const onError = (msg: string) => () => toast.error(msg);

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const isSuperAdmin = user?.role === 'superadmin';
  const roleFilters = isSuperAdmin ? allRoleFilters : hospitalRoleFilters;

  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async (): Promise<User[]> => {
      const res = await users.get({
        ...(search ? { search } : {}),
        ...(roleFilter === 'All' ? {} : { role: roleFilter }),
      });
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => users.delete(id),
    onSuccess: () => invalidate(),
  });

  const blockMut = useMutation({
    mutationFn: (id: string) => users.block(id),
    onSuccess: () => invalidate(),
  });

  const usersList = usersData ?? [];

  const handleDelete = (id: string) => {
    if (!confirm('Permanently delete this user?')) return;
    deleteMut.mutate(id, { onError: onError('Failed to delete user') });
  };

  const handleBlock = (id: string, currentlyBlocked: boolean) => {
    if (!confirm(currentlyBlocked ? 'Unblock this user?' : 'Block this user?')) return;
    blockMut.mutate(id, { onError: onError('Failed to update user status') });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isSuperAdmin ? 'Manage Users' : 'Manage Hospital Staff'}</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin ? 'View, block, or remove user accounts' : 'View, block, or remove hospital staff accounts'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {roleFilters.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-xl font-bold">{usersList.filter((u) => u.role === 'hospital_admin').length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Doctors</p>
            <p className="text-xl font-bold">{usersList.filter((u) => u.role === 'doctor').length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Patients</p>
            <p className="text-xl font-bold">{usersList.filter((u) => u.role === 'patient').length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : usersList.length === 0 ? (
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
                {usersList.map((u) => {
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
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex items-center gap-1 w-fit ${roleColors[u.role] ?? ''}`}
                        >
                          <RoleIcon className="w-3 h-3" /> {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}
                        >
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleBlock(u._id, u.status === 'blocked')}
                          >
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
