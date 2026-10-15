import fs from 'node:fs';

console.log('--- Migrating AI Symptom History to Session Storage ---');

const files = [
  'frontend/src/components/AIChatAssistant.tsx',
  'frontend/src/pages/AIChatPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/localStorage\.(getItem|setItem|removeItem)\('findmedi_ai_history'/g, "sessionStorage.$1('findmedi_ai_history'");
  content = content.replace(/localStorage\.(getItem|setItem|removeItem)\('medicore_ai_history'\)/g, "sessionStorage.$1('medicore_ai_history')");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[✓] Updated ${file} to use sessionStorage for AI symptom chat`);
}

console.log('--- Migration Complete ---');
