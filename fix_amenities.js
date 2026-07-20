const fs = require('fs');
let content = fs.readFileSync('D:/projects/mediCore/client/src/pages/JoinPlatform.jsx', 'utf8');

const idx = content.indexOf('Amenities</p>');
if (idx > 0) {
  // Find the start of the array
  const startIdx = content.indexOf('{[', idx);
  const endIdx = content.indexOf('].map', idx);
  
  if (startIdx > 0 && endIdx > startIdx) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    const newCode = {(type === 'pharmacy'
                         ? [
                             { key: 'parking', label: 'Parking' },
                             { key: 'acWaitingArea', label: 'AC Waiting Area' },
                             { key: 'wheelchairAccess', label: 'Wheelchair Access' },
                             { key: 'cardPayment', label: 'Card/UPI Payment' },
                             { key: 'homeDelivery', label: 'Home Delivery' },
                             { key: 'prescriptionUpload', label: 'Prescription Upload' },
                           ]
                         : [
                             { key: 'parking', label: 'Parking' },
                             { key: 'acWaitingArea', label: 'AC Waiting Area' },
                             { key: 'wheelchairAccess', label: 'Wheelchair Access' },
                             { key: 'cardPayment', label: 'Card Payment' },
                             { key: 'inHousePharmacy', label: 'In-House Pharmacy' },
                             { key: 'drinkingWater', label: 'Drinking Water' },
                             { key: 'wifi', label: 'Free Wi-Fi' },
                             { key: 'homeVisit', label: 'Home Visit' },
                           ];
    
    content = before + newCode + after;
    fs.writeFileSync('D:/projects/mediCore/client/src/pages/JoinPlatform.jsx', content);
    console.log('Fixed successfully');
  } else {
    console.log('Pattern not found');
  }
}
