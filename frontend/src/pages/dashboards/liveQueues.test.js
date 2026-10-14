import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRoleQueues } from './useLiveKpis';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchRoleQueues (Wave 3 · live work queues)', () => {
  it('maps doctor appointments/admissions onto SPEC queue names', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/appointments') {
        return Promise.resolve({
          data: [
            { _id: 'a1', patientName: 'Test Patient', uhid: 'UH1001', status: 'Waiting', reason: 'Fever', slot: '10:30 AM' },
            { _id: 'a2', patientName: 'Done Patient', status: 'Completed', reason: 'Follow-up' },
          ],
        });
      }
      if (path === '/ipd/admissions') {
        return Promise.resolve([{ _id: 'ip1', patientName: 'Ward Patient', ward: 'Ward 2', status: 'Admitted' }]);
      }
      return Promise.resolve([]);
    });

    const out = await fetchRoleQueues('doctor');
    expect(out['Waiting OPD Patients']).toHaveLength(1);
    expect(out['Waiting OPD Patients'][0].name).toBe('Test Patient');
    expect(out['Waiting OPD Patients'][0].primaryActionRoute).toBe('/doctor/consultation');
    expect(out['Completed Consults']).toHaveLength(1);
    expect(out['Assigned Inpatients']).toHaveLength(1);
    expect(out['Assigned Inpatients'][0].primaryActionRoute).toBe('/ipd');
  });

  it('returns {} when every request fails so the curated roster shows', async () => {
    api.get.mockRejectedValue(new Error('403'));
    await expect(fetchRoleQueues('emergency')).resolves.toEqual({});
    await expect(fetchRoleQueues('pharmacist')).resolves.toEqual({});
  });

  it('returns {} for roles with no live mapping (no regression)', async () => {
    await expect(fetchRoleQueues('superadmin')).resolves.toEqual({});
    await expect(fetchRoleQueues('')).resolves.toEqual({});
    expect(api.get).not.toHaveBeenCalled();
  });

  it('omits queues with empty lists so demo fallback fills them', async () => {
    api.get.mockResolvedValue([]);
    const out = await fetchRoleQueues('cashier');
    expect(out).toEqual({});
  });

  it('maps clinic roles onto canonical CMS workQueues with /clinic/* action routes', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/appointments') {
        return Promise.resolve([
          { _id: 'a1', patientName: 'Clinic Patient', status: 'Waiting', vitalsRecorded: false },
          { _id: 'a2', patientName: 'In Room Patient', status: 'In Consultation', vitalsRecorded: true },
          { _id: 'a3', patientName: 'Procedure Patient', status: 'Waiting', notes: 'minor dressing procedure' },
          { _id: 'a4', patientName: 'Telemed Patient', mode: 'video', status: 'Waiting' },
        ]);
      }
      if (path === '/bills') {
        return Promise.resolve([
          { _id: 'b1', patientName: 'Unpaid Patient', status: 'Unpaid', total: 800 },
          { _id: 'b2', patientName: 'Pharmacy Patient', type: 'pharmacy', status: 'Pending', total: 450 },
        ]);
      }
      if (path === '/inventory/items') {
        return Promise.resolve([
          { _id: 'it1', name: 'Paracetamol', quantity: 5, reorderLevel: 50 },
        ]);
      }
      if (path === '/patients') {
        return Promise.resolve([{ _id: 'p1', name: 'New Reg Patient', uhid: 'UHID-2026-001' }]);
      }
      return Promise.resolve([]);
    });

    // 1. Clinic Doctor
    const doc = await fetchRoleQueues('clinic_doctor');
    expect(doc['Waiting OPD Patients']).toBeDefined();
    expect(doc['Waiting OPD Patients'][0].primaryActionRoute).toBe('/clinic/consultations');
    expect(doc['Active Consultation']).toBeDefined();
    expect(doc['Telemedicine Queue']).toBeDefined();

    // 2. Clinic Receptionist
    const rec = await fetchRoleQueues('clinic_receptionist');
    expect(rec['Front Desk Check-in Queue']).toBeDefined();
    expect(rec['Front Desk Check-in Queue'][0].primaryActionRoute).toBe('/clinic/reception');
    expect(rec['Waiting Room Patient Queue']).toBeDefined();
    expect(rec['OPD Thermal Slips Queue']).toBeDefined();

    // 3. Clinic Nurse
    const nurse = await fetchRoleQueues('clinic_nurse');
    expect(nurse['Vitals Station Queue']).toBeDefined();
    expect(nurse['Vitals Station Queue'][0].primaryActionRoute).toBe('/clinic/nurse');
    expect(nurse['Minor Procedure / Dressing Queue']).toBeDefined();

    // 4. Clinic Cashier
    const cashier = await fetchRoleQueues('clinic_cashier');
    expect(cashier['Unpaid Consultation Invoices']).toBeDefined();
    expect(cashier['Unpaid Consultation Invoices'][0].primaryActionRoute).toBe('/clinic/cashier');
    expect(cashier['Pharmacy Dispensing Bills']).toBeDefined();

    // 5. Clinic Admin
    const admin = await fetchRoleQueues('clinic_admin');
    expect(admin['Today Consultation Census']).toBeDefined();
    expect(admin['Pending Bill Settlements']).toBeDefined();
    expect(admin['Inventory Reorder Alerts']).toBeDefined();
  });
});
