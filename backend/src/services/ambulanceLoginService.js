import { randomBytes } from 'crypto';
import User from '../models/User.js';
import AmbulanceSetupCode from '../models/AmbulanceSetupCode.js';
import logger from '../config/logger.js';
import { randomPassword } from '../utils/secureRandom.js';

/**
 * FE-B-06: how long an ambulance setup link stays valid.
 *
 * 15 minutes, not 48 hours. The recipient is a driver who is being onboarded and
 * is looking at their email; they will click it immediately. 48 hours only widens
 * the window in which a forwarded or shared email is still a working credential.
 */
export const AMBULANCE_SETUP_TTL_MS = 15 * 60 * 1000;

/**
 * Doc 02 §3.2 — create User(role=ambulance) + 48h setup invite for a hospital ambulance.
 */
export async function createAmbulanceLogin(ambulance, adminUser, sendEmailFn) {
  const email = (ambulance.loginEmail || '').toLowerCase().trim();
  if (!email) throw new Error('Login email required');
  if (await User.findOne({ email })) throw new Error('Is email se user pehle se hai');

  const user = await User.create({
    name: ambulance.driverName || `Ambulance ${ambulance.registrationNumber}`,
    email,
    password: `${randomPassword(12)}A1!`,
    role: 'ambulance',
    phone: ambulance.driverPhone || ambulance.currentDriverPhone || '',
    hospitalId: ambulance.hospitalId,
    mustResetPassword: true,
    isVerified: false,
    status: 'active',
    approvalStatus: 'approved',
  });

  ambulance.userId = user._id;
  ambulance.loginStatus = 'invited';
  await ambulance.save();

  // ─── FE-B-06: a single-use, short-lived, OPAQUE setup code ──────────────────
  // The old link carried a 48-hour JWT in the URL. Three problems, in order of
  // severity:
  //   1. A JWT is a BEARER credential and it is self-describing — anyone holding
  //      it can decode the account email without consuming it.
  //   2. It sits in the URL, so it lands in browser history, in any proxy or
  //      gateway access log, and (if the page ever loads a third-party resource)
  //      in a Referer header. Nothing about a hash fragment protects it once the
  //      SPA reads it out of `location.hash`.
  //   3. 48 hours is a long window in which a forwarded email is a valid
  //      credential, and it was REUSABLE for the whole 48 hours.
  //
  // The replacement is an opaque 128-bit code with 128 bits of entropy, a 15
  // minute expiry, and a single-use consume that flips `usedAt` atomically. It
  // carries no claims, so it leaks nothing if read, and it stops working the
  // moment it is redeemed.
  const code = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + AMBULANCE_SETUP_TTL_MS);

  await AmbulanceSetupCode.create({
    code,
    userId: user._id,
    email,
    ambulanceId: ambulance._id,
    expiresAt,
  });

  // The code, not a JWT. `/auth/ambulance-setup` exchanges it for a session and
  // marks it used in the same operation.
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  const url = `${base}/#/ambulance-setup?code=${code}`;
  try {
    const send = sendEmailFn || (await import('./notificationService.js')).sendEmail;
    await send({
      to: email,
      subject: 'FindMedi — Ambulance account set up karein',
      html: `<p>${ambulance.registrationNumber} ke liye account bana hai.</p>`
        + `<a href="${url}">Password set karein</a>`
        + `<p>Link 15 minute me expire ho jayega aur sirf ek hi baar use ho sakta hai. `
        + `Koi bhi request kare to is email ko ignore kar dein.</p>`,
      text: `Password set karein (15 min, single use): ${url}`,
    });
  } catch (e) {
    logger.warn(`Ambulance invite email failed: ${e.message}`);
  }
  return { user, code, url, expiresAt };
}

/**
 * FE-B-06: consume an ambulance setup code and mint a session for its user.
 *
 * The consume is a single `findOneAndUpdate` with `usedAt: null` in the filter, so
 * two concurrent redemptions of the same code cannot both succeed — the loser
 * matches zero documents. An expired code is likewise filtered out at the query
 * level rather than after the fact.
 */
export async function consumeAmbulanceSetupCode(code, password, context = {}) {
  if (!code || typeof code !== 'string') {
    throw Object.assign(new Error('Setup code required'), { status: 400 });
  }

  const consumed = await AmbulanceSetupCode.findOneAndUpdate(
    {
      code: code.trim().toLowerCase(),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true }
  );

  if (!consumed) {
    // Do not distinguish "already used" from "never existed" from "expired" —
    // that difference is only useful to someone enumerating codes, and codes are
    // 128 bits, so enumeration is not the threat. A uniform message is.
    throw Object.assign(
      new Error('This setup link is invalid, already used, or has expired. Ask your administrator for a new invite.'),
      { status: 400 }
    );
  }

  const user = await User.findById(consumed.userId);
  if (!user) {
    throw Object.assign(new Error('This setup link is no longer valid.'), { status: 400 });
  }

  user.password = password;
  user.mustResetPassword = false;
  user.isVerified = true;
  await user.save();

  // Audit: an account was activated through a setup link.
  const { auditLog } = await import('../middleware/audit.js');
  await auditLog('ambulance_setup_complete', user._id, {
    ambulanceId: consumed.ambulanceId,
    ip: context.ip,
    userAgent: context.userAgent,
  }).catch(() => {});

  return { userId: user._id, email: user.email, role: user.role };
}
