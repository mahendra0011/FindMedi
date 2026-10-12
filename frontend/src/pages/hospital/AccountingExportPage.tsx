import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api, apiClient } from '@/lib/api';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  TrendingUp,
} from 'lucide-react';

interface ExportStats {
  totalBills: number;
  totalRevenue: number;
  dateRange: { from: string; to: string };
}

export default function AccountingExportPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<'tally' | 'zoho' | null>(null);
  const [lastExport, setLastExport] = useState<{ type: string; time: string; count: number } | null>(null);

  const exportTally = async () => {
    setLoading('tally');
    try {
      const params = new URLSearchParams({ fromDate, toDate });
      const res = await apiClient.get(`/finance/export/tally-xml?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tally_Hospital_Vouchers_${fromDate}_to_${toDate}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setLastExport({ type: 'Tally XML', time: new Date().toLocaleTimeString(), count: 0 });
      toast.success('Tally XML exported successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Tally export failed');
    } finally {
      setLoading(null);
    }
  };

  const exportZoho = async () => {
    setLoading('zoho');
    try {
      const params = new URLSearchParams({ fromDate, toDate });
      const res = await apiClient.get(`/finance/export/zoho-csv?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zoho_Hospital_Invoices_${fromDate}_to_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setLastExport({ type: 'Zoho CSV', time: new Date().toLocaleTimeString(), count: 0 });
      toast.success('Zoho CSV exported successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Zoho export failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Accounting Software Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Export hospital billing data to Tally or Zoho Books
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Receipt className="w-3 h-3 mr-1" />
          Finance Module
        </Badge>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Date Range
          </CardTitle>
          <CardDescription>
            Choose the billing period for export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="h-10 px-4 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {fromDate} → {toDate}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tally Export */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-600" />
              Tally ERP Export
            </CardTitle>
            <CardDescription>
              XML format for Tally ERP 9 / TallyPrime import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Sales vouchers with party ledger entries</p>
              <p>✓ Double-entry format (Dr/Cr)</p>
              <p>✓ Date-wise voucher numbering</p>
              <p>✓ Compatible with Tally XML import</p>
            </div>
            <Button
              onClick={exportTally}
              disabled={loading !== null}
              className="w-full"
              size="lg"
            >
              {loading === 'tally' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating XML...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Tally XML
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Zoho Export */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              Zoho Books Export
            </CardTitle>
            <CardDescription>
              CSV format for Zoho Books invoice import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Invoice number, date, customer name</p>
              <p>✓ Line items with prices</p>
              <p>✓ Payment status mapping</p>
              <p>✓ Direct import to Zoho Books</p>
            </div>
            <Button
              onClick={exportZoho}
              disabled={loading !== null}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {loading === 'zoho' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating CSV...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Zoho CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Info */}
      {lastExport && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Last Export Successful</p>
                <p className="text-sm text-muted-foreground">
                  {lastExport.type} exported at {lastExport.time}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <p className="font-medium mb-1">Tally ERP Import:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open Tally → Gateway of Tally → Import Data → Vouchers</li>
              <li>Select the downloaded XML file</li>
              <li>Map ledgers if prompted (Cash, Bank, Revenue accounts)</li>
              <li>Verify imported vouchers in Day Book</li>
            </ol>
          </div>
          <div>
            <p className="font-medium mb-1">Zoho Books Import:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open Zoho Books → Sales → Invoices</li>
              <li>Click Import → Upload CSV file</li>
              <li>Map columns (Invoice#, Date, Customer, Amount)</li>
              <li>Review and confirm import</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
