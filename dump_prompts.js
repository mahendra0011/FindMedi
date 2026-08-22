const fs = require('fs');
const lines = fs.readFileSync('C:/Users/mahen/.gemini/antigravity-ide/brain/1903e9ec-f7a5-4b69-8598-5f42cafe86b9/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
lines.forEach(l => {
  if(l.includes('"type":"USER_INPUT"')) {
    try {
      const p = JSON.parse(l);
      if (p.step_index >= 890 && p.step_index <= 1250) {
        console.log(`[${p.step_index}] ` + p.content.replace(/\n/g, ' '));
      }
    } catch(e) {}
  }
});
