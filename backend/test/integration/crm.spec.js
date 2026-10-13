import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const leadFind = jestApi.fn();
const leadFindById = jestApi.fn();
const leadCountDocuments = jestApi.fn();
const leadAggregate = jestApi.fn();
const leadCreate = jestApi.fn();

const partnerFind = jestApi.fn();
const partnerFindById = jestApi.fn();
const partnerCreate = jestApi.fn();

const providerFind = jestApi.fn();
const providerFindById = jestApi.fn();
const providerCountDocuments = jestApi.fn();

const providerAppCountDocuments = jestApi.fn();
const providerDocFind = jestApi.fn();
const providerDocCountDocuments = jestApi.fn();
const disputeCountDocuments = jestApi.fn();
const supportTicketCountDocuments = jestApi.fn();

const crmAccountFind = jestApi.fn();
const crmAccountFindOne = jestApi.fn();
const crmAccountCountDocuments = jestApi.fn();
const crmAccountCreate = jestApi.fn();

const territoryFind = jestApi.fn();
const territoryCreate = jestApi.fn();

const visitFind = jestApi.fn();
const visitFindById = jestApi.fn();
const visitCreate = jestApi.fn();

const teamMemberFind = jestApi.fn();
const teamMemberFindById = jestApi.fn();
const teamMemberFindOne = jestApi.fn();
const teamMemberCreate = jestApi.fn();

const objectiveFind = jestApi.fn();
const objectiveFindById = jestApi.fn();
const objectiveCreate = jestApi.fn();

const campaignFind = jestApi.fn();
const campaignFindById = jestApi.fn();
const campaignCreate = jestApi.fn();

const taskFind = jestApi.fn();
const taskFindById = jestApi.fn();
const taskCountDocuments = jestApi.fn();
const taskCreate = jestApi.fn();

const activityFind = jestApi.fn();
const activityCreate = jestApi.fn();

const auditLog = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/Lead.js', () => ({
  default: {
    find: (...args) => leadFind(...args),
    findById: (...args) => leadFindById(...args),
    countDocuments: (...args) => leadCountDocuments(...args),
    aggregate: (...args) => leadAggregate(...args),
    create: (...args) => leadCreate(...args),
  },
  LEAD_STAGES_LIST: [
    'identified', 'contacted', 'interested', 'demo_done', 'docs_collected',
    'application_submitted', 'under_review', 'approved', 'activated', 'active',
    'at_risk', 'churned',
  ],
}));

jestApi.unstable_mockModule('../../src/models/Partner.js', () => ({
  default: {
    find: (...args) => partnerFind(...args),
    findById: (...args) => partnerFindById(...args),
    create: (...args) => partnerCreate(...args),
  },
  PARTNER_STAGES_LIST: [
    'identified', 'intro_done', 'proposal_sent', 'negotiation',
    'agreement_signed', 'pilot', 'active', 'renewal', 'lost',
  ],
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    find: (...args) => providerFind(...args),
    findById: (...args) => providerFindById(...args),
    countDocuments: (...args) => providerCountDocuments(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  default: {
    countDocuments: (...args) => providerAppCountDocuments(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  default: {
    find: (...args) => providerDocFind(...args),
    countDocuments: (...args) => providerDocCountDocuments(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Dispute.js', () => ({
  default: {
    countDocuments: (...args) => disputeCountDocuments(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: {
    countDocuments: (...args) => supportTicketCountDocuments(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/CrmAccount.js', () => ({
  default: {
    find: (...args) => crmAccountFind(...args),
    findOne: (...args) => crmAccountFindOne(...args),
    countDocuments: (...args) => crmAccountCountDocuments(...args),
    create: (...args) => crmAccountCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Territory.js', () => ({
  default: {
    find: (...args) => territoryFind(...args),
    create: (...args) => territoryCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Visit.js', () => ({
  default: {
    find: (...args) => visitFind(...args),
    findById: (...args) => visitFindById(...args),
    create: (...args) => visitCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/TeamMember.js', () => ({
  default: {
    find: (...args) => teamMemberFind(...args),
    findById: (...args) => teamMemberFindById(...args),
    findOne: (...args) => teamMemberFindOne(...args),
    create: (...args) => teamMemberCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Objective.js', () => ({
  default: {
    find: (...args) => objectiveFind(...args),
    findById: (...args) => objectiveFindById(...args),
    create: (...args) => objectiveCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Campaign.js', () => ({
  default: {
    find: (...args) => campaignFind(...args),
    findById: (...args) => campaignFindById(...args),
    create: (...args) => campaignCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Task.js', () => ({
  default: {
    find: (...args) => taskFind(...args),
    findById: (...args) => taskFindById(...args),
    countDocuments: (...args) => taskCountDocuments(...args),
    create: (...args) => taskCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Activity.js', () => ({
  default: {
    find: (...args) => activityFind(...args),
    create: (...args) => activityCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });
const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

beforeEach(() => {
  auditLog.mockReset().mockResolvedValue(undefined);
  leadAggregate.mockReset().mockResolvedValue([{ _id: 'identified', count: 12 }]);
  leadCountDocuments.mockReset().mockResolvedValue(42);
  providerCountDocuments.mockReset().mockResolvedValue(18);
  providerAppCountDocuments.mockReset().mockResolvedValue(5);
  disputeCountDocuments.mockReset().mockResolvedValue(2);
  supportTicketCountDocuments.mockReset().mockResolvedValue(3);
  providerDocCountDocuments.mockReset().mockResolvedValue(1);
  taskCountDocuments.mockReset().mockResolvedValue(4);
  crmAccountCountDocuments.mockReset().mockResolvedValue(2);
  objectiveFind.mockReset().mockImplementation(() => query([]));
});

describe('File 24 CRM & Team Management Routes', () => {
  test('Patients cannot access CRM endpoints (403 forbidden)', async () => {
    await as(patient).get('/command-center').expect(403);
  });

  test('Command Center aggregates are returned without individual identities', async () => {
    const res = await as(superadmin).get('/command-center').expect(200);
    expect(res.body.funnel).toBeDefined();
    expect(res.body.activeProviders).toBe(18);
    expect(res.body.pendingApps).toBe(5);
    expect(res.body.openDisputes).toBe(2);
    expect(res.body.totalLeads).toBe(42);
  });

  test('Lead creation succeeds with validation and audit', async () => {
    const createdId = '507f1f77bcf86cd799439022';
    leadCreate.mockResolvedValue({ _id: createdId, stage: 'identified' });

    const res = await as(superadmin)
      .post('/leads')
      .send({
        businessName: 'Apex Dental Care',
        city: 'Bhopal',
        typeKey: 'dental_clinic',
        contacts: [{ name: 'Dr. Sharma', phone: '9876543210' }],
      })
      .expect(201);

    expect(res.body.id).toBe(createdId);
    expect(res.body.stage).toBe('identified');
    expect(leadCreate).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('crm_lead_created', superadmin._id, expect.any(Object));
  });

  test('Lead stage change to churned requires lostReason', async () => {
    const leadObj = {
      _id: '507f1f77bcf86cd799439033',
      stage: 'identified',
      save: jestApi.fn().mockResolvedValue(true),
    };
    leadFindById.mockResolvedValue(leadObj);

    await as(superadmin)
      .patch('/leads/507f1f77bcf86cd799439033/stage')
      .send({ stage: 'churned' })
      .expect(400);

    await as(superadmin)
      .patch('/leads/507f1f77bcf86cd799439033/stage')
      .send({ stage: 'churned', lostReason: 'Competitor pricing' })
      .expect(200);

    expect(leadObj.stage).toBe('churned');
    expect(leadObj.lostReason).toBe('Competitor pricing');
  });

  test('Team members can be listed and added (separate from Staff)', async () => {
    const teamId = '507f1f77bcf86cd799439044';
    teamMemberFind.mockImplementation(() => query([]));
    teamMemberFindOne.mockResolvedValue(null);
    teamMemberCreate.mockResolvedValue({ _id: teamId, roleTemplate: 'field_exec' });

    await as(superadmin).get('/team').expect(200);

    const postRes = await as(superadmin)
      .post('/team')
      .send({
        userId: '507f1f77bcf86cd799439055',
        roleTemplate: 'field_exec',
        city: 'Bhopal',
      })
      .expect(201);

    expect(postRes.body.id).toBe(teamId);
    expect(teamMemberCreate).toHaveBeenCalled();
  });
});
