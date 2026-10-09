/**
 * File 13 §13.6: field-level permissions. `FIELD_RULES` maps
 * model → field → roles allowed to SEE it in cleartext. Everyone else gets
 * the masked form. Enforcement point: list/detail serializers.
 */
const MASK = '••••';

export const FIELD_RULES = {
  Patient: {
    phone: ['doctor', 'nurse', 'receptionist', 'hospital_admin', 'clinic_admin', 'superadmin'],
    email: ['doctor', 'nurse', 'receptionist', 'hospital_admin', 'clinic_admin', 'superadmin'],
    insuranceNo: ['doctor', 'receptionist', 'hospital_admin', 'accountant', 'superadmin'],
  },
  Staff: {
    salary: ['hospital_admin', 'superadmin'],
    bankAccount: ['hospital_admin', 'superadmin'],
  },
};

export function maskField(value) {
  if (value == null || value === '') return value;
  const s = String(value);
  if (s.length <= 4) return MASK;
  return `${MASK}${s.slice(-4)}`;
}

/** Returns a copy of `doc` with disallowed fields masked for `role`. */
export function applyFieldMask(model, doc, role) {
  if (!doc || typeof doc !== 'object') return doc;
  const rules = FIELD_RULES[model];
  if (!rules) return doc;
  const out = { ...(doc.toObject ? doc.toObject() : doc) };
  for (const [field, roles] of Object.entries(rules)) {
    if (out[field] != null && !roles.includes(role)) out[field] = maskField(out[field]);
  }
  return out;
}

export function applyFieldMaskMany(model, docs, role) {
  return (docs || []).map((d) => applyFieldMask(model, d, role));
}
