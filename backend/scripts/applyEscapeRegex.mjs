// REC-006 / PHARMA-003: escape + length-cap every user-supplied string that
// reaches `new RegExp`. Rewrites `new RegExp(<ident>, 'i')` to
// `new RegExp(escapeRegex(capSearch(<ident>)), 'i')`.
//
// Deliberately keeps the `new RegExp(...)` shape (rather than switching to a
// helper that can return null) so a whitespace-only `?q=%20%20` still behaves
// exactly as it did before instead of becoming `filter.x = null`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const dir = 'src/routes/';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

// Identifier that is plainly safe (internal constants), never user input.
const SAFE = new Set(['MEDICINE_NAME', 'PATIENT_NAME']);

let totalRewrites = 0;
const report = [];

for (const f of files) {
  const p = dir + f;
  let src = fs.readFileSync(p, 'utf8');
  const before = src;

  let rewrites = 0;
  src = src.replace(
    /new RegExp\(\s*([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s*,\s*(['"])(i|gi|ig|g|is)\2\s*\)/g,
    (m, ident, _q, _flags) => {
      if (SAFE.has(ident)) return m;
      rewrites++;
      return `new RegExp(escapeRegex(capSearch(${ident})), '${_flags}')`;
    }
  );

  // chat.js declares its own local escapeRegex — drop it in favour of the util.
  if (rewrites > 0 || /const escapeRegex =/.test(src)) {
    if (f === 'chat.js') {
      src = src.replace(
        /^const escapeRegex = .*$/m,
        "import { escapeRegex, capSearch } from '../utils/escapeRegex.js';"
      );
      if (!/import \{ escapeRegex/.test(src)) {
        src = src.replace(
          /^import express from 'express';$/m,
          "import express from 'express';\nimport { escapeRegex, capSearch } from '../utils/escapeRegex.js';"
        );
      }
    } else if (!/from '\.\.\/utils\/escapeRegex\.js'/.test(src)) {
      // Insert the import after the last top-level import so ordering is sane.
      const lines = src.split('\n');
      let last = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^import .*;$/.test(lines[i])) last = i;
      }
      const need = /escapeRegex\(/.test(src) ? 'escapeRegex' : '';
      const need2 = /capSearch\(/.test(src) ? 'capSearch' : '';
      const names = [need, need2].filter(Boolean);
      if (names.length) {
        lines.splice(last + 1, 0, `import { ${names.join(', ')} } from '../utils/escapeRegex.js';`);
        src = lines.join('\n');
      }
    }
  }

  if (src !== before) {
    fs.writeFileSync(p, src, 'utf8');
    totalRewrites += rewrites;
    if (rewrites) report.push(`${f}: ${rewrites}`);
  }
}

console.log('rewrote ' + totalRewrites + ' regex construction(s)');
for (const r of report) console.log('  ' + r);
