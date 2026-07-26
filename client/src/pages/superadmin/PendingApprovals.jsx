import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Building2, CheckCircle, XCircle, Mail, MapPin, FileText } from 'lucide-react';
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

export default function PendingApprovals() {
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    setLoading(true);
    try {
      const data = await api.getPendingHospitals();
      setPendingHospitals(data?.hospitals || data?.data || data || []);
    } catch {
      toast.error('Failed to load pending hospitals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await api.approveHospital(id);
      toast.success('Hospital approved successfully');
      fetchPending();
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
      fetchPending();
    } catch {
      toast.error('Failed to reject hospital');
    }
  }

  return (
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
  );
}
