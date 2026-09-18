import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Building, Search, Ban, Trash2, ChevronDown, ChevronRight,
  UserRound, Clock, CheckCircle, XCircle, Mail, MapPin, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

const statusColors = {
  approved: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted-foreground/10 text-muted-foreground',
};

const planColors = {
  premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const FACILITY_TYPES = [
  { key: '', label: 'All' },
  { key: 'hospital', label: 'Hospital' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'lab', label: 'Lab' },
  { key: 'pharmacy', label: 'Pharmacy' },
];

const SUB_TABS = [
  { key: 'hospitals', label: 'Hospitals' },
  { key: 'facilities', label: 'Facilities' },
];

export default function AllFacilities() {
  const [subTab, setSubTab] = useState('hospitals');
  const [allHospitals, setAllHospitals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [facilityType, setFacilityType] = useState('');
  const [pendingFacilities, setPendingFacilities] = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityRejectingId, setFacilityRejectingId] = useState(null);
  const [facilityRejectReason, setFacilityRejectReason] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  async function fetchHospitals() {
    setLoading(true);
    try {
      const data = await api.getHospitals({});
      setAllHospitals(data?.hospitals || data?.data || data || []);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (subTab === 'facilities') {
      fetchFacilities(facilityType);
    }
  }, [subTab, facilityType]);

  async function fetchFacilities(type) {
    setFacilityLoading(true);
    try {
      const data = await api.getPendingFacilities(type || '');
      setPendingFacilities(data?.facilities || data?.data || data || []);
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      setFacilityLoading(false);
    }
  }

  async function handleSuspend(id) {
    if (!confirm('Suspend this hospital?')) return;
    try {
      await api.suspendHospital(id);
      toast.success('Hospital suspended');
      fetchHospitals();
    } catch {
      toast.error('Failed to suspend hospital');
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteHospital(id);
      toast.success('Hospital permanently deleted');
      setDeleteConfirmId(null);
      if (expandedHospitalId === id) {
        setExpandedHospitalId(null);
        setHospitalDoctors([]);
      }
      fetchHospitals();
    } catch {
      toast.error('Failed to delete hospital');
    }
  }

  async function toggleExpand(hospitalId) {
    if (expandedHospitalId === hospitalId) {
      setExpandedHospitalId(null);
      setHospitalDoctors([]);
      return;
    }
    setExpandedHospitalId(hospitalId);
    setDoctorsLoading(true);
    try {
      const data = await api.getDoctors({ hospitalId });
      setHospitalDoctors(data?.doctors || data?.data || data || []);
    } catch {
      setHospitalDoctors([]);
      toast.error('Failed to load doctors');
    } finally {
      setDoctorsLoading(false);
    }
  }

  async function handleApproveFacility(id) {
    try {
      await api.approveFacility(id);
      toast.success('Facility approved successfully');
      fetchFacilities(facilityType);
    } catch {
      toast.error('Failed to approve facility');
    }
  }

  async function handleRejectFacility(id) {
    if (!facilityRejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.rejectFacility(id, { reason: facilityRejectReason });
      toast.success('Facility rejected');
      setFacilityRejectingId(null);
      setFacilityRejectReason('');
      fetchFacilities(facilityType);
    } catch {
      toast.error('Failed to reject facility');
    }
  }

  const filteredHospitals = allHospitals.filter(h => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      h.name?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.email?.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-5 w-fit">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hospitals Sub-tab */}
      {subTab === 'hospitals' && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredHospitals.length} of {allHospitals.length} hospitals
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Hospital</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">City</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Plan</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Created</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {searchTerm ? 'No hospitals match your search' : 'No hospitals registered yet'}
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((h, i) => (
                    <React.Fragment key={h._id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(h._id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {expandedHospitalId === h._id
                              ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                            }
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{h.name}</p>
                              <p className="text-xs text-muted-foreground">{h.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{h.city}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[h.status] || 'bg-muted text-muted-foreground'}`}>
                            {h.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                            {h.status === 'pending' && <Clock className="w-3 h-3" />}
                            {h.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {h.status === 'suspended' && <Ban className="w-3 h-3" />}
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planColors[h.subscriptionPlan] || 'bg-muted text-muted-foreground'}`}>
                            {h.subscriptionPlan || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {h.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                                onClick={() => handleSuspend(h._id)}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Suspend
                              </Button>
                            )}
                            {deleteConfirmId === h._id ? (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(h._id)}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                                onClick={() => setDeleteConfirmId(h._id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {expandedHospitalId === h._id && (
                        <tr key={`${h._id}-doctors`} className="bg-muted/20 border-b">
                          <td colSpan={6} className="px-4 py-4">
                            {doctorsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Loading doctors...
                              </div>
                            ) : hospitalDoctors.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No doctors found for this hospital</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                  Doctors ({hospitalDoctors.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {hospitalDoctors.map(doc => (
                                    <div key={doc._id} className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <UserRound className="w-3.5 h-3.5 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{doc.specialization}</p>
                                      </div>
                                      <span className={`ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                        {doc.available ? 'Available' : 'Unavailable'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Facilities Sub-tab */}
      {subTab === 'facilities' && (
        <>
          <div className="flex gap-2 mb-5">
            {FACILITY_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setFacilityType(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  facilityType === t.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {facilityLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-3" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingFacilities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">All Caught Up</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No pending facility registrations for this type.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pendingFacilities.map((facility, i) => (
                <motion.div
                  key={facility._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-warning/10 text-warning border-0">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <Badge className="bg-primary/10 text-primary border-0 capitalize">
                            {facility.type || 'hospital'}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-heading font-semibold text-lg text-foreground mb-3">
                        {facility.name}
                      </h3>

                      <div className="space-y-2 mb-5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{facility.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{facility.city}{facility.state ? `, ${facility.state}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{facility.createdAt ? new Date(facility.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </div>
                      </div>

                      {facilityRejectingId === facility._id ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Reason for rejection..."
                            value={facilityRejectReason}
                            onChange={e => setFacilityRejectReason(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectFacility(facility._id)}
                              className="gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setFacilityRejectingId(null); setFacilityRejectReason(''); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success hover:bg-success/90 gap-1.5"
                            onClick={() => handleApproveFacility(facility._id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            onClick={() => setFacilityRejectingId(facility._id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
