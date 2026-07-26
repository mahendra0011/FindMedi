import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, FileText, CreditCard, Smartphone, Landmark, Wallet,
  CheckCircle, Clock, AlertCircle, RotateCcw, Download, Calendar,
  User, Hospital, Stethoscope, TestTube, Pill, IndianRupee, Loader2,
  ExternalLink, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api, downloadPaymentInvoice, downloadBillPdf } from '@/lib/api';

const methodIcons = {
  card: CreditCard, upi: Smartphone, netbanking: Landmark,
  cash: Wallet, wallet: Smartphone, online: CreditCard
};

const statusConfig = {
  completed: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-blue-500/10 text-blue-600', icon: RotateCcw },
};

const serviceTypeLabels = {
  appointment: 'Appointment', test: 'Lab Test', medicine: 'Medicine',
  ipd: 'IPD', ot: 'Operation Theatre', radiology: 'Radiology',
  physio: 'Physiotherapy', diet: 'Diet', mentalhealth: 'Mental Health'
};

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

export default function VerifyTransaction() {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter a Transaction ID, Invoice ID, or any valid ID');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.verifyTransaction(searchId.trim());
      setResult(res);
      toast.success('Transaction verified successfully');
    } catch (e) {
      const msg = e.response?.data?.message || 'Transaction not found';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!result?.payment?.transaction_id) return;
    try {
      await downloadPaymentInvoice(result.payment.transaction_id, `${result.payment.transaction_id}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Unable to download invoice');
    }
  };

  const handleDownloadBill = async () => {
    if (!result?.payment?.transaction_id) return;
    try {
      await downloadBillPdf(result.payment.transaction_id, `${result.payment.transaction_id}-bill.pdf`);
    } catch (error) {
      toast.error(error.message || 'Unable to download bill');
    }
  };

  const handleCopy = (text) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payment = result?.payment;
  const reference = result?.reference;
  const patient = result?.patient;
  const hospital = result?.hospital;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Verify Transaction</h1>
        <p className="text-muted-foreground text-sm">Enter any valid ID to verify a transaction</p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Enter Transaction ID / Invoice ID / Bill ID / Appointment ID / Booking ID / Order ID / Payment ID"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
        />
        <Button onClick={handleVerify} disabled={loading} className="sm:w-auto w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verify
        </Button>
      </div>

      {/* Results */}
      {!result && !loading && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Enter an ID above and click Verify to see transaction details</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {result && payment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Details */}
          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">Transaction Details</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
                  <Download className="w-4 h-4 mr-1" /> Invoice
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadBill}>
                  <Download className="w-4 h-4 mr-1" /> Bill
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Transaction ID</label>
                    <p className="font-mono text-sm mt-1 break-all">{payment.transaction_id || '-'}</p>
                  </div>
                  {payment.transaction_id && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(payment.transaction_id)}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Invoice ID</label>
                  <p className="font-mono text-sm mt-1 break-all">{payment.invoice_id || '-'}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</label>
                  <p className="text-2xl font-bold text-foreground mt-1">₹{payment.amount?.toLocaleString('en-IN') || '0'}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Payment Method</label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const Icon = methodIcons[payment.method] || CreditCard;
                      return <Icon className="w-5 h-5 text-primary" />;
                    })()}
                    <span className="capitalize">{payment.method || 'Unknown'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="mt-1">
                    {(() => {
                      const cfg = statusConfig[payment.status] || statusConfig.pending;
                      const Icon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Service Type</label>
                  <p className="mt-1">{serviceTypeLabels[payment.serviceType] || payment.serviceType || '-'}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Date & Time</label>
                  <p className="mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {formatDate(payment.createdAt)}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {patient && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <User className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Patient</label>
                      <p className="font-medium mt-1">{patient.name || '-'}</p>
                      {patient.uhid && <p className="text-sm text-muted-foreground">UHID: {patient.uhid}</p>}
                      {patient.phone && <p className="text-sm text-muted-foreground">{patient.phone}</p>}
                    </div>
                  </div>
                )}

                {hospital && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <Hospital className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Hospital</label>
                      <p className="font-medium mt-1">{hospital.name || '-'}</p>
                      {hospital.city && <p className="text-sm text-muted-foreground">{hospital.city}</p>}
                    </div>
                  </div>
                )}

                {payment.description && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Description</label>
                    <p className="mt-1 text-sm">{payment.description}</p>
                  </div>
                )}

                {payment.lineItems && payment.lineItems.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Line Items</label>
                    <div className="mt-2 space-y-1">
                      {payment.lineItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.name} x {item.qty}</span>
                          <span>₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {payment.refund_amount > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Refund Amount</label>
                    <p className="text-lg font-medium text-blue-600 mt-1">₹{payment.refund_amount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reference Details */}
          {reference && (
            <div className="bg-card rounded-2xl border border-border/60 p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Reference Details</h2>

              {payment.serviceType === 'appointment' && reference && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {reference.doctorId && (
                      <div className="flex items-start gap-3">
                        <Stethoscope className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Doctor</label>
                          <p className="font-medium mt-1">{reference.doctorId.name}</p>
                          {reference.doctorId.specialization && (
                            <p className="text-sm text-muted-foreground">{reference.doctorId.specialization}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {reference.date && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Appointment Date</label>
                          <p className="font-medium mt-1">{formatDate(reference.date)}</p>
                        </div>
                      </div>
                    )}
                    {reference.time && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Time</label>
                        <p className="mt-1">{reference.time}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {reference.hospitalId && (
                      <div className="flex items-start gap-3">
                        <Hospital className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Hospital</label>
                          <p className="font-medium mt-1">{reference.hospitalId.name}</p>
                          {reference.hospitalId.address && (
                            <p className="text-sm text-muted-foreground">{reference.hospitalId.address}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {reference.status && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                        <p className="mt-1 capitalize">{reference.status}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {payment.serviceType === 'test' && reference && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {reference.patientId && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Patient</label>
                          <p className="font-medium mt-1">{reference.patientId.name || '-'}</p>
                          {reference.patientId.phone && (
                            <p className="text-sm text-muted-foreground">{reference.patientId.phone}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {reference.bookingId && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Booking ID</label>
                        <p className="font-mono text-sm mt-1 break-all">{reference.bookingId}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {reference.testIds && reference.testIds.length > 0 && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Tests</label>
                        <div className="mt-2 space-y-1">
                          {reference.testIds.map(test => (
                            <div key={test._id || test} className="flex items-center gap-2">
                              <TestTube className="w-4 h-4 text-primary" />
                              <span className="text-sm">{test.name || test}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {reference.hospitalId && (
                      <div className="flex items-start gap-3">
                        <Hospital className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Hospital</label>
                          <p className="font-medium mt-1">{reference.hospitalId.name || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {payment.serviceType === 'medicine' && reference && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {reference.patientId && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Patient</label>
                          <p className="font-medium mt-1">{reference.patientId.name || '-'}</p>
                          {reference.patientId.phone && (
                            <p className="text-sm text-muted-foreground">{reference.patientId.phone}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {reference.orderId && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Order ID</label>
                        <p className="font-mono text-sm mt-1 break-all">{reference.orderId}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {reference.items && reference.items.length > 0 && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Medicines</label>
                        <div className="mt-2 space-y-1">
                          {reference.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-primary" />
                              <span className="text-sm">{item.medicineId?.name || item.name} x {item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {reference.hospitalId && (
                      <div className="flex items-start gap-3">
                        <Hospital className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">Hospital</label>
                          <p className="font-medium mt-1">{reference.hospitalId.name || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
