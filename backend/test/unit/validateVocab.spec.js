import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import {
  VEHICLE_TYPE_OPTIONS, AMBULANCE_TYPE_OPTIONS, RECORD_TYPE_OPTIONS,
  MEDICINE_RX_SCHEDULES, MEDICINE_PRODUCT_LINES,
  FACILITY_OWNERSHIP_OPTIONS, FACILITY_SYSTEMS_OF_MEDICINE, FACILITY_SCHEME_OPTIONS,
  VACCINATION_SCHEDULE_TYPES, VACCINATION_SOURCES,
  DSR_TYPES, DSR_VERIFICATION_METHODS,
  MEAL_DIET_TYPES, MEAL_DAYS,
  TEST_SAMPLE_TYPES, WOMENS_HEALTH_LOG_KINDS, WELLNESS_KINDS,
  SECOND_OPINION_STATUSES,
  DENTAL_TOOTH_CONDITIONS, DENTAL_PLAN_STATUSES, DENTAL_STAGE_STATUSES,
  DENTAL_LAB_WORK_TYPES, DENTAL_LAB_STATUSES,
  STERILISATION_METHODS, STERILISATION_INDICATORS,
  OPTICAL_JOB_STATUSES, EYE_SURGERY_PROCEDURES, EYE_SIDES, EYE_SURGERY_STAGES,
  DIALYSIS_ISOLATION,
  FERTILITY_CYCLE_TYPES, FERTILITY_CYCLE_STATUSES, FERTILITY_OUTCOMES,
  QUALITY_CHECKLIST_TYPES, QUALITY_ITEM_STATUSES,
} from '../../src/utils/validate.js';

// utils/validate.js cannot import the Mongoose models - a request schema must
// not register a model as a side effect - so its enum arrays are hand-copied.
// This spec is the pin: if a model enum grows (or an option is renamed) without
// the write path following, `req.body = schema.parse(...)` silently drops or
// 400s the new value and the drift is caught here instead of in production.

const importModel = async (path, name) => {
  const mod = await import(path);
  return mod.default ?? mongoose.model(name);
};

const enumValues = (model, path) => {
  const schemaPath = model.schema.path(path);
  if (!schemaPath) throw new Error(`${model.modelName}.${path} does not exist`);
  return schemaPath.enumValues ?? [];
};

describe('validate.js write-path vocabulary stays in sync with the models', () => {
  it('accepts every Vehicle.type the model can store', async () => {
    const Vehicle = await importModel('../../src/models/Vehicle.js', 'Vehicle');
    expect(VEHICLE_TYPE_OPTIONS).toEqual(expect.arrayContaining(enumValues(Vehicle, 'type')));
  });

  it('accepts every Ambulance.ambulanceType the model can store', async () => {
    const Ambulance = await importModel('../../src/models/Ambulance.js', 'Ambulance');
    expect(new Set(AMBULANCE_TYPE_OPTIONS)).toEqual(new Set(enumValues(Ambulance, 'ambulanceType')));
  });

  it('accepts every Record.type the model can store', async () => {
    const Record = await importModel('../../src/models/Record.js', 'Record');
    const modelEnum = enumValues(Record, 'type');
    const missing = modelEnum.filter((value) => !RECORD_TYPE_OPTIONS.includes(value));
    expect(missing).toEqual([]);
  });

  it('accepts every Medicine rxSchedule / productLine the model can store', async () => {
    const Medicine = await importModel('../../src/models/Medicine.js', 'Medicine');
    expect(new Set(MEDICINE_RX_SCHEDULES)).toEqual(new Set(enumValues(Medicine, 'rxSchedule')));
    const modelLines = enumValues(Medicine, 'productLine');
    const missing = modelLines.filter((value) => !MEDICINE_PRODUCT_LINES.includes(value));
    expect(missing).toEqual([]);
  });

  it('accepts every Facility ownership / system / scheme the model can store', async () => {
    const Facility = await importModel('../../src/models/Facility.js', 'Facility');
    expect(new Set(FACILITY_OWNERSHIP_OPTIONS)).toEqual(new Set(enumValues(Facility, 'ownership')));
    expect(new Set(FACILITY_SYSTEMS_OF_MEDICINE)).toEqual(new Set(enumValues(Facility, 'systemOfMedicine')));
    const modelSchemes = enumValues(Facility, 'schemesAccepted.0');
    const missing = modelSchemes.filter((value) => !FACILITY_SCHEME_OPTIONS.includes(value));
    expect(missing).toEqual([]);
  });

  // --- A4 (patient portal write paths) -------------------------------------
  it('accepts every VaccinationSchedule scheduleType / source the model can store', async () => {
    const VaccinationSchedule = await importModel('../../src/models/VaccinationSchedule.js', 'VaccinationSchedule');
    expect(new Set(VACCINATION_SCHEDULE_TYPES)).toEqual(new Set(enumValues(VaccinationSchedule, 'scheduleType')));
    expect(new Set(VACCINATION_SOURCES)).toEqual(new Set(enumValues(VaccinationSchedule, 'source')));
  });

  it('accepts every DataSubjectRequest type / verification method the model can store', async () => {
    const DataSubjectRequest = await importModel('../../src/models/DataSubjectRequest.js', 'DataSubjectRequest');
    expect(new Set(DSR_TYPES)).toEqual(new Set(enumValues(DataSubjectRequest, 'type')));
    // '' is the model's "no method recorded YET" default - never a valid
    // write - so the pin is that every real method is accepted.
    const modelMethods = enumValues(DataSubjectRequest, 'verification.method').filter((value) => value !== '');
    const missing = modelMethods.filter((value) => !DSR_VERIFICATION_METHODS.includes(value));
    expect(missing).toEqual([]);
    expect(new Set(DSR_VERIFICATION_METHODS)).toEqual(new Set(modelMethods));
  });

  it('accepts every MealSubscription dietType / menu day the model can store', async () => {
    const MealSubscription = await importModel('../../src/models/MealSubscription.js', 'MealSubscription');
    expect(new Set(MEAL_DIET_TYPES)).toEqual(new Set(enumValues(MealSubscription, 'dietType')));
    expect(new Set(MEAL_DAYS)).toEqual(new Set(enumValues(MealSubscription, 'weeklyMenu.0.day')));
  });

  // --- subcatogary.md §79 (Test.sampleType free-text → enum) ---------------
  it('accepts every Test sampleType the model can store', async () => {
    const Test = await importModel('../../src/models/Test.js', 'Test');
    expect(new Set(TEST_SAMPLE_TYPES)).toEqual(new Set(enumValues(Test, 'sampleType')));
  });

  // --- 6.md §2.9 (women's health log kinds) ---------------------------------
  it('accepts every WomensHealthLog kind the model can store', async () => {
    const WomensHealthLog = await importModel('../../src/models/WomensHealthLog.js', 'WomensHealthLog');
    expect(new Set(WOMENS_HEALTH_LOG_KINDS)).toEqual(new Set(enumValues(WomensHealthLog, 'kind')));
  });

  // --- 6.md §2.10/§2.11 (wellness log kinds) --------------------------------
  it('accepts every WellnessLog kind the model can store', async () => {
    const WellnessLog = await importModel('../../src/models/WellnessLog.js', 'WellnessLog');
    expect(new Set(WELLNESS_KINDS)).toEqual(new Set(enumValues(WellnessLog, 'kind')));
  });

  // --- 7.md:39 (second-opinion statuses) ------------------------------------
  it('accepts every SecondOpinionRequest status the model can store', async () => {
    const SecondOpinionRequest = await importModel('../../src/models/SecondOpinionRequest.js', 'SecondOpinionRequest');
    expect(new Set(SECOND_OPINION_STATUSES)).toEqual(new Set(enumValues(SecondOpinionRequest, 'status')));
  });

  // --- 7.md:3.1 (dental vocabularies) ---------------------------------------
  it('accepts every dental enum the models can store', async () => {
    const DentalChart = await importModel('../../src/models/DentalChart.js', 'DentalChart');
    expect(new Set(DENTAL_TOOTH_CONDITIONS)).toEqual(new Set(enumValues(DentalChart, 'teeth.0.condition')));
    const DentalTreatmentPlan = await importModel('../../src/models/DentalTreatmentPlan.js', 'DentalTreatmentPlan');
    expect(new Set(DENTAL_PLAN_STATUSES)).toEqual(new Set(enumValues(DentalTreatmentPlan, 'status')));
    expect(new Set(DENTAL_STAGE_STATUSES)).toEqual(new Set(enumValues(DentalTreatmentPlan, 'stages.0.status')));
    const DentalLabWork = await importModel('../../src/models/DentalLabWork.js', 'DentalLabWork');
    expect(new Set(DENTAL_LAB_WORK_TYPES)).toEqual(new Set(enumValues(DentalLabWork, 'workType')));
    expect(new Set(DENTAL_LAB_STATUSES)).toEqual(new Set(enumValues(DentalLabWork, 'status')));
    const SterilisationLog = await importModel('../../src/models/SterilisationLog.js', 'SterilisationLog');
    expect(new Set(STERILISATION_METHODS)).toEqual(new Set(enumValues(SterilisationLog, 'method')));
    expect(new Set(STERILISATION_INDICATORS)).toEqual(new Set(enumValues(SterilisationLog, 'indicator')));
  });

  // --- 7.md:3.2 (eye vocabularies) ------------------------------------------
  it('accepts every eye enum the models can store', async () => {
    const OpticalJobCard = await importModel('../../src/models/OpticalJobCard.js', 'OpticalJobCard');
    expect(new Set(OPTICAL_JOB_STATUSES)).toEqual(new Set(enumValues(OpticalJobCard, 'status')));
    const EyeSurgeryLead = await importModel('../../src/models/EyeSurgeryLead.js', 'EyeSurgeryLead');
    expect(new Set(EYE_SURGERY_PROCEDURES)).toEqual(new Set(enumValues(EyeSurgeryLead, 'procedure')));
    expect(new Set(EYE_SIDES)).toEqual(new Set(enumValues(EyeSurgeryLead, 'eye')));
    expect(new Set(EYE_SURGERY_STAGES)).toEqual(new Set(enumValues(EyeSurgeryLead, 'stage')));
  });

  // --- 7.md:3.16 (dialysis isolation flags) ---------------------------------
  it('accepts every DialysisSession isolation flag the model can store', async () => {
    const DialysisSession = await importModel('../../src/models/DialysisSession.js', 'DialysisSession');
    expect(new Set(DIALYSIS_ISOLATION)).toEqual(new Set(enumValues(DialysisSession, 'isolation')));
  });

  // --- 7.md:3.17 (fertility vocabularies) -----------------------------------
  it('accepts every FertilityCycle enum the model can store', async () => {
    const FertilityCycle = await importModel('../../src/models/FertilityCycle.js', 'FertilityCycle');
    expect(new Set(FERTILITY_CYCLE_TYPES)).toEqual(new Set(enumValues(FertilityCycle, 'cycleType')));
    expect(new Set(FERTILITY_CYCLE_STATUSES)).toEqual(new Set(enumValues(FertilityCycle, 'status')));
    expect(new Set(FERTILITY_OUTCOMES)).toEqual(new Set(enumValues(FertilityCycle, 'outcome.result')));
  });

  // --- 7.md:3.41 (quality checklist vocabularies) ---------------------------
  it('accepts every QualityChecklist enum the model can store', async () => {
    const QualityChecklist = await importModel('../../src/models/QualityChecklist.js', 'QualityChecklist');
    expect(new Set(QUALITY_CHECKLIST_TYPES)).toEqual(new Set(enumValues(QualityChecklist, 'checklistType')));
    expect(new Set(QUALITY_ITEM_STATUSES)).toEqual(new Set(enumValues(QualityChecklist, 'items.0.status')));
  });
});
