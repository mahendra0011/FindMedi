import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, Clock, CalendarDays, Activity, Search, 
  Map, User, Siren, ShieldCheck, ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AmbulanceJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, completed, cancelled, active
  const LIMIT = 20;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const r: any = await api.get(`/ambulance/me/jobs?page=${p}&limit=${LIMIT}`);
      setJobs(r.jobs || r.data || []);
      setTotal(r.total || r.count || 0);
      setPage(r.page || p);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const filteredJobs = jobs.filter(j => {
    if (filter !== 'all' && j.status !== filter) return false;
    if (search) {
      const term = search.toLowerCase();
      const patient = (j.patientDetails?.name || '').toLowerCase();
      const address = (j.location?.address || '').toLowerCase();
      const id = (j._id || '').toLowerCase();
      return patient.includes(term) || address.includes(term) || id.includes(term);
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      case 'active':
      case 'en_route':
      case 'arrived': return 'bg-blue-500/10 text-blue-600 border-blue-200 animate-pulse';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const maxPage = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-rose-500" />
            Job History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review your past emergency dispatches and transfers.</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Total Jobs: {total}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Patient, Address or ID..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {['all', 'completed', 'active', 'cancelled'].map(f => (
            <Button 
              key={f} 
              variant={filter === f ? 'default' : 'outline'} 
              size="sm" 
              className="capitalize shrink-0"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-4 text-center border-dashed bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Siren className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold">No jobs found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {search || filter !== 'all' ? 'Try adjusting your search filters.' : 'You have not completed any ambulance jobs yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((j, i) => (
            <motion.div 
              key={j._id} 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
            >
              <Card className="hover:border-rose-500/30 hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`capitalize ${getStatusColor(j.status)}`}>
                          {j.status?.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {j.category || j.type || 'Emergency Dispatch'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto md:ml-2">ID: {j._id?.slice(-6).toUpperCase()}</span>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {j.patientDetails?.name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{j.location?.address || j.pickupLocation || 'Pickup location unavailable'}</span>
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 shrink-0" />
                            {new Date(j.createdAt || j.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            {new Date(j.createdAt || j.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 min-w-[120px]">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Earnings</p>
                        <p className="text-lg font-black text-foreground">{inr(j.fare || j.amount || 0)}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="hidden md:flex mt-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                        Details <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                  
                  {j.hospitalDestination && (
                    <div className="bg-muted/50 p-3 px-4 border-t border-border flex items-center gap-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">Dropoff:</span> {j.hospitalDestination}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && maxPage > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>← Previous</Button>
          <span className="text-sm font-medium text-muted-foreground">Page {page} of {maxPage}</span>
          <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => load(page + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
