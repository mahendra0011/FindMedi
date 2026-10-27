import fs from 'fs';
import path from 'path';

const dir = 'src/models';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let updatedCount = 0;

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  const original = content;

  // Replace unguarded next(); with if (typeof next === 'function') next();
  content = content.replace(/(?<!if\s*\(\s*typeof\s+next\s*===\s*'function'\s*\)\s*)next\(\);/g, (match, offset, str) => {
    const prefix = str.slice(Math.max(0, offset - 60), offset);
    if (prefix.includes("typeof next === 'function'")) return match;
    return "if (typeof next === 'function') next();";
  });

  // Also replace 'return next();' -> 'if (typeof next === 'function') return next(); return;'
  content = content.replace(/return\s+next\(\);/g, "if (typeof next === 'function') return next(); return;");
  // Also replace 'return next(err);' -> 'if (typeof next === 'function') return next(err); throw err;'
  content = content.replace(/return\s+next\(([^)]+)\);/g, "if (typeof next === 'function') return next($1); throw $1;");

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed model:', f);
    updatedCount++;
  }
}

console.log('Total models updated:', updatedCount);
