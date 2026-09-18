'use client';

import React from 'react';
import {
  Star, FlaskConical, DollarSign, AlertCircle, Users, Activity, RotateCcw
} from 'lucide-react';

export interface ReviewItem {
  _id: string;
  doctorName?: string;
  patientName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface LabReportTest {
  name?: string;
  result?: unknown;
  unit?: string;
  normalRange?: string;
  [key: string]: unknown;
}

export interface LabReportItem {
  _id?: string;
  type?: string;
  patient?: string;
  createdAt?: string;
  data?: {
    tests?: LabReportTest[];
    reportId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RefundItem {
  _id: string;
  doctor?: string;
  patient?: string;
  patientName?: string;
  reason?: string;
  description?: string;
  amount?: number;
  refund_amount?: number;
  status?: string;
  [key: string]: unknown;
}

interface DoctorPracticeOverviewProps {
  reviews: ReviewItem[];
  avgRating: string;
  labReports: LabReportItem[];
  totalEarned: number;
  pendingPayment: number;
  uniquePatients: number;
  refunds: RefundItem[];
  totalRefunded: number;
  pendingRefunds: number;
}

export function DoctorPracticeOverview({
  reviews,
  avgRating,
  labReports,
  totalEarned,
  pendingPayment,
  uniquePatients,
  refunds,
  totalRefunded,
  pendingRefunds,
}: DoctorPracticeOverviewProps) {
  return (
    <>
      {/* Reviews and Lab Reports */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Recent Reviews
            </h2>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(Number(avgRating))
                      ? 'text-warning fill-warning'
                      : 'text-muted'
                  }`}
                />
              ))}
              <span className="text-sm font-medium ml-1">{avgRating}</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map(rv => (
                <div key={rv._id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{rv.patientName}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= (rv.rating || 0) ? 'text-warning fill-warning' : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rv.comment && <p className="text-sm text-muted-foreground line-clamp-2">{rv.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Lab Reports */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Recent Lab Reports
            </h2>
            <span className="text-xs text-muted-foreground">{labReports.length} total</span>
          </div>
          {labReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FlaskConical className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No lab reports available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labReports.slice(0, 5).map((report, idx) => (
                <div
                  key={report._id || idx}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {report.patient || 'Unknown Patient'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {report.data?.tests?.length || 0} tests
                        {report.data?.reportId && ` · ${report.data.reportId}`}
                        {report.createdAt && ` · ${new Date(report.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {report.data?.tests && report.data.tests.length > 0 && (
                    <span className="shrink-0 text-xs font-medium text-success">
                      {report.data.tests.filter(t => t.result !== undefined && t.result !== null).length}/
                      {report.data.tests.length} done
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="font-bold text-lg text-success">₹{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4 text-center">
          <AlertCircle className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="font-bold text-lg text-warning">₹{pendingPayment.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pending Payment</p>
        </div>
        <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="font-bold text-lg text-info">{uniquePatients}</p>
          <p className="text-xs text-muted-foreground">Unique Patients</p>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center">
          <Activity className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-primary">{reviews.length}</p>
          <p className="text-xs text-muted-foreground">Reviews</p>
        </div>
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
            <span className="text-warning font-medium">{pendingRefunds} Pending</span>
          </div>
        </div>
        {refunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No refunds found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.slice(0, 5).map(rf => (
              <div key={rf._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{rf.patient || rf.patientName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{rf.reason || rf.description || 'Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">
                    ₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rf.status === 'Refunded' || rf.status === 'refunded'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {rf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
