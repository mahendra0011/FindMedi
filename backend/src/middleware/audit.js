import AuditLog from '../models/AuditLog.js';

export const auditLog = async (action, userId, details) => {
  try {
    await AuditLog.create({
      userId,
      action,
      details,
      ip: details.ip || null,
      userAgent: details.userAgent || null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};
