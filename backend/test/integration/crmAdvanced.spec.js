import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// ── Models used by the File 24 §4.10–§4.13 + §5 endpoints ────────────────────
const leadFind = jestApi.fn();
const leadFindById = jestApi.fn();
const leadCountDocuments = jestApi.fn();
const leadAggregate = jestApi.fn();
const leadCreate = jestApi.fn();

const partnerFind = jestApi.fn();
const partnerAggregate = jestApi.fn();

const visitAggregate = jestApi.fn();
const taskAggregate = jestApi.fn();
const taskFindOne = jestApi.fn();

const campaignAggregate = jestApi.fn();

const pipelineFindOne = jestApi.fn();

const ruleFind = jestApi.fn();
const ruleFindById = jestApi.fn();
const ruleFindByIdAndDelete = jestApi.fn();
const ruleCreate = jestApi.fn();

const playbookFind = jestApi.fn();
const playbookFindById = jestApi.fn();
const playbookFindByIdAndDelete = jestApi.fn();
const playbookCreate = jestApi.fn();

const projectFind = jestApi.fn();
const projectFindById = jestApi.fn();
const projectFindByIdAndDelete = jestApi.fn();
const projectCreate = jestApi.fn();

const scheduleFind = jestApi.fn();
const scheduleCreate = jestApi.fn();
const scheduleFindByIdAndDelete = jestApi.fn();
const scheduleUpdateOne = jestApi.fn();

const auditLog = jestApi.fn();
const runCrmAutomation = jestApi.fn();
const sendEmail = jestApi.fn();

const LEAD_STAGES = [
  'identified', 'contacted', 'interested', 'demo_done', 'docs_collected',
  'application_submitted', 'under_review', 'approved', 'activated', 'active',
  'at_risk', 'churned',
];
const PARTNER_STAGES = [
  'identified', 'intro_done', 'proposal_sent', 'negotiation',
  'agreement_signed', 'pilot', 'active', 'renewal', 'lost',
];

jestApi.unstable_mockModule('../../src/models/Lead.js', () => ({
  default: {
    find: (...a) => leadFind(...a),
    findById: (...a) => leadFindById(...a),
    countDocuments: (...a) => leadCountDocuments(...a),
    aggregate: (...a) => leadAggregate(...a),
    create: (...a) => leadCreate(...a),
  },
  LEAD_STAGES_LIST: LEAD_STAGES,
}));

jestApi.unstable_mockModule('../../src/models/Partner.js', () => ({
  default: {
    find: (...a) => partnerFind(...a),
    aggregate: (...a) => partnerAggregate(...a),
  },
  PARTNER_STAGES_LIST: PARTNER_STAGES,
}));

jestApi.unstable_mockModule('../../src/models/Visit.js', () => ({
  default: { aggregate: (...a) => visitAggregate(...a) },
}));

jestApi.unstable_mockModule('../../src/models/Task.js', () => ({
  default: {
    aggregate: (...a) => taskAggregate(...a),
    findOne: (...a) => taskFindOne(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/Campaign.js', () => ({
  default: { aggregate: (...a) => campaignAggregate(...a) },
}));

// Constructor + statics: PUT /settings news up a config when none exists.
const MockPipelineConfig = function CrmPipelineConfig(data = {}) {
  Object.assign(this, data);
  this.save = async () => this;
};
MockPipelineConfig.findOne = (...a) => pipelineFindOne(...a);

jestApi.unstable_mockModule('../../src/models/CrmPipelineConfig.js', () => ({
  default: MockPipelineConfig,
  defaultPipelineConfig: () => ({
    key: 'default',
    leadStages: [
      { key: 'identified', label: 'Identified', slaHours: 24, terminal: false },
      { key: 'churned', label: 'Churned', slaHours: 0, terminal: true },
    ],
    partnerStages: [
      { key: 'identified', label: 'Identified', slaHours: 48, terminal: false },
      { key: 'lost', label: 'Lost', slaHours: 0, terminal: true },
    ],
    lostReasons: ['Competitor pricing'],
    leadSources: ['field_visit', 'referral'],
    scoringWeights: { volume: 30 },
    followUpSlaHours: 4,
    docRenewalLeadDays: 30,
  }),
  LEAD_SOURCE_LIST: ['field_visit', 'referral', 'association', 'inbound', 'event', 'ads', 'other'],
}));

jestApi.unstable_mockModule('../../src/models/CrmAutomationRule.js', () => ({
  default: {
    find: (...a) => ruleFind(...a),
    findById: (...a) => ruleFindById(...a),
    findByIdAndDelete: (...a) => ruleFindByIdAndDelete(...a),
    create: (...a) => ruleCreate(...a),
  },
  CRM_AUTOMATION_TRIGGERS_LIST: [
    'lead_stage_idle', 'doc_expiring', 'task_overdue',
    'at_risk_provider', 'partner_next_step_due',
  ],
}));

jestApi.unstable_mockModule('../../src/models/CrmPlaybook.js', () => ({
  default: {
    find: (...a) => playbookFind(...a),
    findById: (...a) => playbookFindById(...a),
    findByIdAndDelete: (...a) => playbookFindByIdAndDelete(...a),
    create: (...a) => playbookCreate(...a),
  },
  PLAYBOOK_CATEGORIES: ['sop', 'script', 'template', 'training', 'policy', 'faq'],
}));

jestApi.unstable_mockModule('../../src/models/CrmProject.js', () => ({
  default: {
    find: (...a) => projectFind(...a),
    findById: (...a) => projectFindById(...a),
    findByIdAndDelete: (...a) => projectFindByIdAndDelete(...a),
    create: (...a) => projectCreate(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/CrmReportSchedule.js', () => ({
  default: {
    find: (...a) => scheduleFind(...a),
    findById: (...a) => scheduleCreate(...a),
    findByIdAndDelete: (...a) => scheduleFindByIdAndDelete(...a),
    updateOne: (...a) => scheduleUpdateOne(...a),
    create: (...a) => scheduleCreate(...a),
  },
}));

jestApi.unstable_mockModule('../../src/lib/crmAutomation.js', () => ({
  default: (...a) => runCrmAutomation(...a),
  runCrmAutomation: (...a) => runCrmAutomation(...a),
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...a) => auditLog(...a),
}));

jestApi.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendEmail: (...a) => sendEmail(...a),
}));

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });
const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const platformAdmin = { _id: '507f1f77bcf86cd799439012', role: 'platform_admin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

beforeEach(() => {
  auditLog.mockReset().mockResolvedValue(undefined);
  leadFind.mockReset().mockImplementation(() => query([]));
  leadFindById.mockReset().mockResolvedValue(null);
  leadCountDocuments.mockReset().mockResolvedValue(42);
  leadAggregate.mockReset().mockResolvedValue([{ _id: 'identified', count: 12 }]);
  leadCreate.mockReset().mockResolvedValue({ _id: '507f1f77bcf86cd799439022', stage: 'identified' });

  partnerFind.mockReset().mockImplementation(() => query([]));
  partnerAggregate.mockReset().mockResolvedValue([]);
  visitAggregate.mockReset().mockResolvedValue([]);
  taskAggregate.mockReset().mockResolvedValue([]);
  taskFindOne.mockReset().mockResolvedValue(null);
  campaignAggregate.mockReset().mockResolvedValue([{ _id: null, campaigns: 0, budget: 0, registrations: 0, attendees: 0, conversions: 0 }]);

  pipelineFindOne.mockReset().mockImplementation(() => query(null));

  ruleFind.mockReset().mockImplementation(() => query([]));
  ruleFindById.mockReset().mockResolvedValue(null);
  ruleFindByIdAndDelete.mockReset().mockResolvedValue({});
  ruleCreate.mockReset().mockResolvedValue({ _id: '507f1f77bcf86cd799439044', trigger: 'lead_stage_idle', enabled: true });

  playbookFind.mockReset().mockImplementation(() => query([]));
  playbookFindById.mockReset().mockResolvedValue(null);
  playbookFindByIdAndDelete.mockReset().mockResolvedValue({});
  playbookCreate.mockReset().mockResolvedValue({ _id: '507f1f77bcf86cd799439055', status: 'draft' });

  projectFind.mockReset().mockImplementation(() => query([]));
  projectFindById.mockReset().mockResolvedValue(null);
  projectFindByIdAndDelete.mockReset().mockResolvedValue({});
  projectCreate.mockReset().mockResolvedValue({ _id: '507f1f77bcf86cd799439066', status: 'planned' });

  scheduleFind.mockReset().mockImplementation(() => query([]));
  scheduleCreate.mockReset().mockResolvedValue({ _id: '507f1f77bcf86cd799439077' });
  scheduleFindByIdAndDelete.mockReset().mockResolvedValue({});
  scheduleUpdateOne.mockReset().mockResolvedValue({ acknowledged: true });

  runCrmAutomation.mockReset().mockResolvedValue({ evaluated: 0, matched: 0, created: 0, skipped: 0, failed: 0 });
  sendEmail.mockReset().mockResolvedValue({ success: true });
});

describe('File 24 §4.13 CRM Settings', () => {
  test('Patients cannot read CRM settings (403)', async () => {
    await as(patient).get('/settings').expect(403);
  });

  test('GET /settings returns defaults when no config stored', async () => {
    const res = await as(superadmin).get('/settings').expect(200);
    expect(res.body.config.key).toBe('default');
    expect(res.body.config.leadStages.length).toBeGreaterThan(0);
    expect(res.body.config.followUpSlaHours).toBe(4);
    expect(pipelineFindOne).toHaveBeenCalledWith({ key: 'default' });
  });

  test('city_manager has crm:read on settings', async () => {
    await as(cityManager).get('/settings').expect(200);
  });

  test('PUT /settings rejects unknown lead stage keys with 400', async () => {
    const res = await as(superadmin)
      .put('/settings')
      .send({ leadStages: [{ key: 'not_a_stage', slaHours: 5 }, { key: 'identified', slaHours: 5 }] })
      .expect(400);
    expect(res.body.message).toMatch(/Unknown lead stages/);
  });

  test('PUT /settings rejects unknown partner stage keys with 400', async () => {
    const res = await as(superadmin)
      .put('/settings')
      .send({ partnerStages: [{ key: 'bogus_stage', slaHours: 5 }, { key: 'active', slaHours: 5 }] })
      .expect(400);
    expect(res.body.message).toMatch(/Unknown partner stages/);
  });

  test('PUT /settings accepts valid stages and audits the change', async () => {
    const res = await as(superadmin)
      .put('/settings')
      .send({
        leadStages: [
          { key: 'identified', slaHours: 24 },
          { key: 'churned', slaHours: 0, terminal: true },
        ],
        followUpSlaHours: 6,
      })
      .expect(200);
    expect(res.body.config.followUpSlaHours).toBe(6);
    expect(auditLog).toHaveBeenCalledWith('crm_settings_updated', superadmin._id, expect.any(Object));
  });

  test('PUT /settings rejects unknown body fields (strict zod)', async () => {
    await as(superadmin).put('/settings').send({ evilField: true }).expect(400);
  });
});

describe('File 24 §5 Automation Rules', () => {
  test('Patients cannot see or run automation (403)', async () => {
    await as(patient).get('/automation/rules').expect(403);
    await as(patient).post('/automation/run').send({}).expect(403);
  });

  test('GET /automation/rules lists rules with trigger catalogue', async () => {
    ruleFind.mockImplementation(() => query([{ _id: '507f1f77bcf86cd799439044', name: 'Idle lead nudge' }]));
    const res = await as(superadmin).get('/automation/rules').expect(200);
    expect(res.body.rules).toHaveLength(1);
    expect(res.body.triggers).toHaveLength(5);
    expect(res.body.triggers).toContain('lead_stage_idle');
  });

  test('POST /automation/rules validates trigger and audits', async () => {
    await as(superadmin)
      .post('/automation/rules')
      .send({ name: 'Idle lead nudge', trigger: 'not_a_trigger' })
      .expect(400);

    const res = await as(superadmin)
      .post('/automation/rules')
      .send({
        name: 'Idle lead nudge',
        trigger: 'lead_stage_idle',
        conditions: { slaHours: 48 },
        actions: [{ type: 'create_task', params: {} }],
        cooldownMinutes: 120,
      })
      .expect(201);

    expect(res.body.id).toBe('507f1f77bcf86cd799439044');
    expect(ruleCreate).toHaveBeenCalledWith(expect.objectContaining({
      trigger: 'lead_stage_idle',
      cooldownMinutes: 120,
    }));
    expect(auditLog).toHaveBeenCalledWith('crm_automation_rule_created', superadmin._id, expect.any(Object));
  });

  test('PATCH /automation/rules/:id toggles enabled', async () => {
    const doc = { _id: '507f1f77bcf86cd799439044', enabled: true, save: jestApi.fn().mockResolvedValue(true) };
    ruleFindById.mockResolvedValue(doc);
    const res = await as(superadmin)
      .patch('/automation/rules/507f1f77bcf86cd799439044')
      .send({ enabled: false })
      .expect(200);
    expect(res.body.enabled).toBe(false);
    expect(doc.save).toHaveBeenCalled();
  });

  test('DELETE /automation/rules/:id removes and audits', async () => {
    await as(superadmin).delete('/automation/rules/507f1f77bcf86cd799439044').expect(200);
    expect(ruleFindByIdAndDelete).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('crm_automation_rule_deleted', superadmin._id, expect.any(Object));
  });

  test('POST /automation/run returns engine summary', async () => {
    runCrmAutomation.mockResolvedValue({ evaluated: 2, matched: 3, created: 1, skipped: 1, failed: 0 });
    const res = await as(platformAdmin).post('/automation/run').send({ force: true }).expect(200);
    expect(res.body.matched).toBe(3);
    expect(res.body.created).toBe(1);
    expect(runCrmAutomation).toHaveBeenCalledWith({ ruleId: null, force: true });
  });

  test('POST /automation/run rejects non-objectId ruleId', async () => {
    await as(superadmin).post('/automation/run').send({ ruleId: 'nope' }).expect(400);
  });
});

describe('File 24 §4.12 CRM Reports', () => {
  test('Patients cannot read reports (403)', async () => {
    await as(patient).get('/reports').expect(403);
    await as(patient).get('/reports/supply_funnel').expect(403);
  });

  test('GET /reports returns report catalogue and schedules', async () => {
    const res = await as(superadmin).get('/reports').expect(200);
    expect(res.body.reports.map((r) => r.key)).toEqual(
      expect.arrayContaining(['supply_funnel', 'field_productivity', 'churn', 'partner_outcomes', 'cohort']),
    );
    expect(Array.isArray(res.body.schedules)).toBe(true);
  });

  test('supply_funnel returns one row per pipeline stage', async () => {
    leadAggregate.mockResolvedValue([{ _id: 'identified', count: 12 }, { _id: 'churned', count: 3 }]);
    const res = await as(cityManager).get('/reports/supply_funnel').expect(200);
    expect(res.body.columns).toContain('stage');
    expect(res.body.rows).toHaveLength(LEAD_STAGES.length);
    const first = res.body.rows[0];
    expect(first[0]).toBe('identified');
    expect(first[1]).toBe(12);
  });

  test('CSV export streams text/csv with a header row', async () => {
    leadAggregate.mockResolvedValue([{ _id: 'identified', count: 12 }]);
    const res = await as(superadmin).get('/reports/supply_funnel/export').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text.split('\n')[0]).toBe('stage,leads,step_conversion_pct');
  });

  test('Unknown report key is a 404', async () => {
    await as(superadmin).get('/reports/definitely_not_real').expect(404);
  });

  test('field_productivity degrades gracefully when owner lookup fails', async () => {
    leadAggregate.mockResolvedValue([{ _id: '507f1f77bcf86cd799439011', leads: 5, activated: 2, churned: 1 }]);
    visitAggregate.mockResolvedValue([]);
    taskAggregate.mockResolvedValue([]);
    const res = await as(superadmin).get('/reports/field_productivity').expect(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0][0]).toBe('507f1f77bcf86cd799439011');
    expect(res.body.rows[0][2]).toBe(5);
  });

  test('churn report groups lost leads by reason and city', async () => {
    leadAggregate.mockResolvedValue([{ _id: 'Competitor pricing', count: 3 }]);
    const res = await as(superadmin).get('/reports/churn').expect(200);
    expect(res.body.rows).toHaveLength(2);
    expect(res.body.rows[0]).toEqual(['reason', 'Competitor pricing', 3, expect.any(Number)]);
  });

  test('cohort report buckets leads by created month', async () => {
    leadAggregate.mockResolvedValue([{ _id: { month: '2026-09', stage: 'active' }, count: 4 }]);
    const res = await as(superadmin).get('/reports/cohort').expect(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0][0]).toBe('2026-09');
    expect(res.body.rows[0][1]).toBe(4);
  });

  test('partner_outcomes includes campaign totals', async () => {
    partnerAggregate.mockResolvedValue([]);
    campaignAggregate.mockResolvedValue([{ _id: null, campaigns: 3, budget: 1000, registrations: 10, attendees: 8, conversions: 2 }]);
    const res = await as(superadmin).get('/reports/partner_outcomes').expect(200);
    expect(res.body.rows).toEqual(expect.arrayContaining([
      ['campaigns.total', 3],
      ['campaigns.conversions', 2],
    ]));
  });

  test('Schedule CRUD validates report keys', async () => {
    await as(superadmin)
      .post('/reports/schedules')
      .send({ reportKey: 'not_a_report', recipients: ['ops@findmedi.com'] })
      .expect(400);

    const res = await as(superadmin)
      .post('/reports/schedules')
      .send({ reportKey: 'supply_funnel', frequency: 'weekly', recipients: ['ops@findmedi.com'] })
      .expect(201);
    expect(res.body.id).toBe('507f1f77bcf86cd799439077');
    expect(scheduleCreate).toHaveBeenCalledWith(expect.objectContaining({ reportKey: 'supply_funnel' }));

    await as(superadmin).delete('/reports/schedules/507f1f77bcf86cd799439077').expect(200);
  });

  test('runCrmReportSchedules emails due schedules as CSV and stamps lastRunAt', async () => {
    const { runCrmReportSchedules } = await import('../../src/routes/crm.js');
    const due = {
      _id: '507f1f77bcf86cd799439077',
      reportKey: 'supply_funnel',
      frequency: 'daily',
      recipients: ['ops@findmedi.com'],
      active: true,
      lastRunAt: null,
    };
    scheduleFind.mockImplementation(() => query([due]));
    leadAggregate.mockResolvedValue([{ _id: 'identified', count: 12 }]);

    const out = await runCrmReportSchedules(new Date('2026-10-13T02:00:00Z'));
    expect(out.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ops@findmedi.com',
      attachments: [expect.objectContaining({ filename: expect.stringContaining('supply_funnel') })],
    }));
    expect(scheduleUpdateOne).toHaveBeenCalledWith(
      { _id: due._id },
      expect.objectContaining({ $set: expect.objectContaining({ lastRunAt: expect.any(Date) }) }),
    );
  });

  test('runCrmReportSchedules skips schedules not yet due', async () => {
    const { runCrmReportSchedules } = await import('../../src/routes/crm.js');
    const recent = {
      _id: '507f1f77bcf86cd799439078',
      reportKey: 'churn',
      frequency: 'daily',
      recipients: ['ops@findmedi.com'],
      active: true,
      lastRunAt: new Date('2026-10-13T01:00:00Z'),
    };
    scheduleFind.mockImplementation(() => query([recent]));

    const out = await runCrmReportSchedules(new Date('2026-10-13T02:00:00Z'));
    expect(out.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('File 24 §4.11 Playbooks', () => {
  test('Patients cannot read playbooks (403)', async () => {
    await as(patient).get('/playbooks').expect(403);
  });

  test('GET /playbooks lists items and honours filters', async () => {
    playbookFind.mockImplementation(() => query([{ _id: '507f1f77bcf86cd799439055', title: 'Onboarding SOP' }]));
    const res = await as(superadmin).get('/playbooks?category=sop&status=published&q=onboard').expect(200);
    expect(res.body.playbooks).toHaveLength(1);
    expect(playbookFind).toHaveBeenCalledWith(expect.objectContaining({ category: 'sop', status: 'published' }));
  });

  test('POST /playbooks creates with validation and audit', async () => {
    const res = await as(platformAdmin)
      .post('/playbooks')
      .send({
        title: 'Partner Onboarding Checklist',
        category: 'sop',
        body: 'Step 1: intro call. Step 2: share terms.',
        status: 'published',
      })
      .expect(201);
    expect(res.body.id).toBe('507f1f77bcf86cd799439055');
    expect(auditLog).toHaveBeenCalledWith('crm_playbook_created', platformAdmin._id, expect.any(Object));
  });

  test('POST /playbooks rejects short bodies and bad categories', async () => {
    await as(superadmin).post('/playbooks').send({ title: 'Too short', body: 'tiny' }).expect(400);
    await as(superadmin)
      .post('/playbooks')
      .send({ title: 'Valid title', category: 'not_real', body: 'long enough body text' })
      .expect(400);
  });

  test('PATCH /playbooks/:id bumps version when body changes', async () => {
    const doc = {
      _id: '507f1f77bcf86cd799439055',
      title: 'Old title',
      body: 'old body content here',
      status: 'draft',
      version: 1,
      save: jestApi.fn().mockResolvedValue(true),
    };
    playbookFindById.mockResolvedValue(doc);
    const res = await as(superadmin)
      .patch('/playbooks/507f1f77bcf86cd799439055')
      .send({ body: 'completely new body content' })
      .expect(200);
    expect(res.body.version).toBe(2);
    expect(doc.status).toBe('draft');
  });

  test('DELETE /playbooks/:id removes the item', async () => {
    await as(superadmin).delete('/playbooks/507f1f77bcf86cd799439055').expect(200);
    expect(playbookFindByIdAndDelete).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('crm_playbook_deleted', superadmin._id, expect.any(Object));
  });
});

describe('File 24 §4.10 Projects & Roadmap', () => {
  test('Patients cannot read projects (403)', async () => {
    await as(patient).get('/projects').expect(403);
  });

  test('GET /projects lists the roadmap with filters', async () => {
    projectFind.mockImplementation(() => query([{ _id: '507f1f77bcf86cd799439066', title: 'Indore launch', status: 'in_progress' }]));
    const res = await as(superadmin).get('/projects?status=in_progress').expect(200);
    expect(res.body.projects).toHaveLength(1);
    expect(projectFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
  });

  test('POST /projects creates a project and audits', async () => {
    const res = await as(cityManager)
      .post('/projects')
      .send({ title: 'Q4 City Expansion', kind: 'initiative', status: 'planned', progress: 0 })
      .expect(201);
    expect(res.body.id).toBe('507f1f77bcf86cd799439066');
    expect(auditLog).toHaveBeenCalledWith('crm_project_created', cityManager._id, expect.any(Object));
  });

  test('POST /projects rejects invalid status values', async () => {
    await as(superadmin).post('/projects').send({ title: 'Bad status', status: 'yolo' }).expect(400);
  });

  test('PATCH /projects/:id updates progress', async () => {
    const doc = { _id: '507f1f77bcf86cd799439066', progress: 10, save: jestApi.fn().mockResolvedValue(true) };
    projectFindById.mockResolvedValue(doc);
    const res = await as(superadmin)
      .patch('/projects/507f1f77bcf86cd799439066')
      .send({ progress: 65, status: 'in_progress' })
      .expect(200);
    expect(res.body.progress).toBe(65);
    expect(res.body.status).toBe('in_progress');
  });

  test('POST /projects/:id/decisions logs decision + why', async () => {
    const doc = { _id: '507f1f77bcf86cd799439066', decisionLog: [], save: jestApi.fn().mockResolvedValue(true) };
    projectFindById.mockResolvedValue(doc);
    const res = await as(superadmin)
      .post('/projects/507f1f77bcf86cd799439066/decisions')
      .send({ decision: 'Ship without partner ledger tab', why: 'Ledger slips to next quarter' })
      .expect(201);
    expect(res.body.decisions).toBe(1);
    expect(doc.decisionLog[0]).toEqual(expect.objectContaining({
      decision: 'Ship without partner ledger tab',
      why: 'Ledger slips to next quarter',
    }));
    expect(auditLog).toHaveBeenCalledWith('crm_project_decision_logged', superadmin._id, expect.any(Object));
  });

  test('Decision log rejects empty decisions', async () => {
    const doc = { _id: '507f1f77bcf86cd799439066', decisionLog: [], save: jestApi.fn().mockResolvedValue(true) };
    projectFindById.mockResolvedValue(doc);
    await as(superadmin)
      .post('/projects/507f1f77bcf86cd799439066/decisions')
      .send({ decision: 'x' })
      .expect(400);
  });

  test('DELETE /projects/:id removes the project', async () => {
    await as(superadmin).delete('/projects/507f1f77bcf86cd799439066').expect(200);
    expect(projectFindByIdAndDelete).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('crm_project_deleted', superadmin._id, expect.any(Object));
  });
});
