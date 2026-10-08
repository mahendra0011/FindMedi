import express from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import ProviderApplication from '../models/ProviderApplication.js';
import ProviderDocument from '../models/ProviderDocument.js';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { generalLimiter } from '../middleware/rateLimit.js';
import { validateFileContent, scanBufferForMalware } from '../middleware/upload.js';
import { saveApplicationDocument } from '../services/applicationDocumentStore.js';
import {
  validate, createApplicationSchema, updateApplicationDraftSchema, joinDocumentSchema,
} from '../utils/validate.js';

const router = express.Router();

// 2.md 14: rate-limit every step of the join flow, and put the limiter BEFORE
// auth so an anonymous spray of drafts costs one Redis lookup rather than a
// JWT parse per attempt.
router.use(generalLimiter, protect);

// A malformed path param must be answered before any `findById` runs: mongoose
// would reject with a CastError inside an async middleware, and Express 4 never
// turns that into a response.
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

// 2.md 6: an applicant edits their own draft (and the steps a reviewer reopened
// with `needs_info`) and nothing else. Everything past that is the reviewer's.
const EDITABLE_STATUSES = new Set(['draft', 'needs_info']);
const SUBMITTABLE_STATUSES = new Set(['draft', 'needs_info']);

// 2.md 5/14: documented types only, magic-byte checked and scanned, 10MB cap.
const DOC_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_DOC_BYTES = 10 * 1024 * 1024;
// Autosave payload cap (2.md 3 "server-side draft"): drafts are bounded JSON,
// not an unbounded write-anywhere buffer.
const DRAFT_MAX_BYTES = 200_000;

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES },
  fileFilter: (req, file, cb) => cb(null, DOC_MIME_TYPES.has(file.mimetype)),
});

const acceptDocumentFile = (req, res, next) => {
  documentUpload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.code === 'LIMIT_FILE_SIZE'
          ? `Document exceeds the ${Math.round(MAX_DOC_BYTES / (1024 * 1024))}MB limit`
          : 'Document upload failed',
      });
    }
    if (!req.file) {
      return res.status(400).json({
        message: 'No document file received (multipart field "document", one of: pdf, jpeg, png, webp)',
      });
    }
    return next();
  });
};

// Own-application loader. A foreign id answers 404, not 403: a 403 would
// confirm the application exists (AUTHZ-B-04).
async function loadOwnApplication(req, res) {
  if (!OBJECT_ID.test(String(req.params.id))) {
    res.status(404).json({ message: 'Not found' });
    return null;
  }
  const application = await ProviderApplication.findById(req.params.id);
  const caller = String(req.user._id ?? req.user.id ?? '');
  if (!application || String(application.applicantUserId) !== caller) {
    res.status(404).json({ message: 'Not found' });
    return null;
  }
  return application;
}

const activeConfig = (typeKey) => ProviderTypeConfig.findOne({ typeKey, isActive: true });
const configuredDocKeys = (config) => [
  ...(config?.requiredDocs ?? []),
  ...(config?.optionalDocs ?? []),
].map((doc) => String(doc.key));
const requiredDocKeys = (config) => (config?.requiredDocs ?? []).map((doc) => String(doc.key));

// authz: self
//
// Start a draft (10.md 4.2 `POST /api/join/applications`). The client only
// chooses `typeKey`: kind, group, tier and the approval policy all come from
// the config row, so no privilege or classification is ever client-supplied
// (2.md 14 "no role from client").
router.post('/', validate(createApplicationSchema), async (req, res) => {
  try {
    const { typeKey, appealOf } = req.body;
    const config = await activeConfig(typeKey);
    if (!config) return res.status(400).json({ message: 'Unknown or disabled provider type' });

    if (appealOf) {
      const prior = await ProviderApplication.findById(appealOf);
      const caller = String(req.user._id ?? req.user.id ?? '');
      if (!prior || String(prior.applicantUserId) !== caller) {
        return res.status(404).json({ message: 'Not found' });
      }
      if (prior.status !== 'rejected') {
        return res.status(400).json({ message: 'Only a rejected application can be appealed' });
      }
      const existingAppeal = await ProviderApplication.findOne({ appealOf: prior._id });
      if (existingAppeal) return res.status(409).json({ message: 'This decision has already been appealed' });
    }

    const application = await ProviderApplication.create({
      applicantUserId: req.user._id ?? req.user.id,
      typeKey: config.typeKey,
      configVersion: config.version ?? 1,
      kind: config.kind ?? '',
      group: config.group ?? '',
      tier: config.tier ?? '',
      twoPersonApproval: Boolean(config.approvalPolicy?.twoPerson),
      appealOf: appealOf || null,
      status: 'draft',
      draft: { stepData: {} },
    });

    await auditLog('create_provider_application', req.user._id ?? req.user.id, {
      applicationId: String(application._id),
      typeKey: application.typeKey,
      appealOf: appealOf || null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(201).json({ application });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'A duplicate application reference was generated, please retry' });
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
//
// The applicant's own tracker (2.md 6 "status page"): always scoped to the
// caller, never a lookup by id a stranger could enumerate.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? ''), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? ''), 10) || 20));
    const filter = { applicantUserId: req.user._id ?? req.user.id };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.typeKey) filter.typeKey = String(req.query.typeKey);

    const [applications, total] = await Promise.all([
      ProviderApplication.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProviderApplication.countDocuments(filter),
    ]);
    return res.json({ applications, total, page, limit });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
//
// Status page payload: the application plus the documents it is blocked on,
// with the wizard draft (the applicant's own input) but no reviewer notes the
// applicant has not been told about... `needsInfo` IS the reviewer's message,
// so it is returned; `decisions` are theirs to see too (2.md 6: the applicant
// sees "received -> under review -> approved", and a rejection reason).
router.get('/:id', async (req, res) => {
  try {
    const application = await loadOwnApplication(req, res);
    if (!application) return null;
    const documents = await ProviderDocument.find({ applicationId: application._id })
      .select('docType status version expiryDate rejectionReason updatedAt')
      .lean();
    return res.json({ application, documents });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
//
// Wizard autosave (2.md 3). Shallow-merges per step key so saving the
// "location" step cannot clobber "account". Not audited: autosave fires on a
// debounce and would drown the audit trail; submit/decision/upload are audited.
router.patch('/:id', requireObjectId, validate(updateApplicationDraftSchema), async (req, res) => {
  try {
    const application = await loadOwnApplication(req, res);
    if (!application) return null;
    if (!EDITABLE_STATUSES.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and can no longer be edited` });
    }
    const incoming = req.body.draft ?? {};
    const serialized = JSON.stringify(incoming);
    if (serialized.length > DRAFT_MAX_BYTES) {
      return res.status(413).json({ message: `Draft step data exceeds ${DRAFT_MAX_BYTES} bytes` });
    }
    const stepData = {
      ...(application.draft?.stepData ?? {}),
      ...incoming,
    };
    application.draft = { ...(application.draft ?? {}), stepData };
    await application.save();
    return res.json({ application });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
//
// Submit for review (2.md 6). Two gates the client cannot skip: the status
// must be one the applicant can still act on, and every document the CONFIG
// requires for this type must already be on file (10.md 1: "backend me same
// config validate kare, frontend ka trust nahi").
router.post('/:id/submit', requireObjectId, async (req, res) => {
  try {
    const application = await loadOwnApplication(req, res);
    if (!application) return null;
    if (!SUBMITTABLE_STATUSES.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and cannot be submitted` });
    }

    const config = await activeConfig(application.typeKey);
    if (!config) return res.status(409).json({ message: 'The configuration for this provider type is unavailable' });

    const filed = await ProviderDocument.find({
      applicationId: application._id,
      status: { $in: ['uploaded', 'under_review', 'verified'] },
    }).select('docType').lean();
    const have = new Set(filed.map((doc) => String(doc.docType)));
    const missingDocs = requiredDocKeys(config).filter((key) => !have.has(key));
    if (missingDocs.length > 0) {
      return res.status(409).json({ message: 'Required documents are missing', missingDocs });
    }

    const resubmitting = application.status === 'needs_info';
    application.status = resubmitting ? 'resubmitted' : 'submitted';
    application.submittedAt = new Date();
    if (resubmitting) {
      application.resubmissionCount = (application.resubmissionCount ?? 0) + 1;
      for (const item of application.needsInfo ?? []) {
        if (!item.resolvedAt) item.resolvedAt = new Date();
      }
    }
    await application.save();

    await auditLog('submit_provider_application', req.user._id ?? req.user.id, {
      applicationId: String(application._id),
      typeKey: application.typeKey,
      status: application.status,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ application });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
//
// Multipart document upload (10.md 4.2). Order matters: the file is validated
// and only then written to disk, so a rejected docType or a closed application
// leaves nothing behind in storage. Re-posting a docType bumps `version` and
// returns the row to `uploaded` (10.md 2.4).
router.post('/:id/documents', requireObjectId, acceptDocumentFile, validate(joinDocumentSchema), async (req, res) => {
  try {
    const application = await loadOwnApplication(req, res);
    if (!application) return null;
    if (!EDITABLE_STATUSES.has(application.status)) {
      return res.status(409).json({ message: `Application is ${application.status} and does not accept documents` });
    }

    const config = await activeConfig(application.typeKey);
    if (!config) return res.status(409).json({ message: 'The configuration for this provider type is unavailable' });

    const { docType, expiryDate } = req.body;
    const knownKeys = new Set(configuredDocKeys(config));
    if (!knownKeys.has(docType)) {
      return res.status(400).json({ message: `This provider type does not ask for "${docType}"` });
    }
    const docSpec = [...(config.requiredDocs ?? []), ...(config.optionalDocs ?? [])]
      .find((doc) => String(doc.key) === docType);
    if (docSpec?.expiryRequired && !expiryDate) {
      return res.status(400).json({ message: `An expiry date is required for "${docType}"` });
    }

    const buffer = req.file.buffer;
    if (!(await validateFileContent(buffer, req.file.mimetype))) {
      return res.status(400).json({ message: 'File content does not match its declared type' });
    }
    // `clean:false` covers both a detected signature and `blocked:true` when
    // the scanner is required but unreachable - production medical uploads
    // never fall through unscanned (AUTH-021).
    const scan = await scanBufferForMalware(buffer);
    if (!scan.clean) {
      return res.status(400).json({ message: scan.blocked ? 'Malware scan unavailable, try again later' : 'File rejected: malware detected' });
    }

    const stored = await saveApplicationDocument(buffer, req.file.originalname);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const fileRef = {
      ...stored,
      originalName: String(req.file.originalname ?? '').slice(0, 255),
      mimetype: req.file.mimetype,
      sizeBytes: buffer.length,
    };
    const scanResult = {
      clean: true,
      skipped: Boolean(scan.skipped),
      blocked: false,
      engine: 'clamav',
      scannedAt: new Date(),
    };

    let document = await ProviderDocument.findOne({ applicationId: application._id, docType });
    if (document) {
      document.fileRef = fileRef;
      document.hash = hash;
      document.status = 'uploaded';
      document.expiryDate = expiryDate ?? null;
      document.verifiedBy = null;
      document.verifiedAt = null;
      document.rejectionReason = '';
      document.version = (document.version ?? 1) + 1;
      document.scanResult = scanResult;
      document.uploadedBy = req.user._id ?? req.user.id;
      document.uploadedAt = new Date();
      await document.save();
    } else {
      document = await ProviderDocument.create({
        applicationId: application._id,
        docType,
        fileRef,
        hash,
        status: 'uploaded',
        expiryDate: expiryDate ?? null,
        version: 1,
        scanResult,
        uploadedBy: req.user._id ?? req.user.id,
        uploadedAt: new Date(),
      });
    }

    await auditLog('upload_provider_document', req.user._id ?? req.user.id, {
      applicationId: String(application._id),
      documentId: String(document._id),
      docType,
      version: document.version,
      hash,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(201).json({ document });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
