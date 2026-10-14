import crypto from 'crypto';
import logger from '../config/logger.js';
import TwoPersonApproval from '../models/TwoPersonApproval.js';
import Notification from '../models/Notification.js';
import { getISTDateString } from '../utils/dateUtils.js';

// Active in-memory session registry for break-glass tokens (backed by DB TwoPersonApproval)
const activeBreakGlassSessions = new Map();

/**
 * Declares an emergency break-glass procedure to access locked PHI/facilities.
 * Emits CRITICAL audit logs and initiates a mandatory two-person post-incident review.
 */
export async function declareBreakGlass({
  userId,
  userName = 'Emergency Personnel',
  role = 'doctor',
  targetPatientId,
  targetHospitalId,
  emergencyReason,
  durationMinutes = 60,
  ip = '',
}) {
  if (!emergencyReason || emergencyReason.trim().length < 10) {
    const err = new Error('A detailed medical or administrative emergency reason (min 10 chars) is mandatory for break-glass');
    err.status = 400;
    throw err;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `bg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  // Create four-eyes post-incident review requirement
  const approvalRecord = await TwoPersonApproval.requestAction({
    actionType: 'break_glass',
    targetModel: 'Patient',
    targetId: String(targetPatientId || targetHospitalId || 'system'),
    requestedBy: userId,
    requestedByName: userName,
    payload: {
      sessionId,
      role,
      emergencyReason,
      durationMinutes,
      ip,
      targetPatientId,
      targetHospitalId,
    },
    requiredApprovalsCount: 2,
    expiresInHours: 72,
  });

  const session = {
    sessionId,
    token,
    userId: String(userId),
    userName,
    role,
    targetPatientId: targetPatientId ? String(targetPatientId) : null,
    targetHospitalId: targetHospitalId ? String(targetHospitalId) : null,
    emergencyReason,
    expiresAt,
    approvalId: approvalRecord._id,
    ip,
    declaredAt: new Date(),
  };

  activeBreakGlassSessions.set(token, session);

  logger.warn(`🚨 BREAK-GLASS DECLARED by ${userName} (${role}, ID=${userId}) for patient=${targetPatientId}. Reason: "${emergencyReason}"`);

  // Alert security and compliance officers
  try {
    const { default: User } = await import('../models/User.js');
    const securityAdmins = await User.find({ role: 'superadmin' }).select('_id').limit(10).lean();
    if (securityAdmins.length) {
      await Promise.allSettled(
        securityAdmins.map((admin) =>
          Notification.create({
            userId: admin._id,
            title: 'CRITICAL: Emergency Break-Glass Declared',
            message: `User ${userName} (${role}) invoked break-glass access for patient ${targetPatientId}. Reason: ${emergencyReason}`,
            type: 'security_alert',
            date: getISTDateString(),
          })
        )
      );
    }
  } catch (notifErr) {
    logger.error(`Failed to dispatch break-glass security notifications: ${notifErr.message}`);
  }

  return {
    sessionId,
    token,
    expiresAt,
    emergencyReason,
    approvalId: approvalRecord._id,
  };
}

/**
 * Validates whether an active break-glass token authorizes access to the target patient.
 */
export function verifyBreakGlassSession({ token, targetPatientId }) {
  if (!token) return { valid: false, reason: 'No break-glass token supplied' };

  const session = activeBreakGlassSessions.get(token);
  if (!session) return { valid: false, reason: 'Invalid or unknown break-glass session token' };

  if (new Date() > session.expiresAt) {
    activeBreakGlassSessions.delete(token);
    return { valid: false, reason: 'Break-glass session has expired' };
  }

  if (targetPatientId && session.targetPatientId && String(targetPatientId) !== String(session.targetPatientId)) {
    return { valid: false, reason: 'Break-glass token not authorized for this patient ID' };
  }

  return { valid: true, session };
}
