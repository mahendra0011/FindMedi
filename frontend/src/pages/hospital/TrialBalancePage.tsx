import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  DollarSign,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Building,
  TrendingUp,
  Receipt,
  PieChart,
} from 'lucide-react';

interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'GENERAL';
  totalDebit: number;
  totalCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export default function TrialBalancePage() {
  const [data, setData] = useState<{
    trialBalance: TrialBalanceLine[];
    grandDebit: number;
    grandCredit: number;
    isBalanced: boolean;
    variance: number;
  }>({
    trialBalance: [],
    grandDebit: 0,
    grandCredit: 0,
    isBalanced: true,
    variance: 0,
  });

  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const res: any = await api.get(`/finance/trial-balance?${params.toString()}`);
      setData(
        res.data || {
          trialBalance: [],
          grandDebit: 0,
          grandCredit: 0,
          isBalanced: true,
          variance: 0,
        }
      );
    } catch {
      toast.error('Failed to load Trial Balance ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrialBalance();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      case 'LIABILITY':
        return 'bg-purple-500/15 text-purple-600 border-purple-500/30';
      case 'REVENUE':
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'EXPENSE':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              Double-Entry General Ledger & Trial Balance
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Module #25 • GAAP / Ind-AS 1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-account audit: Total Debits must equal Total Credits across all hospital cash desks and departmental revenue streams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.print();
            }}
            className="flex items-center gap-2 text-xs"
          >
            <Download className="h-4 w-4" /> Export Financial Summary
          </Button>
        </div>
      </div>

      {/* Financial Health Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Total Debits</p>
            <p className="text-xl font-bold font-mono text-foreground">
              ₹{data.grandDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">Assets + Operating Expenses</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Total Credits</p>
            <p className="text-xl font-bold font-mono text-foreground">
              ₹{data.grandCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">Liabilities + Clinical Revenues</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Ledger Balance Status</p>
            <div className="flex items-center gap-2 pt-0.5">
              {data.isBalanced ? (
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> BALANCED
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-bold text-xs flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" /> DISCREPANCY
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Variance: ₹{data.variance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Active Ledger Accounts</p>
            <p className="text-xl font-bold font-mono text-primary">
              {data.trialBalance.length} Accounts
            </p>
            <p className="text-[11px] text-muted-foreground">Chart of Accounts verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Worksheet Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              Trial Balance Worksheet
            </CardTitle>
            <CardDescription className="text-xs">
              Closing debits and credits calculated dynamically from immutable day-book transactions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="h-8 text-xs w-36"
            />
            <Button size="sm" onClick={loadTrialBalance} className="h-8 text-xs">
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-3">Account Code</th>
                <th className="p-3">Account Description</th>
                <th className="p-3">Classification</th>
                <th className="p-3 text-right">Debit Total (₹)</th>
                <th className="p-3 text-right">Credit Total (₹)</th>
                <th className="p-3 text-right">Closing Debit (₹)</th>
                <th className="p-3 text-right">Closing Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.trialBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No ledger entries posted for this period.
                  </td>
                </tr>
              ) : (
                data.trialBalance.map((line) => (
                  <tr key={line.accountCode} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{line.accountCode}</td>
                    <td className="p-3 font-medium text-foreground">{line.accountName}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] ${getTypeBadge(line.accountType)}`}>
                        {line.accountType}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {line.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {line.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-foreground">
                      {line.closingDebit > 0
                        ? `₹${line.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-foreground">
                      {line.closingCredit > 0
                        ? `₹${line.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.trialBalance.length > 0 && (
              <tfoot className="bg-muted/40 font-bold border-t">
                <tr>
                  <td colSpan={3} className="p-3 text-right uppercase text-[11px]">
                    Grand Total
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    ₹{data.grandDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    ₹{data.grandCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-600">
                    ₹{data.grandDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-600">
                    ₹{data.grandCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
