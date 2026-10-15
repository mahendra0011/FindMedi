const fs = require('fs');
const scan = JSON.parse(fs.readFileSync('frontend-audit-scan.json'));
const keys = new Set();
scan.localStorage.forEach(item => {
  const m = item.line.match(/(?:local|session)Storage\.(?:getItem|setItem|removeItem)\((["'])([^"']+)\1/);
  if (m) keys.add(m[2]);
});
console.log('Storage keys used in frontend:', Array.from(keys));
