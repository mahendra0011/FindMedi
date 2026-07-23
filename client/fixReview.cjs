/* global console */
const fs = require('fs');
const path = require('path');
const files = [
  'HospitalProfile.jsx', 'ClinicDetail.jsx', 'DiagnosticCenterDetail.jsx',
  'HospitalDoctor.jsx', 'ClinicDoctor.jsx', 'MedicineStoreDetail.jsx', 'TechnicianDetail.jsx'
];

let total = 0;
for (const file of files) {
  const filepath = path.join('src/pages', file);
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    
    // Use regex to find `onClick={...}` before `> \n <Star ... /> Write a Review` or something similar
    // Actually simpler: just replace any onClick={.*} when it is on the same line or line before `Write a Review`
    // Let's match `<Button...onClick={...}>...Write a Review`
    content = content.replace(/(<Button[^>]+onClick=\{)([^}]+)(\}[^>]*>[\s\S]*?Write a Review)/g, '$1() => setShowReviewDialog(true)$3');
    
    if (content !== original) {
      fs.writeFileSync(filepath, content);
      console.log('Updated ' + file);
      total++;
    }
  }
}
console.log('Total files updated: ' + total);
