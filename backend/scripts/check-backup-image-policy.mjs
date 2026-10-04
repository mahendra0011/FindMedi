import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE_FILE = path.join(ROOT, 'infra', 'docker-compose.prod.yml');
const IMAGE_TEMPLATE = '${BACKUP_IMAGE:?set BACKUP_IMAGE to an immutable repository@sha256 digest}';

export function isImmutableImageDigest(image) {
  return /^(?:[A-Za-z0-9.-]+(?::[0-9]+)?\/)?[A-Za-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(String(image || ''));
}

function serviceBlock(compose, serviceName) {
  const match = compose.match(new RegExp(`^  ${serviceName}:\\r?\\n([\\s\\S]*?)(?=^  [A-Za-z0-9_-]+:|^volumes:|\\Z)`, 'm'));
  return match?.[1] || null;
}

export function assertBackupImagePolicy(compose, backupImage = undefined) {
  const images = ['backup', 'backup-drill'].map((service) => {
    const block = serviceBlock(compose, service);
    if (!block) throw new Error(`production compose is missing ${service} service`);
    const image = block.match(/^[ ]{4}image:\s*(.+)\s*$/m)?.[1];
    if (image !== IMAGE_TEMPLATE) {
      throw new Error(`${service}.image must require the shared BACKUP_IMAGE digest variable`);
    }
    return image;
  });
  if (images[0] !== images[1]) throw new Error('backup and backup-drill must use the same image reference');
  if (backupImage !== undefined && !isImmutableImageDigest(backupImage)) {
    throw new Error('BACKUP_IMAGE must be an immutable repository@sha256:<64 lowercase hex> reference');
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const compose = fs.readFileSync(COMPOSE_FILE, 'utf8');
    assertBackupImagePolicy(compose, process.env.BACKUP_IMAGE);
    console.log(process.env.BACKUP_IMAGE
      ? 'Backup image policy OK: backup and restore drill share an immutable digest.'
      : 'Backup image template policy OK; set BACKUP_IMAGE to a repository@sha256 digest when rendering production compose.');
  } catch (error) {
    console.error(`Backup image policy failed: ${error.message}`);
    process.exitCode = 1;
  }
}
