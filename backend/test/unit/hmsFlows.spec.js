/**
 * File 09 §10 testing checklist: charge math, discharge state machine,
 * deposit balance, TPA/IPD/finance model enums, token queue states.
 * Pure + schema-introspection (no DB) so they run anywhere.
 */
import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { chargeTotal } from '../../src/models/ChargeItem.js';
import { DISCHARGE_TRANSITIONS } from '../../src/models/DischargeWorkflow.js';
import { LEAD_STAGES_LIST } from '../../src/models/Lead.js';
import { ORDER_TRANSITIONS } from '../../src/models/Order.js';

const importModel = async (path, name) => {
  const mod = await import(path);
  return mod.default ?? mongoose.model(name);
};
const enumValues = (model, path) => model.schema.path(path).enumValues ?? [];

describe('charge math (reconciliation invariant inputs)', () => {
  it('computes base + GST exactly', () => {
    expect(chargeTotal(2, 500, 100, 18)).toEqual({ base: 900, taxAmount: 162, amount: 1062 });
    expect(chargeTotal(1, 0)).toEqual({ base: 0, taxAmount: 0, amount: 0 });
    expect(chargeTotal(1, 100, 500, 0).base).toBe(0); // discount clamped
  });
});

describe('discharge state machine (F1/F3)', () => {
  it('walks the full happy path and rejects skips', () => {
    const walk = ['Initiated', 'DoctorApproved', 'NursingClear', 'PharmacyClear', 'BillingClear', 'Discharged'];
    for (let i = 0; i < walk.length - 1; i += 1) {
      expect(DISCHARGE_TRANSITIONS[walk[i]]).toContain(walk[i + 1]);
    }
    expect(DISCHARGE_TRANSITIONS.Initiated).not.toContain('Discharged');
    expect(DISCHARGE_TRANSITIONS.Discharged).toEqual([]);
    expect(DISCHARGE_TRANSITIONS.BillingClear).toContain('Discharged');
  });

  it('allows cancel-and-restart without losing history', () => {
    expect(DISCHARGE_TRANSITIONS.DoctorApproved).toContain('Cancelled');
    expect(DISCHARGE_TRANSITIONS.Cancelled).toContain('Initiated');
  });

  it('walks the CPOE order lifecycle without skipping review', () => {
    const walk = ['Ordered', 'Ack', 'InProgress', 'Resulted', 'Reviewed'];
    for (let i = 0; i < walk.length - 1; i += 1) {
      expect(ORDER_TRANSITIONS[walk[i]]).toContain(walk[i + 1]);
    }
    expect(ORDER_TRANSITIONS.Ordered).not.toContain('Reviewed');
    expect(ORDER_TRANSITIONS.Reviewed).toEqual([]);
  });
});

describe('IPD/finance/TPA model enums', () => {
  it('pins deposit, tariff, token, insurer vocabularies', async () => {
    const IpdDeposit = await importModel('../../src/models/IpdDeposit.js', 'IpdDeposit');
    expect(enumValues(IpdDeposit, 'type')).toEqual(expect.arrayContaining(['Receive', 'Adjust', 'Refund']));
    const RoomTariff = await importModel('../../src/models/RoomTariff.js', 'RoomTariff');
    expect(enumValues(RoomTariff, 'roomType')).toEqual(
      expect.arrayContaining(['General', 'ICU', 'NICU', 'Isolation']),
    );
    const Token = await importModel('../../src/models/Token.js', 'Token');
    expect(enumValues(Token, 'status')).toEqual(
      expect.arrayContaining(['Waiting', 'Called', 'In Consultation', 'Completed', 'NoShow']),
    );
    const Insurer = await importModel('../../src/models/Insurer.js', 'Insurer');
    expect(enumValues(Insurer, 'type')).toEqual(expect.arrayContaining(['Insurer', 'TPA', 'Govt']));
    const PreAuth = await importModel('../../src/models/PreAuthRequest.js', 'PreAuthRequest');
    expect(enumValues(PreAuth, 'status')).toEqual(expect.arrayContaining(['Draft', 'Submitted', 'Approved', 'Rejected']));
    const Claim = await importModel('../../src/models/Claim.js', 'Claim');
    expect(enumValues(Claim, 'status')).toEqual(expect.arrayContaining(['NotSubmitted', 'Submitted', 'Settled']));
    const CreditNote = await importModel('../../src/models/CreditNote.js', 'CreditNote');
    expect(enumValues(CreditNote, 'status')).toEqual(expect.arrayContaining(['Issued', 'Applied', 'Cancelled']));
    const Encounter = await importModel('../../src/models/Encounter.js', 'Encounter');
    expect(enumValues(Encounter, 'type')).toEqual(expect.arrayContaining(['OPD', 'IPD', 'ER', 'TELE']));
    expect(LEAD_STAGES_LIST).toContain('application_submitted');
  });

  it('pins doctor duty toggle + clinic modules (doc 11/12)', async () => {
    const Doctor = await importModel('../../src/models/Doctor.js', 'Doctor');
    expect(enumValues(Doctor, 'dutyStatus')).toEqual(
      expect.arrayContaining(['On duty', 'On call', 'Off']),
    );
    const ClinicProfile = await importModel('../../src/models/ClinicProfile.js', 'ClinicProfile');
    for (const mod of ['dental', 'eye', 'ayush', 'physio']) {
      expect(ClinicProfile.schema.path(`modules.${mod}`)).toBeDefined();
    }
  });

  it('pins prescription upgrade fields (doc 11 P0)', async () => {
    const Prescription = await importModel('../../src/models/Prescription.js', 'Prescription');
    expect(Prescription.schema.path('diagnosisIcd')).toBeDefined();
    expect(Prescription.schema.path('followUpDate')).toBeDefined();
    expect(Prescription.schema.path('cdsOverride.reason')).toBeDefined();
    const RxTemplate = await importModel('../../src/models/RxTemplate.js', 'RxTemplate');
    expect(RxTemplate.schema.path('doctorId').isRequired).toBe(true);
  });

  it('pins oncology + case-board vocabularies', async () => {
    const ChemoCycle = await importModel('../../src/models/ChemoCycle.js', 'ChemoCycle');
    expect(enumValues(ChemoCycle, 'status')).toEqual(
      expect.arrayContaining(['Scheduled', 'Administered', 'Delayed', 'Cancelled']),
    );
    const Case = await importModel('../../src/models/CasePresentation.js', 'CasePresentation');
    expect(enumValues(Case, 'kind')).toEqual(expect.arrayContaining(['TumourBoard', 'MM', 'Teaching']));
    expect(enumValues(Case, 'status')).toEqual(expect.arrayContaining(['Draft', 'Presented', 'Closed']));
  });

  it('pins clinic org roles (doc 12): matrix, enum, tenant scope', async () => {
    const { CANONICAL_ROLES, ROLE_PERMISSIONS, roleHasPermission } = await import('../../src/config/permissions.js');
    const { USER_ROLE_OPTIONS } = await import('../../src/utils/validate.js');
    const { TENANT_STAFF_ROLES } = await import('../../src/utils/tenantScope.js');
    for (const role of ['clinic_admin', 'clinic_receptionist', 'clinic_nurse', 'clinic_accountant', 'clinic_pharmacist']) {
      expect(CANONICAL_ROLES).toContain(role);
      expect(USER_ROLE_OPTIONS).toContain(role);
      expect(TENANT_STAFF_ROLES).toContain(role);
      expect(Array.isArray(ROLE_PERMISSIONS[role]) && ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
    // Least privilege: clinic staff see no clinical writes, no audit, no payouts.
    for (const role of ['clinic_receptionist', 'clinic_accountant', 'clinic_pharmacist']) {
      expect(roleHasPermission(role, 'records:write')).toBe(false);
      expect(roleHasPermission(role, 'audit:read')).toBe(false);
      expect(roleHasPermission(role, 'payouts:approve')).toBe(false);
    }
    expect(roleHasPermission('clinic_nurse', 'records:write')).toBe(false);
    expect(roleHasPermission('clinic_nurse', 'vitals:write')).toBe(true);
  });

  it('pins recall + CPOE, maternity and ICU vocabularies', async () => {
    const Order = await importModel('../../src/models/Order.js', 'Order');
    expect(enumValues(Order, 'kind')).toEqual(
      expect.arrayContaining(['lab', 'radiology', 'medication', 'diet', 'nursing', 'procedure', 'consult']),
    );
    expect(enumValues(Order, 'status')).toEqual(expect.arrayContaining(['Ordered', 'Resulted', 'Reviewed', 'Cancelled']));
    const Antenatal = await importModel('../../src/models/AntenatalRecord.js', 'AntenatalRecord');
    expect(enumValues(Antenatal, 'status')).toEqual(expect.arrayContaining(['Active', 'Delivered', 'Closed']));
    const Labour = await importModel('../../src/models/LabourRecord.js', 'LabourRecord');
    expect(enumValues(Labour, 'deliveryType')).toEqual(expect.arrayContaining(['Normal', 'C-Section', 'Assisted']));
    const Icu = await importModel('../../src/models/IcuFlowsheet.js', 'IcuFlowsheet');
    expect(Icu.schema.path('admissionId')).toBeDefined();
  });

  it('pins consent, handover, indent, GRN and expense vocabularies', async () => {
    const ConsentForm = await importModel('../../src/models/ConsentForm.js', 'ConsentForm');
    expect(enumValues(ConsentForm, 'templateId')).toEqual(
      expect.arrayContaining(['admission', 'surgery', 'anesthesia', 'dama']),
    );
    const ShiftHandover = await importModel('../../src/models/ShiftHandover.js', 'ShiftHandover');
    expect(enumValues(ShiftHandover, 'shift')).toEqual(expect.arrayContaining(['Morning', 'Evening', 'Night']));
    const Indent = await importModel('../../src/models/Indent.js', 'Indent');
    expect(enumValues(Indent, 'status')).toEqual(expect.arrayContaining(['Draft', 'Requested', 'Issued', 'Received']));
    const GRN = await importModel('../../src/models/GRN.js', 'GRN');
    expect(enumValues(GRN, 'qcStatus')).toEqual(expect.arrayContaining(['Pending', 'Passed', 'Rejected']));
    const Expense = await importModel('../../src/models/Expense.js', 'Expense');
    expect(enumValues(Expense, 'status')).toEqual(expect.arrayContaining(['Pending', 'Approved', 'Paid']));
    const Insurer = await importModel('../../src/models/Insurer.js', 'Insurer');
    expect(enumValues(Insurer, 'type')).toEqual(expect.arrayContaining(['Insurer', 'TPA', 'Govt']));
  });
});
