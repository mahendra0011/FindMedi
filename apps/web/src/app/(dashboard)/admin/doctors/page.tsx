/**
 * Manage Doctors — ported from client/src/pages/admin/AdminDoctors.jsx (Phase 4).
 * Doctor directory with add/edit/approve/remove and availability toggle.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Stethoscope, Search, Trash2, Plus, Star, Phone, Mail, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { doctors } from '@/lib/api';
import type { Doctor } from '@/types/models/doctor';

const specializations = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Oncology',
  'General Medicine',
  'ENT',
];

interface DoctorForm {
  name: string;
  specialization: string;
  experience: string;
  phone: string;
  email: string;
  qualifications: string;
  available: boolean;
}

const emptyForm: DoctorForm = {
  name: '',
  specialization: 'Cardiology',
  experience: '',
  phone: '',
  email: '',
  qualifications: '',
  available: true,
};

const onError = (msg: string) => () => toast.error(msg);

export default function DoctorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);

  const { data: doctorsData, isLoading: loading } = useQuery({
    queryKey: ['admin-doctors', search],
    queryFn: async (): Promise<Doctor[]> => {
      const res = await doctors.get({ ...(search ? { search } : {}), includeAll: 'true' });
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-doctors'] });

  const saveMut = useMutation({
    mutationFn: (body: { id?: string; form: DoctorForm }) =>
      body.id
        ? doctors.update(body.id, { ...body.form })
        : doctors.create({
            ...body.form,
            rating: 0,
            patients: 0,
            initials: body.form.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
          }),
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => doctors.delete(id),
    onSuccess: () => invalidate(),
  });

  const availabilityMut = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => doctors.update(id, { available }),
    onSuccess: () => invalidate(),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => doctors.approve(id),
    onSuccess: () => invalidate(),
  });

  const doctorList = doctorsData ?? [];

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    saveMut.mutate(
      { ...(editId ? { id: editId } : {}), form },
      { onSuccess: resetForm, onError: onError(editId ? 'Failed to update doctor' : 'Failed to create doctor') },
    );
  };

  const handleEdit = (doc: Doctor) => {
    setForm({
      name: doc.name,
      specialization: doc.specialization,
      experience: doc.experience,
      phone: doc.phone,
      email: doc.email,
      qualifications: doc.qualifications,
      available: doc.available,
    });
    setEditId(doc._id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Permanently delete this doctor?')) return;
    deleteMut.mutate(id, { onError: onError('Failed to delete doctor') });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Doctors</h1>
          <p className="text-muted-foreground">Add, edit, or remove doctors from the system</p>
        </div>
        <Button
          className="gap-2 w-full sm:w-auto"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Doctor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctors..." className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : doctorList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No doctors found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctorList.map((doc, i) => (
            <motion.div
              key={doc._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info font-bold text-lg flex-shrink-0 overflow-hidden">
                  {doc.profile_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (doc.initials ||
                      doc.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2))
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{doc.name}</h3>
                  <p className="text-sm text-info font-medium">{doc.specialization}</p>
                </div>
                <button
                  onClick={() => availabilityMut.mutate({ id: doc._id, available: !doc.available })}
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                >
                  {doc.available ? 'Available' : 'Unavailable'}
                </button>
              </div>
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-semibold ${doc.approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {doc.approved ? 'Admin approved' : 'Pending admin approval'}
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>{doc.experience} experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span>
                    {doc.rating} rating ({doc.patients} patients)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{doc.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{doc.email}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="flex-1 min-w-[88px]" onClick={() => handleEdit(doc)}>
                  Edit
                </Button>
                {!doc.approved && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[88px] gap-1 text-success hover:text-success"
                    onClick={() => approveMut.mutate(doc._id, { onError: onError('Failed to approve doctor') })}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[88px] gap-1 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(doc._id)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={resetForm}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4">{editId ? 'Edit Doctor' : 'Add New Doctor'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Full Name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                <select
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  {specializations.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Experience</label>
                <Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 10 years" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234-567-8901" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Qualifications</label>
                <Input
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                  placeholder="MBBS, MD"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="avail"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="avail" className="text-sm text-foreground">
                  Available for appointments
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={resetForm}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!form.name || !form.email}>
                <Save className="w-4 h-4" /> {editId ? 'Update' : 'Add Doctor'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
