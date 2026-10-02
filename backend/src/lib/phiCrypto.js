import { webcrypto } from 'node:crypto';

// Node mirror of infra/rust-telemetry/src/crypto.rs (Tech 10 envelope).
// Contract: { kid, n: base64(12B nonce), c: base64(ct) }
// DEK = SHA256(master_key || '|' || kid). AES-256-GCM via WebCrypto.
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64e(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function b64d(s) {
  return new Uint8Array(Buffer.from(s, 'base64'));
}

async function dekFor(master, kid) {
  const h = await webcrypto.subtle.digest(
    'SHA-256',
    Buffer.concat([Buffer.from(master, 'utf8'), Buffer.from('|'), Buffer.from(kid, 'utf8')])
  );
  return webcrypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptPhiField(master, kid, plaintext) {
  const key = await dekFor(master, kid);
  const nonce = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext
  );
  return { kid, n: b64e(nonce), c: b64e(new Uint8Array(ct)) };
}

export async function decryptPhiField(master, env) {
  if (!env?.kid || !env?.n || !env?.c) throw new Error('bad envelope');
  const key = await dekFor(master, env.kid);
  const pt = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64d(env.n) },
    key,
    b64d(env.c)
  );
  return dec.decode(pt);
}

// SHA-256 hex for Aadhaar-hash storage (never store plaintext Aadhaar).
export async function sha256Hex(input) {
  const h = await webcrypto.subtle.digest('SHA-256', enc.encode(input));
  return Buffer.from(h).toString('hex');
}

// Ephemeral ECDH (X25519) HIP↔HIU session (ABDM M3): each side generates an
// ephemeral pair, exchanges raw public keys inside the consent handshake,
// and derives the same 32B session secret without ever transmitting it.
export async function generateEcdhPair() {
  const pair = await webcrypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
  const [rawPub, rawPriv] = await Promise.all([
    webcrypto.subtle.exportKey('raw', pair.publicKey),
    webcrypto.subtle.exportKey('pkcs8', pair.privateKey),
  ]);
  return {
    publicB64: b64e(new Uint8Array(rawPub)),
    privatePkcs8B64: b64e(new Uint8Array(rawPriv)),
  };
}

export async function deriveEcdhSecret(privatePkcs8B64, peerPublicB64) {
  const privKey = await webcrypto.subtle.importKey(
    'pkcs8', b64d(privatePkcs8B64), { name: 'X25519' }, false, ['deriveBits']
  );
  const pubKey = await webcrypto.subtle.importKey(
    'raw', b64d(peerPublicB64), { name: 'X25519' }, false, []
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'X25519', public: pubKey }, privKey, 256
  );
  return b64e(new Uint8Array(bits));
}
