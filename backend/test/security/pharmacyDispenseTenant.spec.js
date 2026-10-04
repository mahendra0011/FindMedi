import { readFile } from 'node:fs/promises';
import { callerMayActOnDoc } from '../../src/middleware/tenantOwnership.js';
import { applyTenantScope } from '../../src/utils/tenantScope.js';

describe('pharmacy prescription dispensing tenant boundary', () => {
  it('denies a tenant-less or cross-tenant pharmacist and allows only a matching tenant', () => {
    const prescription = { hospitalId: 'hospital-a', facilityId: 'facility-a' };
    expect(callerMayActOnDoc(prescription, { _id: 'staff-1', role: 'pharmacist' })).toBe(false);
    expect(callerMayActOnDoc(prescription, { _id: 'staff-2', role: 'pharmacist', hospitalId: 'hospital-b' })).toBe(false);
    expect(callerMayActOnDoc(prescription, { _id: 'staff-3', role: 'pharmacist', facilityId: 'facility-a' })).toBe(true);
    expect(callerMayActOnDoc(prescription, { _id: 'root', role: 'superadmin' })).toBe(true);
  });

  it('uses the fail-closed tenant guard inside the dispense route before mutation', async () => {
    const source = await readFile(new URL('../../src/routes/pharmacy.js', import.meta.url), 'utf8');
    const start = source.indexOf("router.put('/prescriptions/:id/dispense'");
    const end = source.indexOf('\n});', start);
    const route = source.slice(start, end);
    expect(route).toContain('callerMayActOnDoc(prescription, req.user)');
    expect(route.indexOf('callerMayActOnDoc(prescription, req.user)')).toBeLessThan(route.indexOf('dispensePrescriptionMedicine({'));
    expect(route).not.toContain('if (req.user.hospitalId && req.user.role !==');
  });

  it('denies non-staff order listing and empty-tenant pharmacy staff instead of returning all orders', () => {
    const courierFilter = {};
    expect(applyTenantScope({ user: { role: 'delivery_boy' } }, courierFilter, {
      fields: ['hospitalId', 'facilityId'], allowSharedRowsForNonStaff: false,
    }).ok).toBe(false);
    const staffFilter = {};
    expect(applyTenantScope({ user: { role: 'pharmacist' } }, staffFilter, {
      fields: ['hospitalId', 'facilityId'], allowSharedRowsForNonStaff: false,
    }).ok).toBe(false);
    expect(applyTenantScope({ user: { role: 'pharmacist', hospitalId: 'hospital-a' } }, staffFilter, {
      fields: ['hospitalId', 'facilityId'], allowSharedRowsForNonStaff: false,
    }).ok).toBe(true);
    expect(staffFilter).toEqual({ hospitalId: 'hospital-a', facilityId: 'hospital-a' });
  });

  it('requires a pharmacy read permission and immutable patientId ownership for order listing', async () => {
    const source = await readFile(new URL('../../src/routes/pharmacy.js', import.meta.url), 'utf8');
    const start = source.indexOf("router.get('/orders'");
    const end = source.indexOf("router.post('/orders'", start);
    const route = source.slice(start, end);
    expect(route).toContain("authorize('pharmacy:manage', 'pharmacy:read', 'pharmacy:read:own')");
    expect(route).toContain("filter.patientId = req.user._id");
    expect(route).toContain("allowSharedRowsForNonStaff: false");
    expect(route).not.toContain("patientId: { $exists: false }, patientName:");
  });
});
