import { useState } from 'react';
import { Search, Download, Clock, X, FileText, TrendingUp, Users, Activity, BarChart3, Calendar, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const reportsApi = {
  getReport: (type, params) => api.dispatch(() => Promise.resolve({ data: [], summary: {} }), `/reports/${type}?` + new URLSearchParams(params)),
  exportPDF: (type, params) => api.dispatch(() => Promise.resolve({ url: '#' }), `/reports/${type}/pdf`, { method: 'POST', body: JSON.stringify(params) }),
};

const reportCategories = {
  daily: [
    { key: 'opd', label: 'OPD Count', icon: Users, description: 'Outpatient visits today' },
    { key: 'ipd', label: 'IPD Census', icon: Activity, description: 'Inpatient census today' },
    { key: 'revenue', label: 'Revenue', icon: TrendingUp, description: 'Daily revenue report' },
    { key: 'ot', label: 'OT List', icon: FileText, description: 'Operation theatre schedule' },
    { key: 'emergency', label: 'Emergency Cases', icon: AlertTriangle, description: 'Emergency department cases' },
  ],
  monthly: [
    { key: 'department', label: 'Department Revenue', icon: BarChart3, description: 'Department-wise revenue' },
    { key: 'doctor', label: 'Doctor Performance', icon: Users, description: 'Doctor-wise patient stats' },
    { key: 'disease', label: 'Disease Statistics', icon: Activity, description: 'Disease-wise statistics' },
    { key: 'bed', label: 'Bed Occupancy', icon: Calendar, description: 'Bed occupancy rate' },
    { key: 'los', label: 'Length of Stay', icon: Clock, description: 'Average length of stay' },
  ],
  government: [
    { key: 'birth', label: 'Birth Registration', icon: FileText, description: 'Birth certificates' },
    { key: 'death', label: 'Death Certificate', icon: FileText, description: 'Death certificates' },
    { key: 'notifiable', label: 'Notifiable Diseases', icon: AlertTriangle, description: 'TB, Malaria, etc.' },
    { key: 'pcpndt', label: 'PCPNDT', icon: Filter, description: 'Pre-Conception & Pre-Natal Diagnostic Techniques' },
  ],
};

export default function Reports() {
  const [reportType, setReportType] = useState('daily');
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [department, setDepartment] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (type) => {
    setLoading(true);
    setSelectedReport(type);
    try {
      const res = await reportsApi.getReport(type, { ...dateRange, department });
      setReportData(res);
    } catch {
      setReportData({ data: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!selectedReport) return;
    reportsApi.exportPDF(selectedReport, { ...dateRange, department }).then(res => {
      if (res.url && res.url !== '#') window.open(res.url, '_blank');
    });
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Generate and export hospital reports</p>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {['daily', 'monthly', 'government'].map(t => (
          <button key={t} onClick={() => { setReportType(t); setSelectedReport(null); setReportData(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${reportType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t} Reports
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-heading text-sm font-semibold text-muted-foreground capitalize mb-3">
            {reportType} Reports
          </h3>
          {reportCategories[reportType]?.map(r => (
            <button key={r.key} onClick={() => fetchReport(r.key)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedReport === r.key ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedReport === r.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Report Display */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">
                    {reportCategories[reportType]?.find(r => r.key === selectedReport)?.label || 'Report'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dateRange.from && dateRange.to ? `${dateRange.from} to ${dateRange.to}` : 'All time'}
                    {department && ` · ${department}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleExport} disabled={loading}>
                    <Download className="w-3 h-3 mr-1" /> Export PDF
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {/* Filters */}
                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
                    <Input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
                    <Input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="">All Departments</option>
                      {['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency', 'ICU', 'General Medicine', 'Surgery'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => fetchReport(selectedReport)} disabled={loading}>
                      <Filter className="w-4 h-4 mr-1" /> Apply
                    </Button>
                  </div>
                </div>

                {/* Report Content */}
                {loading ? (
                  <div className="text-center py-20">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground">Generating report...</p>
                  </div>
                ) : reportData?.data?.length > 0 ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(reportData.summary).map(([key, value]) => (
                          <div key={key} className="bg-muted/20 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{value}</p>
                            <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {Object.keys(reportData.data[0] || {}).map(key => (
                              <th key={key} className="text-left p-2 text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.data.map((row, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="p-2 text-xs text-foreground">{val || '-'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No data available for this report</p>
                    <p className="text-xs text-muted-foreground mt-1">Apply filters and click Apply to generate</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a report from the left panel</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a report type to view and export</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}