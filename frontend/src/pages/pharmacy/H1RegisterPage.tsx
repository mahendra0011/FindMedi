import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  FileText,
  AlertTriangle,
  Download,
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  FileCheck,
} from 'lucide-react';

interface H1Entry {
  _id: string;
  prescriptionNo: string;
  patientName: string;
  prescriberName: string;
  medicineName: string;
  rxSchedule: string;
  quantity: number;
  dispensedByName: string;
  dispensedAt: string;
}

interface H1Gap {
  prescriptionId: string;
  prescriptionNo: string;
  medicineId: string;
  medicineName: string;
}

export default function H1RegisterPage() {
  const [entries, setEntries] = useState<H1Entry[]>([]);
  const [gaps, setGaps] = useState<H1Gap[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, gapsRes]: any = await Promise.all([
        api.get('/pharmacy/h1-register', {
          params: {
            rxSchedule: scheduleFilter !== 'ALL' ? scheduleFilter : undefined,
          },
        }),
        api.get('/pharmacy/h1-register/gaps'),
      ]);
      setEntries(entriesRes.data?.rows || []);
      setGaps(gapsRes.data?.gaps || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load H1 register ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scheduleFilter]);

  const handleExportCsv = async () => {
    try {
      const url = `${api.defaults.baseURL || '/api'}/pharmacy/h1-register/export?rxSchedule=${scheduleFilter !== 'ALL' ? scheduleFilter : ''}`;
      window.open(url, '_blank');
      toast.success('Inspector-ready CSV export generated');
    } catch (err: any) {
      toast.error('Export download failed');
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(q) ||
      e.medicineName?.toLowerCase().includes(q) ||
      e.prescriptionNo?.toLowerCase().includes(q) ||
      e.prescriberName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Pharmacy H1 / Narcotic Statutory Register
          </h1>
          <p className="text-muted-foreground">
            Compliance audit register for Schedule H, H1, X and NDPS controlled substances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export for Drug Inspector (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Total Recorded Controlled Dispenses
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">{entries.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Immutable audit logs in statutory ledger</p>
          </CardContent>
        </Card>

        <Card className={gaps.length > 0 ? 'border-destructive/40 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Compliance Gaps (Unregistered Dispenses)
              <AlertTriangle className={`w-4 h-4 ${gaps.length > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
            </CardDescription>
            <CardTitle className={`text-3xl font-extrabold ${gaps.length > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {gaps.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {gaps.length === 0 ? 'Zero gaps — 100% compliance clean' : 'Immediate reconciliation required'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Inspection Compliance Status
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {gaps.length === 0 ? 'CLEAN' : 'FLAGGED'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Read-only audit record per Drugs & Cosmetics Rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Statutory Register ({entries.length})</TabsTrigger>
          <TabsTrigger value="gaps">Compliance Gaps ({gaps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[240px]">
                <Input
                  placeholder="Search by Patient, Medicine, Rx #, or Doctor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rx Schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Schedules</SelectItem>
                  <SelectItem value="h1">Schedule H1</SelectItem>
                  <SelectItem value="schedule_h">Schedule H</SelectItem>
                  <SelectItem value="x">Schedule X</SelectItem>
                  <SelectItem value="narcotic_ndps">Narcotic / NDPS</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispense Entries</CardTitle>
              <CardDescription>Government prescribed format showing patient, RMP prescriber and quantity</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No controlled drug dispenses found matching criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((e) => (
                    <div
                      key={e._id}
                      className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase font-semibold">
                            {e.rxSchedule}
                          </Badge>
                          <span className="font-semibold text-sm">{e.medicineName}</span>
                          <span className="text-xs text-muted-foreground">Qty: {e.quantity}</span>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(e.dispensedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-1">
                          <span>Patient: <strong>{e.patientName}</strong></span>
                          <span>Prescriber: <strong>{e.prescriberName}</strong></span>
                          <span>Rx No: <strong>{e.prescriptionNo}</strong></span>
                          <span>Dispensed by: <strong>{e.dispensedByName}</strong></span>
                        </p>
                      </div>

                      <div>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          <FileCheck className="w-3.5 h-3.5 mr-1" />
                          Logged
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Gaps</CardTitle>
              <CardDescription>Dispensed controlled medicines missing an explicit H1 ledger entry</CardDescription>
            </CardHeader>
            <CardContent>
              {gaps.length === 0 ? (
                <div className="py-12 text-center text-emerald-600 font-medium">
                  ✓ Excellent: No unlinked controlled substance dispenses detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {gaps.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-sm text-destructive">{g.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          Prescription #{g.prescriptionNo} (ID: {g.prescriptionId})
                        </p>
                      </div>
                      <Badge variant="destructive">Needs Reconciliation</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
