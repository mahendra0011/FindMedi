import express from 'express';
import ProviderApplication from '../models/ProviderApplication.js';
import ProviderDocument from '../models/ProviderDocument.js';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import Provider from '../models/Provider.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, applicationDecisionSchema } from '../utils/validate.js';
import { APPLICATION_STATUSES } from '../lib/providerTypes.js';
import { mapApplicationToProvider } from '../lib/applicationToProvider.js';

const router = express.Router();

// 8.md 1 + 2: the KYC/onboarding queue is the kyc_reviewer's OWN console —
// least privilege means exactly two roles here (superadmin + kyc_reviewer),
// every decision audited, and two-person approval for high-risk types handled
// inside the decision handler.
router.use(protect, requireRole(['superadmin', 'kyc_reviewer']));

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

// 8.md 2: queues by lane. `pending` is the SLA-bearing default (oldest first).
const QUEUES = {
  pending: { status: { $in: ['submitted', 'resubmitted', 'under_review'] } },
  needs_info: { status: 'needs_info' },
  decided: { status: { $in: ['approved', 'rejected'] } },
  high_risk: { twoPersonApproval: true },
  escalated: { escalated: true },
  drafts: { status: 'draft' },
  all: {},
};

// authz: role
//
// Review queue (10.md 4.4 `GET /api/admin/applications`). Filters are closed
// sets - `queue` maps to a fixed filter and `status` must be a real state - so
// a caller cannot rewrite the query into a full-collection dump with a
// hand-rolled Mongo operator.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? ''), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? ''), 10) || 25));
    const queue = String(req.query.queue || 'pending');
    if (!QUEUES[queue]) return res.status(400).json({ message: `Unknown queue "${queue}"` });
    const filter = { ...QUEUES[queue] };

    if (req.query.status) {
      const status = String(req.query.status);
      if (!APPLICATION_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Unknown status "${status}"` });
      }
      filter.status = status;
    }
    if (req.query.typeKey) filter.typeKey = String(req.query.typeKey);
    if (req.query.group) filter.group = String(req.query.group);

    const [applications, total] = await Promise.all([
      // Oldest submitted first: the queue is an SLA (2.md 6), not a feed.
      ProviderApplication.find(filter)
        .sort({ submittedAt: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProviderApplication.countDocuments(filter),
    ]);
    return res.json({ applications, total, page, limit, queue });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
//
// Review workspace (8.md 2): applicant payload, the documents to inspect and
// the type's configured checklist in one response. `fileRef` is included here
// and nowhere public - reviewers are the audience the private storage exists
// for (2.md 5), and the read is audited by the decision that follows it.
router.get('/:id', requireObjectId, async (req, res) => {
  try {
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [documents, config] = await Promise.all([
      ProviderDocument.find({ applicationId: application._id }).lean(),
      ProviderTypeConfig.findOne({ typeKey: application.typeKey }),
    ]);
    return res.json({ application, documents, config });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
//
// The decision endpoint (10.md 4.4). State machine first, mutations second:
// an illegal transition is a 409 BEFORE anything is pushed onto the document,
// so a failed decision never leaves a half-written audit trail.
router.post('/:id/decision', requireObjectId, validate(applicationDecisionSchema), async (req, res) => {
  try {
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const DECIDABLE = new Set(['submitted', 'resubmitted', 'under_review']);
    if (!DECIDABLE.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and cannot be decided` });
    }
    // Mongoose always materialises these arrays; a partial update (or a future
    // lean() read) may not, and an undefined `.push` is a 500 mid-decision.
    if (!Array.isArray(application.checklistResults)) application.checklistResults = [];
    if (!Array.isArray(application.decisions)) application.decisions = [];
    if (!Array.isArray(application.needsInfo)) application.needsInfo = [];

    const { decision, reason, needsInfo, checklist } = req.body;
    if (decision === 'reject' && !reason) {
      return res.status(400).json({ message: 'A rejection reason is required' });
    }
    if (decision === 'needs_info' && (!needsInfo || needsInfo.length === 0)) {
      return res.status(400).json({ message: 'At least one needs-info item is required' });
    }

    // One read serves both the checklist gate below and the listing that an
    // approval materialises. A config row may have been edited since the
    // application was filed; `configVersion` on the application is the pin for
    // REQUIREMENTS, this row is only the current label/kind/doc vocabulary.
    const config = await ProviderTypeConfig.findOne({ typeKey: application.typeKey });

    // Two-person approval (2.md 6, 8.md 2): the SAME reviewer cannot supply
    // both approvals, and until the second arrives the status stays in review.
    let awaitingSecondApprover = false;
    if (decision === 'approve' && application.twoPersonApproval) {
      const firstBy = application.approvalState?.firstApprovedBy;
      const caller = String(req.user._id ?? req.user.id ?? '');
      if (!firstBy) {
        awaitingSecondApprover = true;
      } else if (String(firstBy) === caller) {
        return res.status(409).json({ message: 'Two-person approval requires a second, different reviewer' });
      }
    }

    // Checklist keys are the configured document keys: a reviewer cannot tick
    // an item the type never asked for (10.md 1 config-driven validation).
    if (checklist && checklist.length > 0) {
      const known = new Set([
        ...(config?.requiredDocs ?? []),
        ...(config?.optionalDocs ?? []),
      ].map((doc) => String(doc.key)));
      const unknown = checklist.filter((item) => !known.has(item.key));
      if (unknown.length > 0) {
        return res.status(400).json({ message: `Checklist key(s) not configured for this type: ${unknown.map((i) => i.key).join(', ')}` });
      }
    }

    const now = new Date();
    const callerId = req.user._id ?? req.user.id;

    if (application.twoPersonApproval && awaitingSecondApprover) {
      application.approvalState = { firstApprovedBy: callerId, firstApprovedAt: now };
      // Parked in review: the second, DIFFERENT reviewer is now the only one
      // who can close it, so the applicant is told nothing yet.
      application.status = 'under_review';
    } else if (decision === 'approve') {
      application.status = 'approved';
      application.decidedAt = now;
    } else if (decision === 'reject') {
      application.status = 'rejected';
      application.decidedAt = now;
      application.rejectionReason = reason;
    } else if (decision === 'needs_info') {
      application.status = 'needs_info';
      for (const item of needsInfo ?? []) {
        application.needsInfo.push({ docKey: item.docKey, comment: item.comment, by: callerId, at: now, resolvedAt: null });
      }
    } else if (decision === 'escalate') {
      application.status = 'under_review';
      application.escalated = true;
    }

    if (checklist && checklist.length > 0) {
      for (const item of checklist) {
        const existing = (application.checklistResults ?? []).find((row) => row.key === item.key);
        if (existing) {
          existing.status = item.status;
          existing.note = item.note ?? '';
          existing.by = callerId;
          existing.at = now;
        } else {
          application.checklistResults.push({ key: item.key, status: item.status, note: item.note ?? '', by: callerId, at: now });
        }
      }
    }

    // 10.md 6 step 4: approval is what turns the application into the listing
    // the directory will show. Materialised BEFORE the decision log is written
    // so the application gains its providerId in the same save - and only on a
    // FINAL approval: an application parked for a second reviewer must not have
    // a listing yet.
    let createdProvider = null;
    if (application.status === 'approved' && !application.providerId) {
      const provider = await Provider.create(
        mapApplicationToProvider(application, config, { verifiedBy: callerId, now }),
      );
      application.providerId = provider._id;
      createdProvider = provider;
    }

    // Append-only: 8.md 2 requires an immutable who/when/why decision log, so
    // nothing in this handler ever rewrites an earlier entry.
    application.decisions.push({ by: callerId, at: now, decision, reason: reason ?? '' });
    await application.save();

    if (createdProvider) {
      await auditLog('provider_created_from_application', callerId, {
        applicationId: String(application._id),
        providerId: String(createdProvider._id),
        typeKey: application.typeKey,
        targetUserId: String(application.applicantUserId),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    // 2.md 6: the applicant is told - in-app, no PII in the copy (2.md 14).
    // Keys are the DECISION values; an application parked for a second
    // approver is still `under_review` and is deliberately not notified.
    const notificationCopy = {
      needs_info: {
        title: 'More information needed',
        message: 'Your FindMedi application needs a few more details. Open your application to see what to add.',
      },
      approve: {
        title: 'Application approved',
        message: 'Your FindMedi application has been approved. Complete your profile to go live.',
      },
      reject: {
        title: 'Application not approved',
        message: 'Your FindMedi application was not approved. The reason is in your application history.',
      },
    }[decision];
    if (notificationCopy && application.status !== 'under_review') {
      await Notification.create({
        userId: String(application.applicantUserId),
        title: notificationCopy.title,
        message: notificationCopy.message,
        type: 'system',
        referenceId: String(application._id),
      }).catch(() => {});
    }

    await auditLog('application_decision', callerId, {
      applicationId: String(application._id),
      typeKey: application.typeKey,
      decision,
      status: application.status,
      targetUserId: String(application.applicantUserId),
      reason: reason ?? '',
      awaitingSecondApprover,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ application, awaitingSecondApprover });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
