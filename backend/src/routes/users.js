import express from 'express';
import User from '../models/User.js';
import { z } from 'zod';
import { protect, adminOnly, superadminOnly, authorize } from '../middleware/auth.js';
import { sendAccountBlockedEmail } from '../services/notificationService.js';
import { executeDeletion } from '../services/deletionService.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';

const blockUserSchema = z.object({ reason: z.string().optional() });
const flagUserSchema = z.object({ reason: z.string().optional() });

const router = express.Router();
const PLATFORM_ADMIN_TEAM_ROLES = new Set([
  'superadmin', 'platform_admin', 'kyc_reviewer', 'catalog_manager', 'moderator',
  'support_l1', 'support_l2', 'support_agent', 'finance_admin', 'city_manager',
  'medical_reviewer', 'clinical_safety', 'dpo', 'security_admin', 'analyst', 'auditor',
  'compliance_officer', 'content_editor',
]);
const adminDirectoryAccess = (req, res, next) => {
  if (req.user?.role === 'hospital_admin') return next();
  if (req.user?.role === 'superadmin') return authorize('users:manage')(req, res, next);
  return res.status(403).json({ message: 'Admin access required' });
};
const adminTeamMutationAccess = (req, res, next) => {
  if (req.user?.role === 'superadmin') {
    return authorize('users:manage')(req, res, () => requireStepUp('iam:role-change')(req, res, next));
  }
  return adminOnly(req, res, next);
};

router.get('/', protect, adminDirectoryAccess, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const filter = {};
    if (req.user.role === 'superadmin') {
      if (!PLATFORM_ADMIN_TEAM_ROLES.has(String(req.query.role || ''))) {
        return res.status(400).json({ message: 'A platform admin role filter is required' });
      }
      filter.role = req.query.role;
    } else if (req.query.role && req.query.role !== 'All') filter.role = req.query.role;
    if (req.query.flagged === 'true') filter.flagged = true;
    if (req.user.role !== 'superadmin') { if (!req.user.hospitalId) return res.status(403).json({ message: 'Hospital scope required' }); filter.hospitalId = req.user.hospitalId; }
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const result = await paginatedResults(User, filter, { page, limit });
    result.data = result.data.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active',
      isVerified: u.isVerified,
      twoFactorEnabled: Boolean(u.twoFactorEnabled),
      lastActive: u.lastActive || null,
      approvalStatus: u.approvalStatus,
      flagged: u.flagged || false,
      flagReason: u.flagReason || '',
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/block', protect, adminTeamMutationAccess, validate(blockUserSchema), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot block your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.role === 'superadmin' && !PLATFORM_ADMIN_TEAM_ROLES.has(user.role)) {
      return res.status(403).json({ message: 'Owner may only manage platform admin accounts here' });
    }
    if (req.user.role !== 'superadmin' && (!req.user.hospitalId || user.hospitalId?.toString() !== req.user.hospitalId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    if (user.status === 'blocked') {
      // ADMIN-BUG-02: immediately invalidate all sessions, drop presence, and disconnect sockets
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      const { removeUserPresence } = await import('../config/redis.js');
      await removeUserPresence(user._id.toString()).catch(() => {});
      const { getIO } = await import('../services/socketService.js');
      const io = getIO();
      if (io) {
        io.to(`user:${user._id}`).emit('session:revoked', { reason: 'account_suspended' });
        io.to(`user:${user._id}`).disconnectSockets(true);
      }
    }
    await user.save();

    if (user.status === 'blocked') {
      await sendAccountBlockedEmail(user);
    }
    await auditLog(user.status === 'blocked' ? 'block_user' : 'unblock_user', req.user._id, { targetUserId: user._id, ip: req.ip, userAgent: req.get('user-agent') });

    res.json({ message: user.status === 'blocked' ? 'User blocked' : 'User unblocked', status: user.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/flag', protect, superadminOnly, validate(flagUserSchema), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.flagged = true;
    user.flagReason = req.body.reason || '';
    await user.save();
    await auditLog('flag_user', req.user._id, { targetUserId: user._id, reason: req.body.reason, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'User flagged', flagged: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/unflag', protect, superadminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.flagged = false;
    user.flagReason = '';
    await user.save();
    await auditLog('unflag_user', req.user._id, { targetUserId: user._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'User unflagged', flagged: false });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user.role !== 'superadmin' && (!req.user.hospitalId || user.hospitalId?.toString() !== req.user.hospitalId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // DP-M-04: a raw findByIdAndDelete used to end here - sessions kept
    // working until JWT expiry, OpenSearch kept the user's docs, and nothing
    // told the lake. The DLM-06 chain now runs BEFORE the row goes away
    // (revokes sessions, purges search, anonymises), and its user.deleted
    // tombstone (emitted inside executeDeletion) propagates to analytics
    // copies. Chain failures are reported, not hidden - they must not
    // resurrect the row either, so the hard delete still happens.
    const { failed } = await executeDeletion(req.params.id, {
      reason: 'admin_delete',
      deletedBy: req.user.id,
    });
    await User.findByIdAndDelete(req.params.id);
    await auditLog('delete_user', req.user._id, {
      targetUserId: req.params.id,
      erasureFailures: failed,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({
      message: 'Deleted',
      ...(failed.length ? { erasureWarnings: failed } : {}),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
