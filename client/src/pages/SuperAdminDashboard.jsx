import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Building2, Building, CheckCircle, XCircle, AlertTriangle,
  Clock, TrendingUp, Users, Ban, Search, Mail, MapPin, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

const TABS = [
  { key: 'pending', label: 'Pending Approvals', icon: Clock },
  { key: 'all', label: 'All Hospitals', icon: Building2 },
  { key: 'facilities', label: 'Facilities', icon: Building },
  { key: 'stats', label: 'Platform Stats', icon: TrendingUp },
];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [pendingFacilities, setPendingFacilities] = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityRejectingId, setFacilityRejectingId] = useState(null);
  const [facilityRejectReason, setFacilityRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pending, all] = await Promise.all([
        api.getPendingHospitals(),
        api.getHospitals({}),
      ]);
      setPendingHospitals(pending || []);
      setAllHospitals(all || []);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await api.approveHospital(id);
      toast.success('Hospital approved successfully');
      fetchData();
    } catch {
      toast.error('Failed to approve hospital');
    }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.rejectHospital(id, { reason: rejectReason });
      toast.success('Hospital rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch {
      toast.error('Failed to reject hospital');
    }
  }

  async function handleSuspend(id) {
    try {
      await api.suspendHospital(id);
      toast.success('Hospital suspended');
      fetchData();
    } catch {
      toast.error('Failed to suspend hospital');
    }
  }

  async function fetchFacilities(type) {
    setFacilityLoading(true);
    try {
      const data = await api.getPendingFacilities(type || '');
      setPendingFacilities(data || []);
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      setFacilityLoading(false);
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

  useEffect(() => {
    if (activeTab === 'facilities') {
      fetchFacilities(facilityType);
    }
  }, [activeTab, facilityType]);

  const FACILITY_TYPES = [
    { key: '', label: 'All' },
    { key: 'hospital', label: 'Hospital' },
    { key: 'clinic', label: 'Clinic' },
    { key: 'lab', label: 'Lab' },
    { key: 'pharmacy', label: 'Pharmacy' },
  ];

  const filteredHospitals = allHospitals.filter(h => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      h.name?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: allHospitals.length,
    approved: allHospitals.filter(h => h.status === 'approved').length,
    pending: allHospitals.filter(h => h.status === 'pending').length,
    rejected: allHospitals.filter(h => h.status === 'rejected').length,
    suspended: allHospitals.filter(h => h.status === 'suspended').length,
  };

  const maxStat = Math.max(stats.approved, stats.pending, stats.rejected, stats.suspended, 1);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">
            Manage hospitals across the <span className="font-semibold text-foreground">MediCore</span> platform
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-sm text-primary font-medium">
          <Shield className="w-4 h-4" />
          Super Admin
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {loading ? (
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
          ) : pendingHospitals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">All Caught Up</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No pending hospital registrations. New registrations will appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pendingHospitals.map((hospital, i) => (
                <motion.div
                  key={hospital._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <Badge className="bg-warning/10 text-warning border-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>

                      <h3 className="font-heading font-semibold text-lg text-foreground mb-3">
                        {hospital.name}
                      </h3>

                      <div className="space-y-2 mb-5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{hospital.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>License: {hospital.licenseNumber}</span>
                        </div>
                      </div>

                      {hospital.description && (
                        <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
                          {hospital.description}
                        </p>
                      )}

                      {rejectingId === hospital._id ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(hospital._id)}
                              className="gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejectingId(null); setRejectReason(''); }}
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
                            onClick={() => handleApprove(hospital._id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            onClick={() => setRejectingId(hospital._id)}
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
        </motion.div>
      )}

      {/* All Hospitals Tab */}
      {activeTab === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
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
                    <motion.tr
                      key={h._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
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
                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Type filter */}
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
        </motion.div>
      )}

      {/* Platform Stats Tab */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Hospitals', value: stats.total, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
              { label: 'Suspended', value: stats.suspended, icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted-foreground/10' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  No hospitals registered yet
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Approved', value: stats.approved, color: 'bg-success' },
                    { label: 'Pending', value: stats.pending, color: 'bg-warning' },
                    { label: 'Rejected', value: stats.rejected, color: 'bg-destructive' },
                    { label: 'Suspended', value: stats.suspended, color: 'bg-muted-foreground' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / maxStat) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
