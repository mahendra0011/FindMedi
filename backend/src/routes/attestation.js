import express from 'express';

const router = express.Router();

// Mobile device attestation (doc 15). Never report a trusted verdict until a
// real provider response has been cryptographically verified server-side.
router.post('/verify', async (req, res) => {
  const { platform, token } = req.body || {};
  if (!['android', 'ios'].includes(platform) || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'platform and token required' });
  }
  // Credentials alone do not prove a token. Provider verification is not yet
  // implemented; fail closed instead of minting a fabricated trusted verdict.
  return res.status(503).json({
    message: 'Attestation verification is unavailable',
    code: 'ATTESTATION_VERIFIER_UNAVAILABLE',
  });
});

export default router;
