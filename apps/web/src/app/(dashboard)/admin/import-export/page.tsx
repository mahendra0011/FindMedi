/**
 * Import / Export — ported from client/src/pages/ImportExport.jsx
 */
/* eslint-disable react-hooks/static-components */
'use client';

import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Users, Stethoscope, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function ImportExportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<Record<string, { success: boolean; imported?: number; error?: string } | null>>({});

  const handleExport = async (type: string, format = 'excel') => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
      const res = await fetch(`${API_URL}/reports/export/${type}?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  const handleImport = async (type: string, file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setImportResults((prev) => ({ ...prev, [type]: null }));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
      const res = await fetch(`${API_URL}/reports/import/${type}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = (await res.json()) as { success: boolean; imported?: number; message?: string; error?: string };
      if (!data.success) throw new Error(data.message || data.error || 'Import failed');
      setImportResults((prev) => ({ ...prev, [type]: data }));
      toast.success(`Imported ${data.imported ?? 0} records`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setImportResults((prev) => ({ ...prev, [type]: { success: false, error: msg } }));
      toast.error(msg);
    }
    setLoading(false);
  };

  const ImportCard = ({ type, title, description, icon: Icon }: { type: string; title: string; description: string; icon: typeof Users }) => {
    const result = importResults[type];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" /> Import {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleImport(type, file);
                e.target.value = '';
              }}
              className="hidden"
              id={`import-${type}`}
            />
            <label htmlFor={`import-${type}`}>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls supported</p>
              </div>
            </label>
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.success ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Successfully imported {result.imported} records!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>{result.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ExportCard = ({ type, title, description, icon: Icon }: { type: string; title: string; description: string; icon: typeof Users }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" /> Export {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={() => handleExport(type, 'excel')} disabled={loading} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => handleExport(type, 'csv')} disabled={loading} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if ((user as { role?: string })?.role === 'patient') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">Import and export your data</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>This section is only available for admin and staff</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import / Export</h1>
          <p className="text-muted-foreground">Bulk import and export patient, doctor, and billing records</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ImportCard type="patients" title="Patients" description="Import patients from Excel" icon={Users} />
            <ImportCard type="doctors" title="Doctors" description="Import doctors from Excel" icon={Stethoscope} />
            <ImportCard type="billing" title="Billing" description="Import billing records from Excel" icon={CreditCard} />
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Import Format Guide</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">Patients Excel: Name, Email, Phone, Age, Gender, Address</p>
              <p className="text-muted-foreground">Doctors Excel: Name, Specialization, Email, Phone, Experience, Qualification</p>
              <p className="text-muted-foreground">Billing Excel: PatientId, Amount, Description, Status, Date</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExportCard type="patients" title="Patients" description="Export all patient records" icon={Users} />
            <ExportCard type="doctors" title="Doctors" description="Export all doctor records" icon={Stethoscope} />
            <ExportCard type="billing" title="Billing" description="Export billing records" icon={CreditCard} />
            <ExportCard type="appointments" title="Appointments" description="Export appointments" icon={FileSpreadsheet} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
