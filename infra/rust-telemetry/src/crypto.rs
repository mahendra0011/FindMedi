//! Field-level envelope encryption (AES-256-GCM, Tech 10).
//! Contract: JSON `{"kid":"<key-id>","n":"<base64 nonce 12B>","c":"<base64 ct>"}`
//! DEK = SHA256(master_key || kid) — per-patient/per-purpose keys without a
//! KMS round-trip. Node mirror: backend/src/lib/phiCrypto.js (same vector).

use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};
use rand::RngCore;
use sha2::{Digest, Sha256};

fn dek_for(master: &[u8], kid: &str) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(master);
    h.update(b"|");
    h.update(kid.as_bytes());
    h.finalize().into()
}

pub fn encrypt_field(master: &[u8], kid: &str, plaintext: &[u8]) -> serde_json::Value {
    let dek = dek_for(master, kid);
    let cipher = Aes256Gcm::new_from_slice(&dek).expect("dek length");
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let ct = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
        .expect("encrypt");
    serde_json::json!({
        "kid": kid,
        "n": base64_encode(&nonce_bytes),
        "c": base64_encode(&ct),
    })
}

pub fn decrypt_field(master: &[u8], env: &serde_json::Value) -> Result<Vec<u8>, String> {
    let kid = env.get("kid").and_then(|v| v.as_str()).ok_or("missing kid")?;
    let n = env.get("n").and_then(|v| v.as_str()).ok_or("missing nonce")?;
    let c = env.get("c").and_then(|v| v.as_str()).ok_or("missing ct")?;
    let nonce = base64_decode(n).map_err(|e| e.to_string())?;
    let ct = base64_decode(c).map_err(|e| e.to_string())?;
    let dek = dek_for(master, kid);
    let cipher = Aes256Gcm::new_from_slice(&dek).map_err(|e| e.to_string())?;
    cipher
        .decrypt(Nonce::from_slice(&nonce), ct.as_slice())
        .map_err(|e| e.to_string())
}

fn base64_encode(b: &[u8]) -> String {
    const ALPH: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::new();
    let mut i = 0;
    while (i < b.len()) {
        let b0 = b[i] as u32;
        let b1 = if (i + 1 < b.len()) { b[i + 1] as u32 } else { 0 };
        let b2 = if (i + 2 < b.len()) { b[i + 2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        s.push(ALPH[((n >> 18) & 63) as usize] as char);
        s.push(ALPH[((n >> 12) & 63) as usize] as char);
        s.push(if (i + 1 < b.len()) { ALPH[((n >> 6) & 63) as usize] as char } else { '=' });
        s.push(if (i + 2 < b.len()) { ALPH[(n & 63) as usize] as char } else { '=' });
        i += 3;
    }
    s
}

fn base64_decode(s: &str) -> Result<Vec<u8>, &'static str> {
    let tbl = |c: u8| -> Result<u8, &'static str> {
        match c {
            b'A'..=b'Z' => Ok(c - b'A'),
            b'a'..=b'z' => Ok(c - b'a' + 26),
            b'0'..=b'9' => Ok(c - b'0' + 52),
            b'+' => Ok(62),
            b'/' => Ok(63),
            _ => Err("bad char"),
        }
    };
    let bytes: Vec<u8> = s.bytes().filter(|&c| c != b'=').collect();
    let mut out = Vec::new();
    let mut i = 0;
    while (i < bytes.len()) {
        let mut n: u32 = 0;
        let mut count = 0;
        for j in 0..4 {
            if (i + j < bytes.len()) {
                n = (n << 6) | (tbl(bytes[i + j])? as u32);
                count += 1;
            } else {
                n <<= 6;
            }
        }
        if (count >= 2) { out.push(((n >> 16) & 255) as u8); }
        if (count >= 3) { out.push(((n >> 8) & 255) as u8); }
        if (count >= 4) { out.push((n & 255) as u8); }
        i += 4;
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn roundtrip() {
        let master = b"test-master-key-0123456789";
        let env = encrypt_field(master, "patient:123", b"HIV-positive");
        let pt = decrypt_field(master, &env).unwrap();
        assert_eq!(pt, b"HIV-positive");
    }
    #[test]
    fn wrong_master_fails() {
        let env = encrypt_field(b"master-a", "k", b"secret");
        assert!(decrypt_field(b"master-b", &env).is_err());
    }
}
