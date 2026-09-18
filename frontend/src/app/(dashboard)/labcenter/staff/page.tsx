/**
 * Staff Management — ported from client/src/pages/labcenter/LabStaff.jsx (Phase 4).
 * Lab team directory with add/edit/remove.
 */
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Shield, Plus, X, Save, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useLabStaff, useCreateLabStaff, useUpdateLabStaff, useDeleteLabStaff } from '@/features/lab-staff/hooks';
import type { LabStaffForm } from '@/features/lab-staff/types';

const emptyForm: LabStaffForm = {
  name: '',
  role: '',
  email: '',
  phone: '',
  department: '',
  qualification: '',
  status: 'Active',
  joinDate: '',
};

const formFields: { key: keyof LabStaffForm; label: string; type?: string }[] = [
  { key: 'name', label: 'Full Name' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'department', label: 'Department' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'joinDate', label: 'Join Date', type: 'date' },
];

const onError = (e: Error) => toast.error(e.message);

export default function StaffPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<LabStaffForm>(emptyForm);

  const { data: staffData, isLoading: loading } = useLabStaff();
  const createMut = useCreateLabStaff();
  const updateMut = useUpdateLabStaff();
  const deleteMut = useDeleteLabStaff();

  const staffList = staffData ?? [];

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.role) {
      toast.error('Name and Role are required');
      return;
    }
    const done = () => {
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    };
    if (editId) {
      updateMut.mutate(
        { id: editId, ...form },
        { onSuccess: () => {
          toast.success('Staff updated');
          done();
        }, onError },
      );
    } else {
      createMut.mutate(form, {
        onSuccess: () => {
          toast.success('Staff added');
          done();
        },
        onError,
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Staff removed'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove staff'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground mt-1">{staffList.length} team members</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h2 className="font-bold text-lg mb-4">{editId ? 'Edit Staff' : 'Add New Staff'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formFields.map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium mb-1 block">{f.label}</label>
                  <Input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.key === 'name' || f.key === 'role'}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
                >
                  {['Active', 'On Leave', 'Inactive'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                <Button type="submit">
                  <Save className="w-4 h-4 mr-1" /> {editId ? 'Update' : 'Add'} Staff
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No staff members yet</p>
          <p className="text-sm mt-1">Click &quot;Add Staff&quot; to add your first team member</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => (
            <motion.div
              key={staff._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-bold text-lg">
                    {staff.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{staff.name}</p>
                  <p className="text-sm text-primary">{staff.role}</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {staff.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {staff.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" /> {staff.department}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" /> {staff.qualification}
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <Badge
                    variant="outline"
                    className={
                      staff.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : staff.status === 'On Leave'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-muted text-muted-foreground'
                    }
                  >
                    {staff.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setForm({
                          name: staff.name,
                          role: staff.role ?? '',
                          email: staff.email ?? '',
                          phone: staff.phone ?? '',
                          department: staff.department ?? '',
                          qualification: staff.qualification ?? '',
                          status: staff.status ?? 'Active',
                          joinDate: staff.joinDate ?? '',
                        });
                        setEditId(staff._id);
                        setShowForm(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(staff._id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this staff member? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
