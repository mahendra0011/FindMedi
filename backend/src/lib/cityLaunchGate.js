/**
 * City launch gate (16.md §6.3): objective gates for expanding beyond the
 * first launch city. Computes current supply, provider utilization (appointing
 * share), patient repeat rate, support load and payment reliability against a
 * city's configured thresholds. All metrics are city-scoped where the data
 * allows; where it does not (tickets carry no city, payments carry no city),
 * we compute a global value and label it honestly.
 */

import mongoose from 'mongoose';
import Provider from '../models/Provider.js';
import Appointment from '../models/Appointment.js';
import SupportTicket from '../models/SupportTicket.js';
import Payment from '../models/Payment.js';
import logger from '../config/logger.js';

const DAY_MS = 86400000;

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

export function appointmentDateField(date) {
  // Appointment.date migrated to String ('YYYY-MM-DD'); ISO strings compare
  // lexicographically in Mongo, so string $gte compares dates correctly.
  return { $gte: isoDate(date) };
}

export async function evaluateCityLaunchGate(city) {
  const cityName = String(city?.name || '').trim();
  const gate = city?.launchGate || {};
  const minProviders = gate.minProviders ?? 15;
  const minFillRatePct = gate.minFillRatePct ?? 60;
  const minRepeatPct = gate.minRepeatPct ?? 20;
  const maxOpenTickets = gate.maxOpenTickets ?? 10;
  const maxPayoutFailPct = gate.maxPayoutFailPct ?? 1;
  const now = Date.now();

  const cityRegex = new RegExp(`^${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const providers = await Provider.find({ status: 'live', 'address.city': cityRegex }).select('_id').lean();
  const providerCount = providers.length;
  const providerIds = providers.map((p) => p._id);

  const thirtyDaysAgo = now - 30 * DAY_MS;
  const ninetyDaysAgo = now - 90 * DAY_MS;

  const CONFIRMED_STATUSES = ['Completed', 'Confirmed', 'In Queue', 'Serving'];
  const confirmed30 = await Appointment.find({
    date: appointmentDateField(thirtyDaysAgo),
    status: { $in: CONFIRMED_STATUSES },
  }).select('doctorId patientId').lean();

  const activeProviders30 = new Set(confirmed30.map((a) => String(a.doctorId))).size;
  const providerUtilizationPct = providerCount > 0
    ? Math.round((activeProviders30 / providerCount) * 1000) / 10
    : 0;

  // Repeat rate: distinct patients in 90d with >= 2 confirmed appointments.
  const confirmed90 = await Appointment.find({
    date: appointmentDateField(ninetyDaysAgo),
    status: { $in: CONFIRMED_STATUSES },
  }).select('patientId').lean();
  const patientCounts = new Map();
  for (const a of confirmed90) {
    const key = String(a.patientId);
    patientCounts.set(key, (patientCounts.get(key) || 0) + 1);
  }
  const distinctPatients = patientCounts.size;
  const repeatPatients = [...patientCounts.values()].filter((c) => c >= 2).length;
  const repeatRatePct = distinctPatients > 0
    ? Math.round((repeatPatients / distinctPatients) * 1000) / 10
    : 0;

  const openTickets = await SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress', 'Waiting on User'] } });
  const payments30 = await Payment.countDocuments({ createdAt: { $gte: new Date(thirtyDaysAgo) } });
  const failed30 = await Payment.countDocuments({ createdAt: { $gte: new Date(thirtyDaysAgo) }, status: 'failed' });
  const payoutFailRatePct = payments30 > 0 ? Math.round((failed30 / payments30) * 1000) / 10 : 0;

  const criteria = [
    { key: 'supply_live_providers', label: 'Live providers in city', actual: providerCount, threshold: minProviders, comparison: '>=', passed: providerCount >= minProviders },
    { key: 'provider_utilization_pct', label: 'Providers with >=1 confirmed appointment (30d)', actual: providerUtilizationPct, threshold: minFillRatePct, comparison: '>=', passed: providerUtilizationPct >= minFillRatePct },
    { key: 'patient_repeat_pct', label: 'Patients who booked >=2 times (90d, platform-wide)', actual: repeatRatePct, threshold: minRepeatPct, comparison: '>=', passed: repeatRatePct >= minRepeatPct },
    { key: 'open_tickets', label: 'Open support tickets (global)', actual: openTickets, threshold: maxOpenTickets, comparison: '<=', passed: openTickets <= maxOpenTickets },
    { key: 'payout_fail_pct', label: 'Failed payments share (30d, global)', actual: payoutFailRatePct, threshold: maxPayoutFailPct, comparison: '<=', passed: payoutFailRatePct >= 0 && payoutFailRatePct <= maxPayoutFailPct },
  ];

  const ready = criteria.every((c) => c.passed);

  return {
    city: cityName,
    evaluatedAt: new Date().toISOString(),
    gate: {
      minProviders,
      minFillRatePct,
      minRepeatPct,
      maxOpenTickets,
      maxPayoutFailPct,
      lastGateReview: city?.launchGate?.lastGateReview || null,
    },
    metrics: {
      supply: { state: 'live_providers_30d', count: providerCount, providersWithConfirmed: activeProviders30 },
      utilization: { pct: providerUtilizationPct },
      // Honest platform-wide proxy: Appointment rows do not carry city, so
      // repeat rate is measured across all live providers, not city-scoped.
      repeat: { pct: repeatRatePct, distinctPatients90d: distinctPatients, repeatPatients },
      support: { openTickets },
      payout: { payments30d: payments30, failed: failed30, failRatePct: payoutFailRatePct },
    },
    criteria,
    ready,
  };
}
