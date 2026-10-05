import express from 'express';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
// AUTHZ-M-03 (F7): the audit trail itself is a sensitive export.
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
// AUD-B-01: a `$regex` built from user input is a ReDoS vector.
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { paginatedResults } from '../utils/pagination.js';
// AUD-B-01: the search is an expensive, privileged query - bound it.
import { auditSearchLimiter } from '../middleware/rateLimit.js';
import logger from '../config/logger.js';
import { sendServerError } from '../utils/safeError.js';

const router = express.Router();

// ADM-M-02: "who approved whom, when" must be answerable by TARGET, not only by
// actor - the approval pages deep-link straight to one record's history. Actions
// store their target under different detail keys (targetUserId, targetHospitalId,
// facilityId, profileId, ...), so a target filter fans out across all of them.
// Hex24 values are offered to Mongo in BOTH string and ObjectId form: some
// actions store ids as strings, some as ObjectIds, and a Mixed path does not
// cast on query - one form only would silently miss half the trail.
const TARGET_DETAIL_KEYS = [
  'targetUserId', 'targetHospitalId', 'targetDoctorId',
  'facilityId', 'profileId', 'resourceId', 'tokenId',
];

const buildAuditFilter = async (req) => {
  const { action, userId, search, target } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (userId) filter.userId = userId;

  // Non-superadmin users only see their own audit logs
  if (req.user.role !== 'superadmin') {
    filter.userId = req.user._id.toString();
  }

  const orClauses = [];

  if (target) {
    const v = String(target).slice(0, 64);
    const isHex24 = /^[0-9a-f]{24}$/i.test(v);
    for (const key of TARGET_DETAIL_KEYS) {
      orClauses.push({ [`details.${key}`]: v });
      if (isHex24) orClauses.push({ [`details.${key}`]: new mongoose.Types.ObjectId(v) });
    }
  }

  if (search) {
    // AUD-B-01: the search term went straight into three `$regex` clauses.
    // That is two problems: an attacker-authored pattern can force catastrophic
    // backtracking (Mongo burns CPU on every request -> a cheap DoS from a
    // low-privilege `audit:read` holder), and it doubles as a bulk dump oracle.
    // escapeRegex removes the metacharacters; capSearch bounds the length, so
    // there is no exponential shape left to exploit.
    const term = escapeRegex(capSearch(String(search)));
    if (term) {
      const userIds = await User.find({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
        ],
      }).select('_id').lean();
      const matchedUserIds = userIds.map(u => u._id.toString());
      orClauses.push({ action: { $regex: term, $options: 'i' } });
      orClauses.push({ userId: { $in: matchedUserIds } });
      orClauses.push({ details: { $regex: term, $options: 'i' } });
    }
  }

  if (orClauses.length) filter.$or = orClauses;
  return filter;
};

router.get('/', protect, authorize('audit:read'), auditSearchLimiter, async (req, res) => {
  try {
    const filter = await buildAuditFilter(req);

    // AUD-B-01: clamped pagination. `limit` was `parseInt(req.query.limit)` with no
    // bounds, so limit=1000000 dumped the whole audit trail in one request and
    // limit=abc produced NaN -> a Mongo error -> a 500 with a raw message.
    // paginatedResults clamps and returns a well-formed envelope.
    const { page, limit } = req.query;
    const result = await paginatedResults(AuditLog, filter, {
      page: page || 1,
      limit: limit || 50,
      sort: { timestamp: -1 },
    });
    const logs = result.data || [];
    const total = result.total;

    const userIds = [...new Set(logs.map(l => l.userId?.toString()).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('name email role').lean()
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = logs.map(l => ({
      ...l,
      user: l.userId ? userMap[l.userId.toString()] || null : null,
    }));

    res.json({
      logs: enriched,
      total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    logger.error(`audit search error: ${err.message}`);
    sendServerError(res, err, 'Could not search the audit log');
  }
});

// ADM-M-02 (export): the trail has to leave Mongo for an incident pack or a
// DPDP disclosure. Three properties this endpoint must keep:
//   - SAME filter as the list view (own-logs-only for non-superadmins included),
//     so export cannot become the wider read the UI refused;
//   - CAPPED: a full-trail dump is a one-request bulk exfiltration channel for
//     any audit:read holder, so rows stop at EXPORT_MAX_ROWS and the self-audit
//     row records whether the cap bit (truncated);
//   - SELF-AUDITED: exporting the audit trail is itself an admin action.
const EXPORT_MAX_ROWS = 10000;

router.get('/export', protect, authorize('audit:read'), auditSearchLimiter, requireStepUp('export:full'), async (req, res) => {
  try {
    const filter = await buildAuditFilter(req);
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(EXPORT_MAX_ROWS).lean();

    const userIds = [...new Set(logs.map(l => l.userId?.toString()).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('name email').lean()
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // CSV cell rules: quote everything, double inner quotes, flatten newlines
    // (a literal newline inside a cell breaks naive splitters), and defuse
    // spreadsheet formula injection - a cell starting with =, +, - or @ is
    // executed by Excel/Sheets when the operator opens the export.
    const csvCell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      s = s.replace(/\r?\n/g, ' ');
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['timestamp', 'action', 'actorName', 'actorEmail', 'userId', 'target', 'ip', 'userAgent', 'details'];
    const rows = logs.map(l => {
      const target = TARGET_DETAIL_KEYS.map(k => l.details?.[k]).find(Boolean) || '';
      const actor = l.userId ? userMap[l.userId.toString()] : null;
      return [
        l.timestamp ? new Date(l.timestamp).toISOString() : '',
        l.action,
        actor?.name || '',
        actor?.email || '',
        l.userId ? String(l.userId) : '',
        target ? String(target) : '',
        l.ip || '',
        l.userAgent || '',
        l.details ? JSON.stringify(l.details) : '',
      ].map(csvCell).join(',');
    });
    // BOM: without it Excel reads UTF-8 as ANSI and mangles every non-ASCII name.
    const csv = '\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';

    await auditLog('audit_exported', req.user._id, {
      rows: logs.length,
      truncated: logs.length >= EXPORT_MAX_ROWS,
      filter: {
        action: req.query.action ? String(req.query.action).slice(0, 120) : null,
        target: req.query.target ? String(req.query.target).slice(0, 64) : null,
        search: req.query.search ? String(req.query.search).slice(0, 120) : null,
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-export-${stamp}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(csv);
  } catch (err) {
    logger.error(`audit export error: ${err.message}`);
    sendServerError(res, err, 'Could not export the audit log');
  }
});

router.get('/stats', protect, authorize('audit:read'), auditSearchLimiter, async (req, res) => {
  try {
    const matchFilter = req.user.role !== 'superadmin' ? { userId: req.user._id.toString() } : {};
    const totalLogs = await AuditLog.countDocuments(matchFilter);
    const actionCounts = await AuditLog.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    const last24h = await AuditLog.countDocuments({
      ...matchFilter,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const uniqueUsers = req.user.role === 'superadmin'
      ? await AuditLog.distinct('userId')
      : [req.user._id];
    const uniqueActions = await AuditLog.distinct('action', matchFilter);

    res.json({
      totalLogs, last24h,
      uniqueUsers: uniqueUsers.length,
      uniqueActions: uniqueActions.length,
      topActions: actionCounts,
    });
  } catch (err) {
    // AUD-B-01 (partial): the stats leg still echoed err.message (CastError /
    // MongoServerError text) to any audit:read holder. Same safe envelope as GET /.
    logger.error(`audit stats error: ${err.message}`);
    sendServerError(res, err, 'Could not load audit stats');
  }
});

export default router;
