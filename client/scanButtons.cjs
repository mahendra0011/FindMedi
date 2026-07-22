const fs = require('fs');
const path = require('path');
const dirs = ['src/pages', 'src/components'];
let issues = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Skip comment lines
        if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) return;
        
        if (line.includes('onClick={() => {}}') || 
            line.match(/onClick=\{\s*\(\)\s*=>\s*console\.log/) || 
            line.match(/toast\.info\(['"](.*coming soon.*?)['"]\)/i) || 
            line.includes('href="#"') ||
            line.includes('to="#"')) {
          issues.push(fullPath + ':' + (index + 1) + ' -> ' + line.trim());
        }
      });
    }
  }
}

dirs.forEach(scanDir);
console.log('Found ' + issues.length + ' suspicious buttons:');
if (issues.length > 0) {
  console.log(issues.slice(0, 50).join('\n'));
} else {
  console.log('No suspicious buttons found!');
}
