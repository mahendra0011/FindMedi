import express from 'express';
import crypto from 'node:crypto';
import Provider from '../models/Provider.js';
import ProviderStaffInvite from '../models/ProviderStaffInvite.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimit.js';
import { auditLog } from '../middleware/audit.js';
import { sendEmail } from '../services/notificationService.js';
import { PROVIDER_STAFF_TEMPLATES, roleRequiresTwoFactor } from '../lib/providerStaffRoles.js';
import { validate, providerStaffInviteSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

// 2.md 9 — the provider owner's side of staff invitation: list the team, issue
// a single-use expiring invite for one of the role TEMPLATES, revoke one.
//
// The REDEMPTION half lives in routes/auth.js (`POST /api/auth/provider-staff-setup`)
// beside doctor-setup/ambulance-setup, because it is a public password-setting
// flow with the same rate limit and the same shape.
//
// Authz model: the caller must be the listing's `ownerUserId`. A foreign id
// answers 404, never 403 — a 403 would confirm the listing exists (AUTHZ-B-04).
// No authorize() marker is needed: this is the same "self" ownership rule
// routes/join.js uses, enforced in the loader rather than by role.

const router = express.Router();

// 2.md 14: same rate-limit-before-auth ordering as routes/join.js.
router.use(generalLimiter, protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const INVITE_TTL_HOURS = 48;

async function loadOwnedProvider(req, res, providerId) {
  const caller = String(req.user._id ?? req.user.id ?? '');
  if (providerId) {
    if (!OBJECT_ID.test(String(providerId))) {
      res.status(404).json({ message: 'Not found' });
      return null;
    }
    const provider = await Provider.findOne({ _id: providerId, ownerUserId: caller });
    if (!provider) {
      res.status(404).json({ message: 'Not found' });
      return null;
    }
    return provider;
  }
  const owned = await Provider.find({ ownerUserId: caller }).select('_id name status').limit(2).lean();
  if (owned.length === 0) {
    res.status(404).json({ message: 'No provider listing is linked to this account' });
    return null;
  }
  if (owned.length > 1) {
    res.status(400).json({ message: 'This account owns more than one listing — pass providerId' });
    return null;
  }
  return Provider.findOne({ ownerUserId: caller });
}

// authz: self (owner of the listing)
//
// Team + pending invites for the owner's listing (2.md 9 status view).
router.get('/', async (req, res) => {
  try {
    const provider = await loadOwnedProvider(req, res, req.query.providerId);
    if (!provider) return null;

    const staffIds = (provider.staff ?? []).map((row) => row.userId);
    const [users, invites] = await Promise.all([
      staffIds.length > 0
        ? User.find({ _id: { $in: staffIds } }).select('name email role twoFactorEnabled').lean()
        : Promise.resolve([]),
      ProviderStaffInvite.find({
        providerId: provider._id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).select('email template role expiresAt createdAt').sort({ createdAt: -1 }).lean(),
    ]);
    const byId = new Map(users.map((u) => [String(u._id), u]));

    return res.json({
      provider: { _id: provider._id, name: provider.name, status: provider.status },
      staff: (provider.staff ?? []).map((row) => {
        const user = byId.get(String(row.userId)) ?? {};
        return {
          userId: row.userId,
          name: user.name ?? '',
          email: user.email ?? '',
          role: row.role,
          addedAt: row.addedAt,
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
        };
      }),
      invites: invites.map((row) => ({
        _id: row._id,
        email: row.email,
        template: row.template,
        role: row.role,
        expiresAt: row.expiresAt,
        twoFactorRequired: roleRequiresTwoFactor(row.role),
      })),
      templates: Object.entries(PROVIDER_STAFF_TEMPLATES).map(([key, value]) => ({
        key, role: value.role, label: value.label, description: value.description,
        twoFactorRequired: roleRequiresTwoFactor(value.role),
      })),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self (owner of the listing)
//
// Issue an invite (2.md 9). The client sends a TEMPLATE KEY; the role comes
// from PROVIDER_STAFF_TEMPLATES — no role from the client, exactly like
// routes/join.js takes no kind/tier from the client. The 128-bit code exists
// only inside the email; the API response never carries it.
router.post('/invite', validate(providerStaffInviteSchema), async (req, res) => {
  try {
    const { template, email, name, providerId } = req.body;
    const provider = await loadOwnedProvider(req, res, providerId);
    if (!provider) return null;

    const spec = PROVIDER_STAFF_TEMPLATES[template];

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser && (provider.staff ?? []).some((row) => String(row.userId) === String(existingUser._id))) {
      return res.status(409).json({ message: 'That person is already on this listing' });
    }
    const pending = await ProviderStaffInvite.exists({
      providerId: provider._id,
      email,
      usedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (pending) return res.status(409).json({ message: 'An invitation is already pending for that email' });

    const code = crypto.randomBytes(16).toString('base64url');
    const invite = await ProviderStaffInvite.create({
      code,
      providerId: provider._id,
      template,
      role: spec.role,
      email,
      name: name ?? '',
      invitedBy: req.user._id ?? req.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000),
    });

    const setupUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/provider-staff-setup?code=${encodeURIComponent(code)}`;
    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to join ${provider.name} on FindMedi`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #0b8a72;">FindMedi team invitation</h2>
            <p>${name ? `${name}, you have` : 'You have'} been invited to join <strong>${provider.name}</strong> as <strong>${spec.label}</strong>.</p>
            <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background: #0b8a72; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">Accept Invitation</a>
            <p style="margin-top: 24px; color: #666;">This single-use link expires in ${INVITE_TTL_HOURS} hours. If you did not expect this invitation, ignore this email.</p>
          </div>`,
        text: `You have been invited to join ${provider.name} on FindMedi as ${spec.label}. Accept here (expires in ${INVITE_TTL_HOURS}h): ${setupUrl}`,
      });
    } catch (err) {
      // The code only exists in the email — if the email never left, the invite
      // is worthless, so clean it up rather than leaving a dead pending row.
      await ProviderStaffInvite.deleteOne({ _id: invite._id }).catch(() => {});
      logger.warn(`provider staff invite email failed: ${err.message}`);
      return res.status(502).json({ message: 'Could not send the invitation email, please retry' });
    }

    await auditLog('provider_staff_invited', req.user._id ?? req.user.id, {
      providerId: String(provider._id),
      inviteId: String(invite._id),
      template,
      role: spec.role,
      email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      invite: {
        _id: invite._id,
        email: invite.email,
        template: invite.template,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      twoFactorRequired: roleRequiresTwoFactor(spec.role),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self (owner of the listing)
//
// Revoke a still-pending invite. A redeemed one is left alone — the audit trail
// of who joined matters more than tidiness.
router.delete('/invites/:id', async (req, res) => {
  try {
    if (!OBJECT_ID.test(String(req.params.id))) {
      return res.status(404).json({ message: 'Not found' });
    }
    const provider = await loadOwnedProvider(req, res, req.query.providerId);
    if (!provider) return null;

    const invite = await ProviderStaffInvite.findOne({
      _id: req.params.id,
      providerId: provider._id,
      usedAt: null,
    });
    if (!invite) return res.status(404).json({ message: 'No pending invitation with that id' });

    invite.revokedAt = new Date();
    await invite.save();

    await auditLog('provider_staff_invite_revoked', req.user._id ?? req.user.id, {
      providerId: String(provider._id),
      inviteId: String(invite._id),
      email: invite.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
