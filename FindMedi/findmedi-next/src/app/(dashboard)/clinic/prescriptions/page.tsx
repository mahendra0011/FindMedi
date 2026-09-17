/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  @typescript-eslint/ban-ts-comment, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toast } from 'sonner';
// // DoctorRecordsDashboard replaced from '@/components/shared/sections/EarningsAnalytics';

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
    <div className='space-y-4'><p className='text-muted-foreground'>{records.length} prescriptions, {bills.length} bills, {invoices.length} invoices</p><div className='grid gap-2'>{records.map((r:any)=> <div key={r._id} className='bg-card border rounded-xl p-4'><p className='font-medium'>{r.patient} - {r.diagnosis}</p><p className='text-xs text-muted-foreground'>{r.date}</p></div>)}</div></div>
  );
}