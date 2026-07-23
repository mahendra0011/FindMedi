/* global console */
const fs = require('fs');
const path = require('path');
const files = [
  'HospitalProfile.jsx', 'ClinicDetail.jsx', 'DiagnosticCenterDetail.jsx',
  'HospitalDoctor.jsx', 'ClinicDoctor.jsx', 'MedicineStoreDetail.jsx', 'TechnicianDetail.jsx'
];

files.forEach(file => {
  const filepath = path.join('src/pages', file);
  if (!fs.existsSync(filepath)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Add import if not exists
  if (!content.includes('import ReviewDialog')) {
    // find last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + "import ReviewDialog from '@/components/ReviewDialog';\n" + content.slice(endOfLine + 1);
    }
  }

  // Add state if not exists
  if (!content.includes('const [showReviewDialog, setShowReviewDialog]')) {
    const mainCompMatch = content.match(/export default function \w+\(\) \{/);
    if (mainCompMatch) {
      const insertPos = mainCompMatch.index + mainCompMatch[0].length;
      content = content.slice(0, insertPos) + "\n  const [showReviewDialog, setShowReviewDialog] = useState(false);" + content.slice(insertPos);
    }
  }

  // Inject Dialog at the end
  if (!content.includes('<ReviewDialog')) {
    let entityType = 'hospital';
    let entityId = '{id}';
    let entityName = '{hospital?.name}';
    
    if (file === 'ClinicDetail.jsx' || file === 'DiagnosticCenterDetail.jsx') {
      entityType = file === 'ClinicDetail.jsx' ? 'clinic' : 'lab';
      entityId = '{clinicId}';
      entityName = '{clinic?.name}';
    } else if (file.includes('Doctor')) {
      entityType = 'doctor';
      entityId = '{doctor?._id || doctor?.id}';
      entityName = '{doctor?.name}';
    } else if (file === 'MedicineStoreDetail.jsx') {
      entityType = 'pharmacy';
      entityId = '{storeId}';
      entityName = '{store?.name}';
    } else if (file === 'TechnicianDetail.jsx') {
      entityType = 'technician';
      entityId = '{techId}';
      entityName = '{technician?.name}';
    }

    const reviewStr = `
      <ReviewDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog}
        entityType="${entityType}"
        entityId=${entityId}
        entityName=${entityName}
        onReviewSubmitted={(review) => {
          if (typeof setReviews === 'function') setReviews(prev => [review, ...prev]);
          if (typeof setReviewsData === 'function') setReviewsData(prev => ({...prev, reviews: [review, ...(prev.reviews || [])]}));
        }}
      />
    </div>
  );
}`;
    content = content.replace(/<\/div>\s*?(\n\s*)?\);\s*?\n?\}/, reviewStr);
  }

  // Replace onClick in "Write a Review" buttons
  // Safely find "<Button...Write a Review" or similar
  const buttonRegex = /<Button[^>]*?onClick=\{[^}]*\}[^>]*?>\s*(?:<[^>]+>\s*)?Write a Review/g;
  content = content.replace(buttonRegex, (match) => {
    return match.replace(/onClick=\{[^}]*\}/, 'onClick={() => setShowReviewDialog(true)}');
  });

  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Fixed ' + file);
  }
});
