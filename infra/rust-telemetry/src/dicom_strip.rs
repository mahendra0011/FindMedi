//! DICOM PHI stripper (Tech 10): parses with dicom-object, removes
//! patient-identifying elements in memory, returns clean bytes for
//! Cloudinary/Object Storage. Applied pre-AI/second-opinion.

use dicom_core::Tag;
use dicom_object::{open_file, FileDicomObject, InMemDicomObject};
use std::path::Path;

// Patient / institution identifying tags (PS3.15 Basic Profile).
const PHI_TAGS: &[Tag] = &[
    Tag(0x0010, 0x0010), // PatientName
    Tag(0x0010, 0x0020), // PatientID
    Tag(0x0010, 0x0030), // PatientBirthDate
    Tag(0x0010, 0x0040), // PatientSex
    Tag(0x0010, 0x1040), // PatientAddress
    Tag(0x0010, 0x2154), // PatientTelephoneNumbers
    Tag(0x0010, 0x1000), // OtherPatientIDs
    Tag(0x0008, 0x0090), // ReferringPhysicianName
    Tag(0x0008, 0x0080), // InstitutionName
    Tag(0x0008, 0x0081), // InstitutionAddress
    Tag(0x0008, 0x1010), // StationName
];

pub fn strip_file(path: &Path) -> Result<Vec<u8>, String> {
    let mut obj: FileDicomObject<InMemDicomObject> =
        open_file(path).map_err(|e| format!("dicom open: {e}"))?;
    for tag in PHI_TAGS {
        let _ = obj.remove_element(*tag);
    }
    let mut buf = Vec::new();
    obj.write_all(&mut buf)
        .map_err(|e| format!("dicom write: {e}"))?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn phi_tag_list_covers_basics() {
        assert!(PHI_TAGS.contains(&Tag(0x0010, 0x0010)));
        assert!(PHI_TAGS.contains(&Tag(0x0010, 0x0020)));
    }
}
