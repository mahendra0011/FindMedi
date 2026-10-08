import crypto from 'node:crypto';
import ApiKey from '../models/ApiKey.js';
import { auditLog } from './audit.js';

/**
 * File 25 §10: service-account auth (HL7/PACS/lab machines). Key arrives in
 * `x-api-key`; only the sha256 HASH is stored (show-once at creation).
 * Checks: exists, not revoked, not expired, IP binding. Attaches
 * req.serviceAccount { keyId, tenantId, policyId }. Updates lastUsedAt
 * (fire-and-forget). Human-user routes must NOT use this alone for PHI —
 * pair with the IAM evaluator via the key's policyId.
 */
const sha256 = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

export const apiKeyAuth = async (req, res, next) => {
  try {
    const raw = String(req.headers?.['x-api-key'] || '');
    if (!raw) return res.status(401).json({ message: 'API key required' });
    const key = await ApiKey.findOne({ prefix: raw.slice(0, 8) }).select('+hash');
    if (!key || key.hash !== sha256(raw)) {
      return res.status(401).json({ message: 'Invalid API key' });
    }
    if (key.revokedAt) return res.status(401).json({ message: 'API key revoked' });
    if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ message: 'API key expired' });
    }
    if (Array.isArray(key.ipBinding) && key.ipBinding.length > 0
      && !key.ipBinding.map(String).includes(String(req.ip || ''))) {
      await auditLog('apikey_ip_rejected', null, { keyId: key._id, ip: req.ip }).catch(() => {});
      return res.status(403).json({ message: 'API key not allowed from this IP' });
    }
    req.serviceAccount = {
      keyId: String(key._id), tenantId: key.tenantId ? String(key.tenantId) : null, policyId: key.policyId,
    };
    ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    next();
  } catch (err) {
    next(err);
  }
};

export default apiKeyAuth;
