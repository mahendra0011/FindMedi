import fs from 'fs';

// KEY=VALUE, optionally `export KEY=VALUE` (shell-rendered files often add it).
// Secret values may contain '=' (base64 padding), so only the FIRST '=' splits.
const LINE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*?)\s*$/;

/**
 * Parse a dotenv-shaped secrets file into a flat object.
 * Ignores blank lines and '#' comments; surrounding quotes are stripped so
 * `DB_URL="postgres://..."` and `DB_URL=postgres://...` are equivalent.
 *
 * Pure + exported separately so the parsing rules above are unit-testable
 * without touching process.env or the filesystem.
 */
export const parseSecretsFile = (raw) =>
  String(raw ?? '')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      if (!line.trim() || line.trimStart().startsWith('#')) return acc;
      const m = line.match(LINE_RE);
      if (!m) return acc;
      acc[m[1]] = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
      return acc;
    }, {});

/**
 * Overlay an externally-rendered secrets file (Doppler `secrets render`,
 * Vault Agent template, AWS Secrets Manager → KEY=VALUE) onto `target`.
 *
 * Precedence chain: platform-injected env > secrets file > .env
 *   - `.env` was already merged into process.env by dotenv before this runs,
 *     and a stale local .env must NOT shadow the real secrets file;
 *   - but vars the operator injected on the platform must survive, which is
 *     why the caller passes `protectedKeys` (the environment snapshot taken
 *     BEFORE dotenv ran).
 *
 * Throws if the file cannot be read — callers decide whether that is fatal.
 * Returns the count applied/protected so boot logs can prove the file was used.
 */
export const applySecretsFile = (filePath, protectedKeys, target = process.env) => {
  const protectedSet = protectedKeys instanceof Set
    ? protectedKeys
    : new Set(protectedKeys ?? []);
  const parsed = parseSecretsFile(fs.readFileSync(filePath, 'utf8'));
  let applied = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (protectedSet.has(key)) continue;
    target[key] = value;
    applied += 1;
  }
  return { applied, skipped: Object.keys(parsed).length - applied };
};
