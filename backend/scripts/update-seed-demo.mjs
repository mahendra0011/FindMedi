import fs from 'fs';

let s = fs.readFileSync('seed-demo.mjs', 'utf8');

s = s.replace(
  "approvalStatus: (rest.role === 'doctor' || rest.role === 'clinic_doctor' || rest.role === 'delivery_boy') ? 'approved' : 'not_required',",
  "approvalStatus: 'approved',"
);

const target = "console.log('\\n✅ Seed complete! 15 sections seeded.');";
const addition = `    // ===== SEED SERVICE CITIES & ADDITIONAL DEMO USERS =====
    console.log('Seeding additional demo profiles (riders, assistants, lawyers, ambulance, psychiatrists)...');
    try {
      const { ensureDemoUsers } = await import('./src/services/demoSeedService.js');
      await ensureDemoUsers();
    } catch (e) {
      console.warn('  ensureDemoUsers warning:', e.message);
    }
`;

if (!s.includes('ensureDemoUsers')) {
  s = s.replace(target, addition + '\n    ' + target);
}

fs.writeFileSync('seed-demo.mjs', s, 'utf8');
console.log('seed-demo.mjs updated successfully');
