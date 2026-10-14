import express from 'express';
import ProviderApplication from '../models/ProviderApplication.js';
import ProviderDocument from '../models/ProviderDocument.js';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import Provider from '../models/Provider.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, applicationDecisionSchema, applicationActivationSchema,
  applicationClaimSchema, applicationAssignSchema,
} from '../utils/validate.js';
import { APPLICATION_STATUSES } from '../lib/providerTypes.js';
import { mapApplicationToProvider } from '../lib/applicationToProvider.js';
import { signFileUrl } from '../utils/signedFileUrl.js';

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
  // 2.md 11: submissions the automatic screen flagged (duplicate identity,
  // disposable inbox, payout-name mismatch) — the reviewer's fraud lane.
  flagged: { 'autoChecks.verdict': { $in: ['review', 'conflict'] } },
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
    const [documents, config, provider] = await Promise.all([
      ProviderDocument.find({ applicationId: application._id }).lean(),
      ProviderTypeConfig.findOne({ typeKey: application.typeKey }),
      // 2.md 7: the two activation stamps live on the LISTING, not on the
      // application — without this the workspace could not show whether a
      // reviewer already recorded the test booking or the training.
      application.providerId
        ? Provider.findById(application.providerId).select('_id onboarding').lean()
        : Promise.resolve(null),
    ]);
    // 2.md 5 / signed short-lived preview links: the workspace's `url` carries
    // a 10-minute signature bound to THIS reviewer (utils/signedFileUrl.js),
    // which is what lets the /uploads access check serve the file — an
    // unsigned fetch of the same path still needs Record ownership, and a
    // copied link expires (and belongs to one user) anyway. Remote storage
    // keeps its own URL (already provider-signed there).
    const reviewerId = String(req.user._id ?? req.user.id ?? '');
    const docs = documents.map((doc) => {
      const ref = doc.fileRef || {};
      const local = ref.storage !== 'remote' && ref.url;
      return { ...doc, url: local ? signFileUrl(ref.url, { userId: reviewerId }) : (ref.url || '') };
    });
    return res.json({ application, documents: docs, config, provider });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// 2.md 6 — the lanes a reviewer can take work from. Drafts belong to the
// applicant, decided rows are history; everything else is live review.
const CLAIMABLE_STATUSES = new Set(['submitted', 'resubmitted', 'under_review', 'needs_info']);

// The queue stamped on an assignment must be one of the console's lanes.
const claimableQueue = (raw) => {
  const queue = String(raw ?? 'pending');
  return Object.prototype.hasOwnProperty.call(QUEUES, queue) ? queue : null;
};

// authz: role
//
// 2.md 6 — review-queue ownership, append-only. `claim` is a reviewer saying
// "I am working this row". Both this and `assign` below APPEND to
// `reviewerAssignments`: who held the row and when is evidence, so a
// takeover never rewrites the earlier entry and the CURRENT holder is simply
// the last line. Re-claiming while already the last holder is a no-op rather
// than a duplicate row; a claim-vs-claim race degrades to two history rows,
// never to lost data (same check-then-save shape as the two-person gate).
router.post('/:id/claim', requireObjectId, validate(applicationClaimSchema), async (req, res) => {
  try {
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!CLAIMABLE_STATUSES.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and is not claimable` });
    }
    const queue = claimableQueue(req.body.queue);
    if (!queue) return res.status(400).json({ message: `Unknown queue "${req.body.queue}"` });

    if (!Array.isArray(application.reviewerAssignments)) application.reviewerAssignments = [];
    const caller = req.user._id ?? req.user.id;
    const last = application.reviewerAssignments[application.reviewerAssignments.length - 1];
    if (last && String(last.reviewerId) === String(caller)) {
      return res.json({ application, alreadyClaimed: true });
    }

    application.reviewerAssignments.push({
      reviewerId: caller, assignedBy: caller, assignedAt: new Date(), queue,
    });
    await application.save();

    await auditLog('application_claimed', caller, {
      applicationId: String(application._id),
      queue,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ application, alreadyClaimed: false });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: superadmin
//
// Handing a row to a NAMED reviewer. The assignee must be an active
// superadmin/kyc_reviewer per the DB row — never a role claim from the body —
// and gets an in-app ping with no PII in the copy (2.md 14). Assignment is
// also how work moves off a claim that went stale (there is no expiry clock;
// the last entry wins until the next claim/assign or the decision).
router.post('/:id/assign', requireRole(['superadmin']), requireObjectId, validate(applicationAssignSchema), async (req, res) => {
  try {
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!CLAIMABLE_STATUSES.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and cannot be assigned` });
    }
    const queue = claimableQueue(req.body.queue);
    if (!queue) return res.status(400).json({ message: `Unknown queue "${req.body.queue}"` });

    const reviewer = await User.findOne({
      _id: req.body.reviewerId,
      role: { $in: ['superadmin', 'kyc_reviewer'] },
      status: 'active',
    }).select('_id').lean();
    if (!reviewer) {
      return res.status(400).json({ message: 'reviewerId must be an active superadmin or kyc_reviewer' });
    }

    if (!Array.isArray(application.reviewerAssignments)) application.reviewerAssignments = [];
    const caller = req.user._id ?? req.user.id;
    application.reviewerAssignments.push({
      reviewerId: req.body.reviewerId, assignedBy: caller, assignedAt: new Date(), queue,
    });
    await application.save();

    await Notification.create({
      userId: String(req.body.reviewerId),
      title: 'Application assigned to you',
      message: 'A FindMedi application was assigned to your review queue. Open the review console to start.',
      type: 'system',
      referenceId: String(application._id),
    }).catch(() => {});

    await auditLog('application_assigned', caller, {
      applicationId: String(application._id),
      reviewerId: String(req.body.reviewerId),
      queue,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ application });
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

// authz: role
//
// 2.md 7 activation flags. Of the six checklist items only two are things the
// APPLICANT cannot prove themselves — the platform's own test booking and the
// onboarding walkthrough — so a reviewer stamps them here. They live on the
// Provider (not the application) because they outlive the approval that
// materialised the listing; 404 before approval, when there is no listing yet.
const ACTIVATION_FLAGS = {
  test_booking: 'testBookingAt',
  training: 'trainingCompletedAt',
};

router.post('/:id/activation', requireObjectId, validate(applicationActivationSchema), async (req, res) => {
  try {
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!application.providerId) {
      return res.status(409).json({ message: 'Application has no listing yet — approve it first' });
    }
    const provider = await Provider.findById(application.providerId);
    if (!provider) return res.status(404).json({ message: 'Listing not found' });

    const field = ACTIVATION_FLAGS[req.body.item];
    provider.onboarding = provider.onboarding ?? {};
    provider.onboarding[field] = req.body.done ? new Date() : null;
    await provider.save();

    await auditLog('application_activation_flag', req.user._id ?? req.user.id, {
      applicationId: String(application._id),
      providerId: String(provider._id),
      item: req.body.item,
      done: req.body.done,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ providerId: provider._id, onboarding: provider.onboarding });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
