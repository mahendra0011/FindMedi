import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Star,
  Download,
  RotateCcw,
  ArrowRight,
  Filter,
  Eye,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Layers,
  FileArchive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

export default function PatientLawyers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cases' | 'bookings' | 'documents' | 'favorites'>('cases');

  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activeRes, bookingsRes, casesRes, docsRes, favRes] = await Promise.all([
        api.getActiveLawyerBooking().catch(() => ({ activeBooking: null })),
        api.getMyLawyerBookings({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        }).catch(() => ({ bookings: [] })),
        api.getMyLawyerCases().catch(() => ({ cases: [] })),
        api.getLawyerDocumentsVault().catch(() => ({ documents: [] })),
        api.getFavoriteLawyers().catch(() => ({ favorites: [] })),
      ]);

      setActiveBooking(activeRes?.activeBooking || null);
      setBookings(bookingsRes?.bookings || []);
      setCases(casesRes?.cases || []);
      setDocuments(docsRes?.documents || []);
      setFavorites(favRes?.favorites || []);
    } catch (err) {
      console.error('Failed to fetch legal console data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const totalSpent = bookings
    .filter((b) => b.payment?.status === 'paid')
    .reduce((sum, b) => sum + (b.fee || 0), 0);

  const ongoingCasesCount = cases.filter((c) => c.status !== 'closed').length;

  const handleDownloadReceipt = (bookingId: string, bookingNumber?: string) => {
    api.downloadLawyerReceipt(
      bookingId,
      `Legal-Receipt-${bookingNumber || bookingId}.pdf`
    );
  };

  const handleCloseCase = async (threadId: string) => {
    if (!confirm('Are you sure you want to mark this legal case matter as closed?')) return;
    try {
      await api.closeLawyerCaseThread(threadId);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to close case');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Header & Book Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-7 h-7 text-slate-900 dark:text-slate-100" />
              My Legal Help & Lawyer Consultations
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track active hospital case proceedings, medical negligence filings, review consultation notes, and access fee receipts.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate('/find-lawyer')}
            className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md gap-1.5"
          >
            <Scale className="w-4 h-4" /> Book New Legal Consultation
          </Button>
        </div>

        {/* Top Banner: Active / In-Progress Consultation */}
        {activeBooking && (
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg shrink-0">
                <span className="w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 tracking-wider">
                  {activeBooking.status.replace(/_/g, ' ')}
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  Consultation in {activeBooking.category?.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-slate-100">
                  Adv. {activeBooking.lawyerId?.userId?.name || 'Advocate'} • {activeBooking.consultationMode?.replace('_', ' ')}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => navigate(`/find-lawyer?bookingId=${activeBooking._id}`)}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md gap-1 self-stretch sm:self-auto"
            >
              Open Consultation Window <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Quick Stats Widget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-100 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                {bookings.length}
              </div>
              <div className="text-xs text-slate-500">Total Consultations</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                ₹{totalSpent.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Total Legal Fees Settled</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                {ongoingCasesCount}
              </div>
              <div className="text-xs text-slate-500">Active Case Threads</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('cases')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'cases'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            My Case Matters ({cases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            All Consultations ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Document Vault ({documents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Star className="w-4 h-4" />
            Trusted Advocates ({favorites.length})
          </button>
        </div>

        {/* TAB 1: GROUPED CASE THREADS */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {cases.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <Scale className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Legal Case Matters Found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you book a consultation, it starts a dedicated case thread where all follow-ups and notes stay grouped together.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/find-lawyer')}
                  className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs"
                >
                  Find a Lawyer Now →
                </Button>
              </div>
            ) : (
              cases.map((c) => {
                const isExpanded = expandedCaseId === c.caseThreadId;
                const sessions = c.sessions || [];
                const firstSession = sessions[0] || {};
                const lawyerUser = c.lawyer?.userId || {};

                return (
                  <div
                    key={c.caseThreadId}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200 border-none capitalize font-semibold text-[11px]"
                          >
                            {c.category?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge
                            className={
                              c.status === 'closed'
                                ? 'bg-slate-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }
                          >
                            {c.status === 'closed' ? 'Closed' : 'Ongoing'}
                          </Badge>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                          Adv. {lawyerUser.name || 'Advocate'}
                        </h3>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sessions.length} Consultation Session(s) • Last Updated:{' '}
                          {new Date(c.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.status !== 'closed' && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/find-lawyer?followUpThreadId=${c.caseThreadId}`
                              )
                            }
                            className="bg-slate-900 hover:bg-black text-white text-xs rounded-xl font-bold gap-1 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Book Follow-Up
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedCaseId(isExpanded ? null : c.caseThreadId)
                          }
                          className="text-xs rounded-xl gap-1"
                        >
                          {isExpanded ? 'Hide Sessions' : 'View Sessions'}
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Sessions List */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {sessions.map((sess: any, idx: number) => (
                          <div
                            key={sess._id || idx}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                Session #{idx + 1} —{' '}
                                {new Date(sess.scheduledDate || sess.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  ₹{sess.fee}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {sess.payment?.status || 'unpaid'}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadReceipt(sess._id, sess.bookingNumber)}
                                  className="h-7 px-2 text-slate-900 dark:text-slate-100 hover:text-white"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Final summary / notes */}
                            {sess.finalCaseSummary && (
                              <p className="text-slate-700 dark:text-slate-300 italic">
                                "{sess.finalCaseSummary}"
                              </p>
                            )}

                            {sess.caseNotes && sess.caseNotes.length > 0 && (
                              <div className="space-y-1">
                                <span className="font-semibold text-slate-500 text-[11px]">
                                  Advocate Notes:
                                </span>
                                {sess.caseNotes.map((n: any, nIdx: number) => (
                                  <div key={nIdx} className="text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-slate-600">
                                    {n.note}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {c.status !== 'closed' && (
                          <div className="flex justify-end pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCloseCase(c.caseThreadId)}
                              className="text-xs text-slate-500 hover:text-rose-600"
                            >
                              Mark Case as Closed
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: FLAT BOOKINGS TABLE */}
        {activeTab === 'bookings' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="requested">Requested</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="text-slate-500">
                Showing {bookings.length} consultation(s)
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No consultations found matching current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="pb-3 font-semibold">Booking ID / Date</th>
                      <th className="pb-3 font-semibold">Advocate</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 font-semibold">Mode</th>
                      <th className="pb-3 font-semibold">Fee</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {b.bookingNumber || b._id.slice(-6)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(b.scheduledDate || b.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          Adv. {b.lawyerId?.userId?.name || 'Advocate'}
                        </td>
                        <td className="py-3.5 capitalize text-slate-600 dark:text-slate-400">
                          {b.category?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 capitalize text-slate-600 dark:text-slate-400">
                          {b.consultationMode?.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          ₹{b.fee}
                        </td>
                        <td className="py-3.5">
                          <Badge
                            className={
                              b.status === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : b.status === 'confirmed'
                                ? 'bg-slate-900 text-white'
                                : b.status === 'in_progress'
                                ? 'bg-amber-600 text-white animate-pulse'
                                : 'bg-slate-500 text-white'
                            }
                          >
                            {b.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/find-lawyer?bookingId=${b._id}`)}
                            className="h-7 text-xs rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(b._id, b.bookingNumber)}
                            className="h-7 text-xs rounded-lg text-slate-900 dark:text-slate-100 hover:text-white"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENT VAULT */}
        {activeTab === 'documents' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Consolidated Legal Case Documents
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All FIRs, medical discharge summaries, invoices, and legal notices uploaded across your consultation cases.
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No legal documents uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {doc.documentName || doc.url || `Document #${idx + 1}`}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          Case: {doc.category?.replace(/_/g, ' ') || 'Consultation'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRUSTED ADVOCATES */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favorites.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <Star className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Saved Advocates
                </h3>
                <p className="text-xs text-slate-500">
                  Advocates you consult with will appear here for fast follow-up rebooking.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.map((lawyer) => (
                  <div
                    key={lawyer._id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Adv. {lawyer.userId?.name}
                      </h4>
                      <div className="text-xs text-slate-500">
                        Bar Reg: {lawyer.barCouncilNumber} • ⭐ {lawyer.rating?.avg?.toFixed(1) || '5.0'}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate('/find-lawyer')}
                      className="bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold"
                    >
                      Book Again
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
