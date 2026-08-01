import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import DoctorRecordsDashboard from '@/components/DoctorRecordsDashboard';

export default function ClinicPrescriptions() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const docName = user?.name?.toLowerCase();

      // 1. Prescriptions (records)
      const recData = await api.getRecords();
      const recArr = recData?.data || recData?.records || recData || [];
      const prescriptions = recArr.filter(r =>
        r.doctor?.toLowerCase().includes(docName) &&
        r.type?.toLowerCase() === 'prescription'
      );
      setRecords(prescriptions);

      // 2. Bills & Invoices (billing)
      const billData = await api.getBilling();
      const billArr = billData?.data || billData?.bills || billData || [];
      const myBills = billArr.filter(b =>
        b.doctor?.toLowerCase().includes(docName)
      );

      const billList = [];
      const invoiceList = [];

      myBills.forEach(b => {
        const bt = (b.billType || b.data?.type || '').toLowerCase();
        if (bt === 'invoice' || b.data?.isInvoice) {
          invoiceList.push(b);
        } else if (bt === 'bill' || b.data?.isBill) {
          billList.push(b);
        } else {
          const hasItems = (b.data?.items?.length || b.services?.length || 0) > 0;
          if (hasItems && b.service?.toLowerCase().includes('invoice')) invoiceList.push(b);
          else if (b.status === 'Paid' && hasItems) invoiceList.push(b);
          else billList.push(b);
        }
      });

      setBills(billList);
      setInvoices(invoiceList);
    } catch (e) {
      toast.error(e.message || 'Failed to load records');
    }
    setLoading(false);
  }, [user?.name]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [user?.name]);

  return (
    <DoctorRecordsDashboard
      records={records}
      bills={bills}
      invoices={invoices}
      onRefresh={loadAll}
      loading={loading}
    />
  );
}