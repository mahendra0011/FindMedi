export function computeGstSplit(tax, hospitalState, patientState) {
  const t = Number(tax) || 0;
  if (t <= 0) return { cgst: 0, sgst: 0, igst: 0, placeOfSupply: hospitalState || '' };
  const pos = hospitalState || '';
  if (pos && patientState && pos !== patientState) {
    return { cgst: 0, sgst: 0, igst: +t.toFixed(2), placeOfSupply: pos };
  }
  const c = +(t / 2).toFixed(2);
  return { cgst: c, sgst: +(t - c).toFixed(2), igst: 0, placeOfSupply: pos };
}
