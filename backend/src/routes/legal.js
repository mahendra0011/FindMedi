import express from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import {
  listLegalDocuments, getLegalDocument,
} from '../lib/legalDocs.js';
import {
  POLICY_CONTEXTS, recordPolicyAcceptance, getLatestAcceptance,
} from '../lib/policyAcceptance.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// Spec 3.1: Community Guidelines + Provider Agreement are first-class,
// versioned documents. Reads are public (a visitor can read before joining);
// acceptance is authenticated and version-pinned to the server's current copy.
const router = express.Router();

const ACCEPTANCE_CONTEXTS = ['community_guidelines', 'provider_agreement']
  .filter((c) => POLICY_CONTEXTS.includes(c));

// authz: public
router.get('/documents', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ documents: listLegalDocuments() });
});

// authz: public
router.get('/documents/:context', (req, res) => {
  const doc = getLegalDocument(req.params.context);
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ document: doc });
});

const acceptSchema = z.object({
  context: z.enum(ACCEPTANCE_CONTEXTS),
  templateVersion: z.string().trim().min(1).max(40),
}).strict();

// authz: self
router.post('/accept', protect, validate(acceptSchema), async (req, res) => {
  try {
    const { context, templateVersion } = req.body;
    const doc = getLegalDocument(context);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.version !== templateVersion) {
      return res.status(409).json({
        message: 'Document has been updated; reload and accept the current version',
        currentVersion: doc.version,
        documentHash: doc.documentHash,
      });
    }
    const userId = req.user._id ?? req.user.id;
    const acceptance = await recordPolicyAcceptance({
      userId,
      providerId: req.user.providerId || null,
      templateId: doc.templateId,
      templateVersion: doc.version,
      context,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
      documentHash: doc.documentHash,
    });
    await auditLog('legal_document_accept', userId, {
      context, templateVersion: doc.version, documentHash: doc.documentHash, ip: req.ip,
    });
    return res.status(201).json({ acceptance });
  } catch (err) {
    logger.error(`Legal accept error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
router.get('/acceptances', protect, async (req, res) => {
  try {
    const userId = req.user._id ?? req.user.id;
    const latest = await Promise.all(
      ACCEPTANCE_CONTEXTS.map(async (context) => {
        const doc = getLegalDocument(context);
        const row = await getLatestAcceptance(userId, doc.templateId);
        return {
          context,
          currentVersion: doc.version,
          latest: row
            ? { templateVersion: row.templateVersion, acceptedAt: row.acceptedAt }
            : null,
          upToDate: Boolean(row && row.templateVersion === doc.version),
        };
      }),
    );
    return res.json({ acceptances: latest });
  } catch (err) {
    logger.error(`Legal acceptance status error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch acceptances' });
  }
});

export default router;
