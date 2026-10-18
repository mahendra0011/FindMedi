import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, User, Stethoscope, Loader2, Pill, TestTube, FlaskConical, HeartPulse, Eye, ChevronRight, Sparkles, Printer, ChevronDown, AlertTriangle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt';
import { api, resolveFileUrl, getServerOrigin } from '@/lib/api';
import { toast } from 'sonner';
import type { Unmodelled } from '@/lib/apiTypes';

const UPLOAD_BASE = getServerOrigin();

const tabConfig: Unmodelled = {
  prescriptions: { label: 'Prescriptions', icon: Pill, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  labReports: { label: 'Lab Reports', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  dischargeSummaries: { label: 'Discharge', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

export default function MyReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({ prescriptions: [], labReports: [], dischargeSummaries: [] });
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any | null>(null);

  const { data: labOrdersData, isLoading: labLoading } = useQuery({
    queryKey: ['lab-orders', 'patient-reports'],
    queryFn: () => api.getLabOrders({}),
  });
  const labOrders: any[] = labOrdersData?.orders || [];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getRecords();
      const allRecords = data?.data || data?.records || data || [];
      const prescriptions = allRecords.filter((r: Unmodelled) => r.type === 'prescription');
      const labReports = allRecords.filter((r: Unmodelled) => r.type === 'lab_report');
      const dischargeSummaries = allRecords.filter((r: Unmodelled) => r.type === 'discharge_summary');
      setReports({ prescriptions, labReports, dischargeSummaries });
    } catch (error: any) {
      console.error('Error fetching reports:', error);
    }
    setLoading(false);
  };

  const downloadReport = async (report: Unmodelled) => {
    try {
      if (report.reportUrl) {
        window.open(resolveFileUrl(report.reportUrl), '_blank');
      } else if (report.type === 'prescription') {
        navigate('/patient/prescriptions');
      } else if (report.type === 'lab_report') {
        toast.info('View lab reports from your bookings page');
        navigate('/patient/bookings');
      } else {
        toast.info('Please contact the hospital to get a copy of your discharge summary');
      }
    } catch (error: any) {
      console.error('Error downloading report:', error);
    }
  };

  const formatDate = (date: Unmodelled) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statCards = [
    { label: 'Prescriptions', count: reports.prescriptions.length, icon: Pill, color: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
    { label: 'Lab Reports', count: reports.labReports.length, icon: FlaskConical, color: 'text-purple-500', gradient: 'from-purple-500/20 to-purple-500/5' },
    { label: 'Discharge', count: reports.dischargeSummaries.length, icon: HeartPulse, color: 'text-rose-500', gradient: 'from-rose-500/20 to-rose-500/5' },
  ];

  const ReportCard = ({ report, type }: Unmodelled) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${tabConfig[type]?.bg || 'bg-muted'}`}>
            {type === 'prescription' ? <Pill className={`w-6 h-6 ${tabConfig[type]?.color || 'text-foreground'}`} /> :
             type === 'lab_report' ? <FlaskConical className={`w-6 h-6 ${tabConfig[type]?.color || 'text-foreground'}`} /> :
             <HeartPulse className={`w-6 h-6 ${tabConfig[type]?.color || 'text-foreground'}`} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${tabConfig[type]?.bg || 'bg-muted'} ${tabConfig[type]?.color || 'text-foreground'} border-transparent`}>
                {type === 'prescription' ? <Pill className="w-3 h-3" /> : type === 'lab_report' ? <FlaskConical className="w-3 h-3" /> : <HeartPulse className="w-3 h-3" />}
                {tabConfig[type]?.label || type}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(report.date || report.createdAt)}
              </span>
            </div>
            {(report.diagnosis || report.data?.diagnosis) && (
              <p className="text-sm font-semibold text-foreground mt-1">{report.diagnosis || report.data?.diagnosis}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
          {report.data?.patient?.name && (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground/60" />
              <span>{report.data.patient.name}{report.data.patient.age ? `, ${report.data.patient.age}yrs` : ''}{report.data.patient.gender ? `, ${report.data.patient.gender}` : ''}</span>
            </div>
          )}
          {report.data?.doctor?.name && (
            <div className="flex items-center gap-2">
              <Stethoscope className="w-3 h-3 text-muted-foreground/60" />
              <span>Dr. {report.data.doctor.name}{report.data.doctor.specialization ? ` (${report.data.doctor.specialization})` : ''}</span>
            </div>
          )}
        </div>

        {report.data?.medications && report.data.medications.length > 0 && (
          <div className="mb-4 p-3 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs font-medium text-foreground mb-1.5">Medications ({report.data.medications.length})</p>
            <div className="space-y-1">
              {report.data.medications.slice(0, 3).map((med: Unmodelled, idx: Unmodelled) => (
                <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  {med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                </p>
              ))}
              {report.data.medications.length > 3 && (
                <p className="text-xs text-primary">+{report.data.medications.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {report.data?.tests && report.data.tests.length > 0 && (
          <div className="mb-4 p-3 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs font-medium text-foreground mb-1.5">Test Results ({report.data.tests.length})</p>
            <div className="space-y-1">
              {report.data.tests.slice(0, 3).map((test: Unmodelled, idx: Unmodelled) => (
                <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                  {test.name}: <span className="font-medium">{test.result}</span> {test.unit}
                </p>
              ))}
              {report.data.tests.length > 3 && (
                <p className="text-xs text-primary">+{report.data.tests.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {report.notes && (
          <p className="text-xs text-muted-foreground mb-3 p-2 bg-muted/20 rounded-xl italic">"{report.notes}"</p>
        )}

        <div className="flex gap-2 pt-3 border-t border-border/30">
          {(report.data?.uploadedFile?.url || report.data?.uploadedFile?.filepath) ? (
            <a href={report.data.uploadedFile.url || `${UPLOAD_BASE}${report.data.uploadedFile.filepath}`}
              target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" className="w-full gap-1.5 rounded-xl text-xs">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </a>
          ) : (
            <Button size="sm" className="flex-1 gap-1.5 rounded-xl text-xs" onClick={() => downloadReport(report)}>
              <Eye className="w-3.5 h-3.5" /> View Report
            </Button>
          )}
          {type === 'discharge_summary' && (
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs"
              onClick={() => setFeedback({ context: 'admission', refModel: 'Admission', refId: report.data?.admissionId || report.admissionId || report.refId, department: 'Inpatient', title: 'How was your discharge & care experience?' })}>
              <MessageSquare className="w-3.5 h-3.5" /> Rate
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const EmptyState = ({ type, icon: Icon }: Unmodelled) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-8 h-8 text-muted-foreground/30" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No {type.toLowerCase()} yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Your {type.toLowerCase()} will appear here after your doctor creates them.</p>
    </div>
  );

  const totalReports = reports.prescriptions.length + reports.labReports.length + reports.dischargeSummaries.length;

  const tabs = [
    { key: 'prescriptions', label: 'Prescriptions', count: reports.prescriptions.length, icon: Pill },
    { key: 'labReports', label: 'Lab Reports', count: reports.labReports.length, icon: FlaskConical },
    { key: 'dischargeSummaries', label: 'Discharge', count: reports.dischargeSummaries.length, icon: HeartPulse },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Reports</h1>
        <p className="text-muted-foreground text-sm">View and download your medical reports</p>
      </div>

      {/* Pathology lab orders (live from the lab service) */}
      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-border/40">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <TestTube className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Pathology Lab Orders</p>
            <p className="text-xs text-muted-foreground">Sample status, results and verified reports</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{labOrders.length}</span>
        </div>

        <div className="divide-y divide-border/40">
          {labLoading && (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          )}
          {!labLoading && labOrders.length === 0 && (
            <p className="px-5 sm:px-6 py-6 text-sm text-muted-foreground text-center">
              No lab orders yet — book a test to see your samples and results here.
            </p>
          )}
          {labOrders.map((o: any) => {
            const isOpen = openOrder === o._id;
            const verified = (o.tests || []).filter((t: any) => ['Verified', 'Report Delivered'].includes(t.status)).length;
            const critical = (o.tests || []).some((t: any) => t.isCritical || ['HH', 'LL'].includes(t.flag));
            return (
              <div key={o._id}>
                <button onClick={() => setOpenOrder(isOpen ? null : o._id)}
                  className="w-full text-left px-5 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4.5 h-4.5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">{o.orderId}</span>
                        <Badge className={`border-0 text-[10px] ${o.priority === 'STAT' ? 'bg-destructive/10 text-destructive' : o.priority === 'Urgent' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                          {o.priority}
                        </Badge>
                        {critical && (
                          <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">Critical</Badge>
                        )}
                        <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(o.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {(o.tests || []).map((t: any) => t.testName).join(', ')}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {o.doctorName ? `Dr. ${o.doctorName} · ` : ''}
                        {verified}/{(o.tests || []).length} verified · v{o.reportVersion || 1}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-4">
                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2">Test</th>
                            <th className="text-left px-3 py-2">Result</th>
                            <th className="text-left px-3 py-2">Reference</th>
                            <th className="text-left px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {(o.tests || []).map((t: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-medium text-foreground">{t.testName}</td>
                              <td className="px-3 py-2">
                                <span className={`font-semibold ${
                                  ['HH', 'LL'].includes(t.flag) ? 'text-destructive' :
                                  ['H', 'L'].includes(t.flag) ? 'text-warning' : 'text-foreground'}`}>
                                  {t.resultValue || '—'}
                                </span>
                                {t.unit ? <span className="text-muted-foreground"> {t.unit}</span> : null}
                                {t.flag && <span className="ml-1 font-bold text-destructive">({t.flag})</span>}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {t.normalRange || (t.refLow != null && t.refHigh != null ? `${t.refLow} – ${t.refHigh}` : '—')}
                              </td>
                              <td className="px-3 py-2">
                                <Badge className={`border-0 text-[10px] ${
                                  ['Verified', 'Report Delivered'].includes(t.status) ? 'bg-success/10 text-success' :
                                  t.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                                  {t.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Ordered {formatDate(o.createdAt)}
                        {o.updatedAt && o.updatedAt !== o.createdAt ? ` · updated ${formatDate(o.updatedAt)}` : ''}
                      </span>
                      <div className="ml-auto flex gap-2">
                        {verified > 0 && (
                          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs"
                            onClick={() => setFeedback({ context: 'lab', refModel: 'LabOrder', refId: o._id, department: 'Pathology', title: `How was your lab experience for ${o.orderId}?` })}>
                            <MessageSquare className="w-3.5 h-3.5" /> Rate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs"
                          onClick={() => {
                            if (o.reportUrl) window.open(resolveFileUrl(o.reportUrl), '_blank');
                            else window.print();
                          }}>
                          <Printer className="w-3.5 h-3.5" /> Print report
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs"
                          onClick={() => navigate('/patient/bookings')}>
                          <Eye className="w-3.5 h-3.5" /> Bookings
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setActiveTab(s.label === 'Prescriptions' ? 'prescriptions' : s.label === 'Lab Reports' ? 'labReports' : 'dischargeSummaries')}
            className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm`}>
                <s.icon className="w-5.5 h-5.5" style={{ color: s.color?.replace('text-', '') }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            </div>
            <p className="font-heading text-3xl font-bold text-foreground tracking-tight">{s.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === t.key
                ? 'bg-card text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : totalReports === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-10 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-semibold text-foreground">No Reports Yet</p>
          <p className="text-sm text-muted-foreground mt-1">Your medical reports will appear here after your doctor creates them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'prescriptions' && (
            reports.prescriptions.length > 0
              ? reports.prescriptions.map((report, idx) => <ReportCard key={idx} report={report} type="prescription" />)
              : <div className="col-span-full"><EmptyState type="Prescriptions" icon={Pill} color="blue" /></div>
          )}
          {activeTab === 'labReports' && (
            reports.labReports.length > 0
              ? reports.labReports.map((report, idx) => <ReportCard key={idx} report={report} type="lab_report" />)
              : <div className="col-span-full"><EmptyState type="Lab Reports" icon={FlaskConical} color="purple" /></div>
          )}
          {activeTab === 'dischargeSummaries' && (
            reports.dischargeSummaries.length > 0
              ? reports.dischargeSummaries.map((report, idx) => <ReportCard key={idx} report={report} type="discharge_summary" />)
              : <div className="col-span-full"><EmptyState type="Discharge Summaries" icon={HeartPulse} color="rose" /></div>
          )}
        </div>
      )}

      {feedback && (
        <Dialog open onOpenChange={(open) => !open && setFeedback(null)}>
          <DialogContent className="max-w-xl p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">Feedback Survey</DialogTitle>
            <FeedbackPrompt
              context={feedback.context}
              refModel={feedback.refModel}
              refId={feedback.refId}
              department={feedback.department}
              title={feedback.title}
              onDone={() => setFeedback(null)}
              onSkip={() => setFeedback(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}