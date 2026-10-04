import fs from 'node:fs';
import path from 'node:path';

export function writeAuditArtifact(dir, name, audit) {
  fs.mkdirSync(dir, { recursive: true });
  const output = path.join(dir, `${name}-npm-audit.json`);
  fs.writeFileSync(output, `${JSON.stringify(audit, null, 2)}\n`);
  return output;
}
