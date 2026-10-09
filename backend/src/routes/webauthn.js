import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 22 P2-31: WebAuthn passkeys (step-up second factor). Registration +
// authentication ceremonies per @simplewebauthn/server; challenges live in
// memory with a 5-minute TTL (single-instance safe; multi-instance needs
// Redis — documented, not silently broken).
// RP ID derives from WEBAUTHN_RP_ID (default: request hostname).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const challenges = new Map(); // userId -> { challenge, expires }

const rpName = () => process.env.WEBAUTHN_RP_NAME || 'FindMedi';
const rpID = (req) => process.env.WEBAUTHN_RP_ID || String(req.hostname || 'localhost').split(':')[0];
const originOf = (req) => process.env.WEBAUTHN_ORIGIN
  || `${req.protocol}://${req.get('host')}`;

function rememberChallenge(userId, challenge) {
  challenges.set(String(userId), { challenge, expires: Date.now() + 5 * 60 * 1000 });
  if (challenges.size > 1000) {
    const first = challenges.keys().next().value;
    challenges.delete(first);
  }
}

function takeChallenge(userId) {
  const row = challenges.get(String(userId));
  if (!row) return null;
  challenges.delete(String(userId));
  if (row.expires < Date.now()) return null;
  return row.challenge;
}

router.get('/passkeys', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('passkeys').lean();
    return res.json({
      passkeys: (user?.passkeys || []).map((p) => ({
        credentialID: p.credentialID, name: p.name, createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Registration: options → client → verify.
router.post('/register/options', async (req, res) => {
  try {
    const { generateRegistrationOptions } = await import('@simplewebauthn/server');
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: 'Not found' });
    const options = await generateRegistrationOptions({
      rpName: rpName(), rpID: rpID(req),
      userID: new TextEncoder().encode(String(user._id)),
      userName: user.email || String(user._id),
      attestationType: 'none',
      excludeCredentials: (user.passkeys || []).map((p) => ({
        id: p.credentialID, type: 'public-key', transports: p.transports || undefined,
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    rememberChallenge(req.user._id, options.challenge);
    return res.json(options);
  } catch (err) {
    logger.error(`WebAuthn reg options error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/register/verify', async (req, res) => {
  try {
    const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
    const challenge = takeChallenge(req.user._id);
    if (!challenge) return res.status(409).json({ message: 'Challenge expired — restart registration' });
    const verification = await verifyRegistrationResponse({
      response: req.body, expectedChallenge: challenge,
      expectedOrigin: originOf(req), expectedRPID: rpID(req),
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Registration not verified' });
    }
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const user = await User.findById(req.user._id);
    user.passkeys.push({
      credentialID: credential.id, publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter, transports: credential.transports || [],
      name: String(req.body?.name || req.headers?.['user-agent'] || 'passkey').slice(0, 80),
      createdAt: new Date(),
    });
    await user.save();
    await auditLog('passkey_registered', actorId(req), {
      deviceType: credentialDeviceType, backedUp: credentialBackedUp, ip: req.ip,
    });
    return res.status(201).json({ verified: true });
  } catch (err) {
    logger.error(`WebAuthn reg verify error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

router.delete('/passkeys/:credentialID', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const before = (user.passkeys || []).length;
    user.passkeys = (user.passkeys || []).filter((p) => p.credentialID !== req.params.credentialID);
    if (user.passkeys.length === before) return res.status(404).json({ message: 'Not found' });
    await user.save();
    await auditLog('passkey_removed', actorId(req), { ip: req.ip });
    return res.json({ removed: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Authentication: options → client → verify (mints a step-up grant receipt
// the client presents wherever requireStepUp challenges).
router.post('/auth/options', async (req, res) => {
  try {
    const { generateAuthenticationOptions } = await import('@simplewebauthn/server');
    const user = await User.findById(req.user._id).select('passkeys').lean();
    if (!user?.passkeys?.length) return res.status(404).json({ message: 'No passkeys registered' });
    const options = await generateAuthenticationOptions({
      rpID: rpID(req),
      allowCredentials: user.passkeys.map((p) => ({
        id: p.credentialID, type: 'public-key', transports: p.transports || undefined,
      })),
      userVerification: 'preferred',
    });
    rememberChallenge(req.user._id, options.challenge);
    return res.json(options);
  } catch (err) {
    logger.error(`WebAuthn auth options error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/auth/verify', async (req, res) => {
  try {
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
    const challenge = takeChallenge(req.user._id);
    if (!challenge) return res.status(409).json({ message: 'Challenge expired — restart' });
    const user = await User.findById(req.user._id);
    const stored = (user.passkeys || []).find((p) => p.credentialID === req.body?.id);
    if (!stored) return res.status(404).json({ message: 'Unknown credential' });
    const verification = await verifyAuthenticationResponse({
      response: req.body, expectedChallenge: challenge,
      expectedOrigin: originOf(req), expectedRPID: rpID(req),
      credential: {
        id: stored.credentialID,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, 'base64url')),
        counter: stored.counter,
        transports: stored.transports,
      },
    });
    if (!verification.verified) return res.status(401).json({ message: 'Authentication failed' });
    stored.counter = verification.authenticationInfo.newCounter;
    await user.save();
    await auditLog('passkey_login', actorId(req), { ip: req.ip });
    return res.json({ verified: true, stepUp: true });
  } catch (err) {
    logger.error(`WebAuthn auth verify error: ${err.message}`);
    return res.status(401).json({ message: 'Authentication failed' });
  }
});

export default router;
