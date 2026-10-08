/**
 * A2 — the model/enum gaps called out by the rolesmd cross-check, pinned at
 * the schema level: every spec list that reached a model reaches it COMPLETELY
 * (10.md §2.11's status set minus GRACE/RENEWED was exactly this class of
 * bug), every additive field the specs name exists, and the retention
 * classifier has a deliberate answer for every new PII collection — mapped to
 * a documented class or explicitly tracked, never guessed.
 *
 * Route-level behaviour is out of scope: these models have no write routes
 * yet (A3/A4), so the schema IS the deliverable under test.
 */
import { describe, it, expect } from '@jest/globals';
import { classifyField, retentionFor } from '../../scripts/lib/dataDictionary.mjs';
import { MEMBERSHIP_STATUSES, MEMBERSHIP_TRANSITIONS, PLAN_TYPES } from '../../src/lib/flowStates.js';
import Membership from '../../src/models/Membership.js';
import Plan from '../../src/models/Plan.js';
import MealSubscription from '../../src/models/MealSubscription.js';
import Product from '../../src/models/Product.js';
import PractitionerProfile from '../../src/models/PractitionerProfile.js';
import PolicyAcceptance from '../../src/models/PolicyAcceptance.js';
import VaccinationSchedule from '../../src/models/VaccinationSchedule.js';
import DataSubjectRequest from '../../src/models/DataSubjectRequest.js';
import NotificationTemplate from '../../src/models/NotificationTemplate.js';
import FamilyMember from '../../src/models/FamilyMember.js';
import Dispute from '../../src/models/Dispute.js';
import SupportTicket from '../../src/models/SupportTicket.js';
import PharmacyOrder from '../../src/models/PharmacyOrder.js';
import PlatformContent from '../../src/models/PlatformContent.js';
import NotificationPreference from '../../src/models/NotificationPreference.js';
import { RX_SCHEDULES } from '../../src/models/Medicine.js';

/** mongoose keeps arrays-of-subdoc fields off `schema.path('a.b')` — walk it. */
const pathOf = (schema, dotted) => {
  const direct = schema.path(dotted);
  if (direct) return direct;
  const [head, ...rest] = dotted.split('.');
  let cur = schema.path(head);
  for (const seg of rest) {
    if (!cur || !cur.schema) return undefined;
    cur = cur.schema.path(seg);
  }
  return cur;
};

const enumOf = (schema, dotted) => {
  const p = pathOf(schema, dotted);
  if (!p) throw new Error(`missing schema path ${dotted}`);
  return [...p.enumValues].sort();
};

const expectPath = (schema, dotted) => expect(pathOf(schema, dotted)).toBeDefined();

describe('FLOW-D models take their enums from the spec/lib', () => {
  it('Membership.status is exactly MEMBERSHIP_STATUSES (GRACE and RENEWED included)', () => {
    expect(enumOf(Membership.schema, 'status')).toEqual([...MEMBERSHIP_STATUSES].sort());
  });

  it('Membership.history rows carry the same vocabulary, so the trail cannot record an off-machine move', () => {
    expect(enumOf(Membership.schema, 'history.from')).toEqual([...MEMBERSHIP_STATUSES].sort());
    expect(enumOf(Membership.schema, 'history.to')).toEqual([...MEMBERSHIP_STATUSES].sort());
  });

  it('Membership has every mechanic 5.md §5 names: credits, mandate, freeze windows, check-ins', () => {
    for (const field of ['creditsLeft', 'mandateRef', 'autoRenew', 'startAt', 'endAt', 'pastDueSince', 'graceUntil']) {
      expectPath(Membership.schema, field);
    }
    expect(pathOf(Membership.schema, 'freeze.windows')).toBeDefined();
    expectPath(Membership.schema, 'freeze.windows.to');
    expectPath(Membership.schema, 'freeze.daysUsed');
    expect(enumOf(Membership.schema, 'checkIns.method')).toEqual(['app', 'manual', 'qr']);
  });

  it('Plan.type is the 10.md §2.11 list and the freeze bounds live on the plan', () => {
    expect(enumOf(Plan.schema, 'type')).toEqual([...PLAN_TYPES].sort());
    for (const field of ['freezeRules.maxFreezeDaysPerYear', 'freezeRules.maxFreezesPerYear', 'freezeRules.minNoticeDays', 'sessionCredits', 'autoRenew', 'cancellationPolicy']) {
      expectPath(Plan.schema, field);
    }
  });

  it('Membership transitions stay exhaustive — a new status without a row would break every move from it', () => {
    expect(Object.keys(MEMBERSHIP_TRANSITIONS).sort()).toEqual([...MEMBERSHIP_STATUSES].sort());
  });
});

describe('Flow-D meal subscription is its own row, not DietOrder', () => {
  it('carries pause/skip/menu mechanics (5.md 108, 6.md §2.7)', () => {
    expect(enumOf(MealSubscription.schema, 'status')).toEqual(['active', 'cancelled', 'completed', 'paused']);
    expect(enumOf(MealSubscription.schema, 'dietType')).toEqual(
      ['custom', 'eggetarian', 'non_veg', 'vegan', 'veg', 'jain'].sort(),
    );
    for (const field of ['pause.from', 'pause.to', 'skippedDates', 'weeklyMenu', 'deliverySlot', 'allergies', 'endAt']) {
      expectPath(MealSubscription.schema, field);
    }
    expect(enumOf(MealSubscription.schema, 'weeklyMenu.day')).toEqual(
      ['fri', 'mon', 'sat', 'sun', 'thu', 'tue', 'wed'],
    );
  });
});

describe('Product catalogue (10.md §2.7)', () => {
  it('has the kind list, variant rows, regulatory numbers and rentable block', () => {
    expect(enumOf(Product.schema, 'kind')).toEqual(
      ['consumable', 'device', 'food', 'medicine', 'optical', 'skincare', 'supplement'],
    );
    for (const field of ['fssaiNo', 'cdscoNo', 'hsn', 'gstRate', 'composition', 'storage', 'rentable.perDay', 'rentable.deposit']) {
      expectPath(Product.schema, field);
    }
    for (const field of ['sku', 'pack', 'mrp', 'price', 'stock', 'batch', 'expiry']) {
      expectPath(Product.schema, `variants.${field}`);
    }
  });

  it('rxSchedule reuses Medicine vocabulary — one "is this Rx?" answer across catalogues', () => {
    expect(enumOf(Product.schema, 'rxSchedule')).toEqual([...RX_SCHEDULES].sort());
  });

  it('rejects a kind outside the spec list at write time', async () => {
    const doc = new Product({ vendorId: null, name: 'Test', kind: 'illegal_kind' });
    await expect(doc.validate()).rejects.toThrow(/kind/);
  });
});

describe('Practitioner profile (10.md §2.5) keeps Doctor honest', () => {
  it('models non-Doctor role types, per-mode fees and encrypted registration', () => {
    expect(enumOf(PractitionerProfile.schema, 'roleType')).toEqual(
      ['ayush_practitioner', 'counsellor', 'dentist', 'dietitian', 'doctor', 'lawyer', 'nurse', 'phlebotomist', 'physio', 'trainer', 'yoga_teacher'],
    );
    expect(enumOf(PractitionerProfile.schema, 'modes.mode')).toEqual(
      ['audio', 'chat', 'home_visit', 'in_person', 'video'],
    );
    expectPath(PractitionerProfile.schema, 'registration.numberEnc');
    expectPath(PractitionerProfile.schema, 'specialtyCode');
    expect(enumOf(PractitionerProfile.schema, 'status')).toEqual(['active', 'archived', 'draft', 'suspended']);
  });

  it('retention maps to the Provider KYC class (person behind the profile)', () => {
    expect(retentionFor('PractitionerProfile', 1).dataClass).toBe('Provider KYC documents');
  });
});

describe('consent-adjacent and DPDP rows', () => {
  it('PolicyAcceptance is version-stamped with ip + time (2.md §3 step 9)', () => {
    for (const field of ['userId', 'templateId', 'templateVersion', 'acceptedAt', 'ip', 'userAgent', 'documentHash']) {
      expectPath(PolicyAcceptance.schema, field);
    }
    expect(enumOf(PolicyAcceptance.schema, 'context')).toEqual(
      ['booking_cancellation', 'privacy_policy', 'provider_agreement', 'teleconsult_consent', 'terms_of_service'],
    );
  });

  it('DataSubjectRequest never swallows erasure — that stays DeletionRequest\'s job', () => {
    expect(enumOf(DataSubjectRequest.schema, 'type')).toEqual(['access', 'correction', 'export']);
    expect(enumOf(DataSubjectRequest.schema, 'status')).toEqual(
      ['fulfilled', 'in_review', 'rejected', 'submitted', 'verified'],
    );
    for (const field of ['dueAt', 'fulfilledAt', 'exportRef', 'verification.method']) {
      expectPath(DataSubjectRequest.schema, field);
    }
  });

  it('the three new PII collections have deliberate retention answers', () => {
    // Mapped to documented classes…
    expect(retentionFor('DataSubjectRequest', 1).dataClass).toBe('Audit logs');
    expect(retentionFor('VaccinationSchedule', 1).dataClass).toBe('Clinical records');
    // …and the consent-adjacent commerce rows are tracked gaps, not guesses
    // (docs/privacy/RETENTION.md "Known gaps" names all three).
    expect(retentionFor('Membership', 1)).toBeNull();
    expect(retentionFor('MealSubscription', 1)).toBeNull();
    expect(retentionFor('PolicyAcceptance', 1)).toBeNull();
  });

  it('catalogue names/links stay out of PII classification (Plan, Product)', () => {
    expect(classifyField('name', 'Plan')).toBeNull();
    expect(classifyField('providerid', 'Plan')).toBeNull();
    expect(classifyField('name', 'Product')).toBeNull();
    expect(classifyField('userid', 'Membership')).toBe('Identifier');
  });
});

describe('Vaccination schedule (6.md §2.5) is the schedule, not the certificate', () => {
  it('models due-dated doses linked to the Record that proves them', () => {
    for (const field of ['doses.dueAt', 'doses.givenAt', 'doses.recordId', 'scheduleType', 'source', 'familyMemberId']) {
      expectPath(VaccinationSchedule.schema, field);
    }
    expect(enumOf(VaccinationSchedule.schema, 'scheduleType')).toEqual(
      ['adult_booster', 'child_uip', 'covid', 'other', 'travel'],
    );
    expect(retentionFor('VaccinationSchedule', 1).dataClass).toBe('Clinical records');
  });
});

describe('NotificationTemplate keeps discreet copy reviewable (10.md §2.15)', () => {
  it('stores discreetVariant beside the default body, with a locale-unique key', () => {
    expectPath(NotificationTemplate.schema, 'discreetVariant');
    expectPath(NotificationTemplate.schema, 'body');
    expect(enumOf(NotificationTemplate.schema, 'channel')).toEqual(
      ['email', 'inapp', 'push', 'sms', 'whatsapp'],
    );
    const compound = NotificationTemplate.schema.indexes().find(
      ([keys]) => keys.code === 1 && keys.locale === 1,
    );
    expect(compound).toBeDefined();
    expect(compound[1].unique).toBe(true);
  });

  it('holds no PII — it is platform copy', () => {
    expect(retentionFor('NotificationTemplate', 0).dataClass).toContain('No PII');
  });
});

describe('PatientProfile extras land on FamilyMember (10.md §2.16)', () => {
  it('has dependentOf, guardianConsent, emergencyCard, privacyPrefs, wearableLinks', () => {
    expectPath(FamilyMember.schema, 'dependentOf');
    expectPath(FamilyMember.schema, 'guardianConsent.granted');
    expectPath(FamilyMember.schema, 'guardianConsent.grantedBy');
    expectPath(FamilyMember.schema, 'emergencyCard.allergies');
    expectPath(FamilyMember.schema, 'emergencyCard.contacts');
    expectPath(FamilyMember.schema, 'emergencyCard.sharedInSos');
    expectPath(FamilyMember.schema, 'privacyPrefs.hiddenCategories');
    expectPath(FamilyMember.schema, 'privacyPrefs.discreetNotifications');
    expectPath(FamilyMember.schema, 'wearableLinks');
    expect(enumOf(FamilyMember.schema, 'wearableLinks.kind')).toEqual(
      ['band', 'bp_monitor', 'glucometer', 'other', 'scale', 'watch'],
    );
  });
});

describe('Dispute carries Report → Ticket → Evidence → Decision → Appeal (13.md:343)', () => {
  it('has evidence rows, the provider response, a decision and an appeal block', () => {
    expect(enumOf(Dispute.schema, 'evidence.kind')).toEqual(
      ['chat', 'invoice', 'medical_doc', 'other', 'photo', 'screenshot'],
    );
    expect(enumOf(Dispute.schema, 'decision.type')).toEqual(
      ['', 'partially_upheld', 'rejected', 'upheld', 'withdrawn'],
    );
    expect(enumOf(Dispute.schema, 'appeal.status')).toEqual(['decided', 'none', 'pending']);
    expectPath(Dispute.schema, 'providerResponse');
    expect(enumOf(Dispute.schema, 'appeal.outcome')).toEqual(['', 'overturned', 'upheld']);
  });
});

describe('SupportTicket adopts the 21.md §3 taxonomy without rewriting history', () => {
  const TAXONOMY = [
    'Safety/Emergency', 'Booking', 'Payments/Refunds', 'Orders',
    'Records/Privacy', 'Quality/Complaint', 'Provider onboarding',
    'Technical', 'Content/Legal', 'Feedback/Feature',
  ];
  const LEGACY = ['Billing', 'Account', 'Feature Request', 'Other'];

  it('accepts all ten taxonomy categories', () => {
    const enumValues = enumOf(SupportTicket.schema, 'category');
    for (const category of TAXONOMY) expect(enumValues).toContain(category);
  });

  it('keeps every legacy value so existing rows still validate', () => {
    const enumValues = enumOf(SupportTicket.schema, 'category');
    for (const category of LEGACY) expect(enumValues).toContain(category);
    expect(enumValues).toHaveLength(TAXONOMY.length + LEGACY.length);
  });

  it('stores the SLA clock and tags the row', () => {
    expectPath(SupportTicket.schema, 'slaDueAt');
    expectPath(SupportTicket.schema, 'slaHours');
    expectPath(SupportTicket.schema, 'tags');
  });
});

describe('PharmacyOrder gains substitution consent + H1 register (10.md §2.9)', () => {
  it('a generic swap is a recorded consent event, not a silent item edit', () => {
    expect(enumOf(PharmacyOrder.schema, 'substitution.consent')).toEqual(['accepted', 'declined', 'pending']);
    expectPath(PharmacyOrder.schema, 'substitution.originalName');
    expectPath(PharmacyOrder.schema, 'substitution.suggestedName');
    expectPath(PharmacyOrder.schema, 'h1Register');
    expectPath(PharmacyOrder.schema, 'verifiedBy');
    // The flat status the routes already read must not have moved.
    expect(enumOf(PharmacyOrder.schema, 'prescriptionStatus')).toEqual(
      ['not_required', 'pending', 'rejected', 'verified'],
    );
  });
});

describe('editorial review defaults to NOT breaking the live site (7.md §3.21)', () => {
  it('PlatformContent.status defaults to published — existing rows stay live', () => {
    expect(enumOf(PlatformContent.schema, 'status')).toEqual(['draft', 'in_review', 'published']);
    expect(PlatformContent.schema.path('status').options.default).toBe('published');
    expectPath(PlatformContent.schema, 'reviewedBy');
    expectPath(PlatformContent.schema, 'reviewedAt');
  });

  it('NotificationPreference gains discreet mode, default off (6.md §2.15)', () => {
    const path = NotificationPreference.schema.path('discreetMode');
    expect(path).toBeDefined();
    expect(path.options.default).toBe(false);
  });
});
