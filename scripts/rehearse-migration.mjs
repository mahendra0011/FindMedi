#!/usr/bin/env node
// Migration rehearsal (doc 18): runs migrate-doctor-subspecialties in dry-run
// then, only with --apply, applies on a throwaway DB. Defaults to dry-run.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const env = { ...process.env };
const throwawayMongoUri = env.MONGO_REPLICA_TEST_URI || env.MONGODB_URI;
if (!throwawayMongoUri) {
  console.error('Set MONGODB_URI or MONGO_REPLICA_TEST_URI to a throwaway database.');
  process.exit(1);
}
// The migration script reads MONGO_URI. Forward only the explicitly supplied
// throwaway target so the wrapper cannot silently fall back to backend/.env or
// localhost when the caller intended to rehearse against a disposable DB.
env.MONGO_URI = throwawayMongoUri;

console.log(`[rehearse] mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
const args = ['scripts/migrate-doctor-subspecialties.mjs'];
if (apply) args.push('--apply');
const r = spawnSync(process.execPath, ['--experimental-vm-modules', ...args], {
  cwd: path.resolve(process.cwd(), 'backend'),
  stdio: 'inherit',
  env,
});
process.exit(r.status ?? 0);
