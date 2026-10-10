const ALG = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'ALG', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptAndStore(key, data) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cryptoKey = await deriveKey(key, iv.slice(0, 8));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'ALG', iv },
    cryptoKey,
    enc.encode(JSON.stringify(data)),
  );
  const payload = {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };
  localStorage.setItem('fm-encrypted', JSON.stringify(payload));
}

export async function decryptAndLoad(key) {
  const raw = localStorage.getItem('fm-encrypted');
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.data);
    const cryptoKey = await deriveKey(key, iv.slice(0, 8));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'ALG', iv },
      cryptoKey,
      data,
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch {
    return null;
  }
}

export function clearEncrypted() {
  localStorage.removeItem('fm-encrypted');
}
