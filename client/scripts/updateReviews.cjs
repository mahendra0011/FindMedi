/* global console */
const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  { 
    file: 'HospitalProfile.jsx', 
    type: 'hospital', 
    idVar: '{id}', 
    nameVar: '{hospital?.name}', 
    reviewsState: 'setReviews' 
  },
  { 
    file: 'ClinicDetail.jsx', 
    type: 'clinic', 
    idVar: '{clinicId}', 
    nameVar: '{clinic?.name}', 
    reviewsState: 'setReviews' 
  },
  { 
    file: 'DiagnosticCenterDetail.jsx', 
    type: 'lab', 
    idVar: '{clinicId}', 
    nameVar: '{clinic?.name}', 
    reviewsState: 'setReviewsData' 
  },
  { 
    file: 'HospitalDoctor.jsx', 
    type: 'doctor', 
    idVar: '{id}', 
    nameVar: '{doctor?.name}', 
    reviewsState: 'setReviews' 
  },
  { 
    file: 'ClinicDoctor.jsx', 
    type: 'doctor', 
    idVar: '{id}', 
    nameVar: '{doctor?.name}', 
    reviewsState: 'setReviews' 
  },
  { 
    file: 'MedicineStoreDetail.jsx', 
    type: 'pharmacy', 
    idVar: '{storeId}', 
    nameVar: '{store?.name}', 
    reviewsState: 'setReviewsData' 
  },
  { 
    file: 'TechnicianDetail.jsx', 
    type: 'technician', 
    idVar: '{id}', 
    nameVar: '{technician?.name}', 
    reviewsState: 'setReviewsData' 
  }
];

const basePath = path.join('D:', 'projects', 'mediCore', 'client', 'src', 'pages');

filesToUpdate.forEach(item => {
  const filePath = path.join(basePath, item.file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${item.file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add import if not exists
  if (!content.includes('import ReviewDialog from')) {
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, endOfLastImport + 1) + `import ReviewDialog from '@/components/ReviewDialog';\n` + content.slice(endOfLastImport + 1);
    modified = true;
  }

  // 2. Add state if not exists
  if (!content.includes('const [showReviewDialog, setShowReviewDialog]')) {
    // Find where states are defined (after export default function)
    const functionMatch = content.match(/export default function \w+\s*\([^)]*\)\s*\{/);
    if (functionMatch) {
      const insertPos = functionMatch.index + functionMatch[0].length;
      content = content.slice(0, insertPos) + `\n  const [showReviewDialog, setShowReviewDialog] = useState(false);` + content.slice(insertPos);
      modified = true;
    }
  }

  // 3. Replace toast.info buttons
  const oldButtonRegex = /onClick=\{\(\) => toast\.info\(['`]Write a review feature coming soon['`]\)\}/g;
  if (oldButtonRegex.test(content)) {
    content = content.replace(oldButtonRegex, `onClick={() => setShowReviewDialog(true)}`);
    modified = true;
  }

  // 4. Add ReviewDialog component before the last closing div
  if (!content.includes('<ReviewDialog')) {
    const dialogComponent = `
      <ReviewDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog}
        entityType="${item.type}"
        entityId=${item.idVar}
        entityName=${item.nameVar}
        onReviewSubmitted={(review) => {
          ${item.reviewsState}(prev => [review, ...(Array.isArray(prev) ? prev : [])]);
        }}
      />
    </div>`;
    
    // Find the last </div>
    const lastDivIndex = content.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      content = content.slice(0, lastDivIndex) + dialogComponent + content.slice(lastDivIndex + 6);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${item.file}`);
  }
});
