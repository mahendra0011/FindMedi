import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

export default function PatientAssistants() {
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activeRes, historyRes, favRes] = await Promise.all([
        api.getActiveAssistantBooking().catch(() => ({ activeBooking: null })),
        api.getMyAssistantBookings({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          hospital: hospitalFilter ? hospitalFilter : undefined,
        }).catch(() => ({ bookings: [] })),
        api.getFavoriteAssistants().catch(() => ({ favorites: [] })),
      ]);

      setActiveBooking(activeRes?.activeBooking || null);
      setBookings(historyRes?.bookings || []);
      setFavorites(favRes?.favorites || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, hospitalFilter]);

  const totalSpent = bookings
    .filter((b) => b.payment?.status === 'paid')
    .reduce((sum, b) => sum + (b.cost?.total || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Header & Book Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-teal-600" />
              My Hospital Assistants
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your personal hospital attendants, track active shifts, and review past receipts.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate('/book-assistant')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md gap-1.5"
          >
            <Users className="w-4 h-4" /> Book New Assistant
          </Button>
        </div>

        {/* Top Banner: Active / In-Progress Booking */}
        {activeBooking && (
          <div className="p-5 rounded-3xl bg-teal-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
                <span className="w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 tracking-wider">
                  {activeBooking.status.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  Assistance at {activeBooking.hospital}
                </h3>
                <p className="text-xs text-teal-100">
                  Assistant: {activeBooking.assistantId?.name || 'Assigned Attendant'} •{' '}
                  {activeBooking.taskChecklist?.filter((t: any) => t.isDone).length || 0} of{' '}
                  {activeBooking.taskChecklist?.length || 0} tasks completed
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => navigate(`/book-assistant?bookingId=${activeBooking._id}`)}
              className="bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs rounded-xl self-end sm:self-center"
            >
              View Live Status
            </Button>
          </div>
        )}

        {/* Quick Stats Widget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Total Bookings</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {bookings.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Total Care Spent</div>
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
              ₹{totalSpent.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Favorite Attendants</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {favorites.length}
            </div>
          </div>
        </div>

        {/* Favorite Assistants (Quick Rebook Section) */}
        {favorites.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Frequently Booked Attendants
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {favorites.map((fav) => (
                <div
                  key={fav._id}
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                      {(fav.userId?.name || 'A').charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {fav.userId?.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Booked {fav.bookingCountWithPatient} times • ₹{fav.pricePerHour}/hr
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate('/book-assistant')}
                    className="h-7 px-2.5 text-[11px] bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Rebook
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking History Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Booking History
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="confirmed">Confirmed</option>
                <option value="requested">Requested</option>
                <option value="cancelled_by_patient">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading history...</div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No assistant bookings found.</p>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/book-assistant')}
                className="mt-3 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                Book an Assistant Now
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Booking #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Assistant</th>
                    <th className="py-3 px-4">Hospital</th>
                    <th className="py-3 px-4">Services</th>
                    <th className="py-3 px-4">Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{b.bookingNumber || String(b._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{new Date(b.scheduledDate || b.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{b.startTime || '10:00 AM'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {b.assistantId?.name || (b.isUrgent ? 'Urgent Broadcast' : 'Pending')}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{b.hospital}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(b.serviceCategories || []).slice(0, 2).map((c: string) => (
                            <Badge key={c} variant="secondary" className="text-[9px] px-1 py-0">
                              {c.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-teal-700 dark:text-teal-400">
                        ₹{b.cost?.total || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`text-[10px] ${
                            b.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : b.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {b.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBooking(b)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Booking #{selectedBooking.bookingNumber || selectedBooking._id}
                </h3>
                <Badge>{selectedBooking.status.toUpperCase()}</Badge>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Hospital</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedBooking.hospital}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date & Shift</span>
                    <strong>{new Date(selectedBooking.scheduledDate).toLocaleDateString()} ({selectedBooking.durationType})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assistant</span>
                    <strong>{selectedBooking.assistantId?.name || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Amount</span>
                    <strong className="text-teal-600">₹{selectedBooking.cost?.total || 0}</strong>
                  </div>
                </div>

                {/* Task Checklist Log */}
                {selectedBooking.taskChecklist && selectedBooking.taskChecklist.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-500 block mb-1">Hospital Task Log:</span>
                    <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                      {selectedBooking.taskChecklist.map((t: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className={t.isDone ? 'line-through text-slate-400' : ''}>
                            {t.isDone ? '✅' : '⏳'} {t.label}
                          </span>
                          {t.doneAt && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(t.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.completionSummary && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900">
                    <span className="font-bold text-teal-800 dark:text-teal-400 block mb-0.5">Summary:</span>
                    "{selectedBooking.completionSummary}"
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                {selectedBooking.payment?.status === 'paid' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      api.downloadAssistantReceipt(
                        selectedBooking._id,
                        `Assistant-Receipt-${selectedBooking.bookingNumber || selectedBooking._id}.pdf`
                      )
                    }
                    className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
