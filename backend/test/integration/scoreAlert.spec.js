/**
 * File 22 P1-20: a red-band score goes through the same alert doorway as the
 * rule engine. Proven at the ROUTE level: POST /responses stores the scores
 * AND fires raiseAlert exactly once for red, never for green.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const raiseAlert = jestApi.fn(async () => ({ _id: 'al1' }));
const responses = [];

const news2Template = {
  _id: 't1', key: 'news2', version: 1, status: 'Published', hospitalId: 'h1',
  title: 'NEWS2 (adult deterioration)',
  titleHi: 'न्यूज २ (वयस्क स्थिति गिरावट)',
  definition: {
    sections: [{
      id: 's1', title: 'Parameters', titleHi: 'मानदंड',
      fields: [
        { id: 'resp', type: 'select', label: 'Respiratory rate', labelHi: 'श्वसन दर', required: true, options: ['3 - 8', '0 - 12-20'], optionsHi: ['३ - ८', '० - १२-२०'] },
        { id: 'consc', type: 'select', label: 'Consciousness', required: true, options: ['0 - Alert', '3 - New confusion'] },
      ],
    }],
  },
  scoring: [{
    id: 'news2', formula: 'resp + consc',
    bands: [
      { from: 0, to: 3, label: 'Low', color: 'green' },
      { from: 4, to: 5, label: 'Medium', color: 'amber' },
      { from: 6, to: 100, label: 'High', color: 'red' },
    ],
  }],
};

const { as } = await mountApp('forms', {
  '../../src/models/FormTemplate.js': () => ({
    default: {
      findOne: (f) => query(
        (f?.key === 'news2' ? news2Template : null),
      ),
      find: () => query([news2Template]),
    },
  }),
  '../../src/models/FormResponse.js': () => ({
    default: {
      create: async (d) => { const r = { _id: `fr${responses.length}`, status: 'Draft', ...d }; responses.push(r); return r; },
      find: () => query(responses),
      findById: (id) => query(responses.find((r) => String(r._id) === String(id)) || null),
    },
  }),
  '../../src/lib/alerts.js': () => ({ raiseAlert: (...a) => raiseAlert(...a) }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}), scrubAuditDetails: (v) => v }),
});

const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };

describe('P1-20 score → alert linkage', () => {
  beforeEach(() => { raiseAlert.mockClear(); responses.length = 0; });

  test('a green-band chart stores scores and raises NO alert', async () => {
    const r = await as(nurse).post('/responses').send({
      templateKey: 'news2', patientId: 'p1', values: { resp: '0 - 12-20', consc: '0 - Alert' },
    });
    expect(r.status).toBe(201);
    expect(r.body.scores.news2.value).toBe(0);
    expect(r.body.scores.news2.color).toBe('green');
    expect(raiseAlert).not.toHaveBeenCalled();
  });

  test('a red-band chart stores scores AND raises one critical alert', async () => {
    const r = await as(nurse).post('/responses').send({
      templateKey: 'news2', patientId: 'p1', encounterId: 'e1',
      values: { resp: '3 - 8', consc: '3 - New confusion' },
    });
    expect(r.status).toBe(201);
    expect(r.body.scores.news2.value).toBe(6);
    expect(raiseAlert).toHaveBeenCalledTimes(1);
    const call = raiseAlert.mock.calls[0][0];
    expect(call.severity).toBe('critical');
    expect(call.ruleKey).toBe('score-news2-news2');
    expect(call.message).toContain('NEWS2');
    expect(call.entityRef.kind).toBe('form_response');
    expect(call.entityRef.patientId).toBe('p1');
    expect(call.hospitalId).toBe('h1');
  });

  test('scores are PERSISTED on the response, not just returned', async () => {
    await as(nurse).post('/responses').send({
      templateKey: 'news2', patientId: 'p1', values: { resp: '3 - 8', consc: '3 - New confusion' },
    });
    expect(responses[0].scores.news2.color).toBe('red');
    expect(responses[0].scores.news2.value).toBe(6);
  });

  test('an alert-doorway failure never fails the charting request', async () => {
    raiseAlert.mockRejectedValueOnce(new Error('socket down'));
    const r = await as(nurse).post('/responses').send({
      templateKey: 'news2', patientId: 'p1', values: { resp: '3 - 8', consc: '3 - New confusion' },
    });
    expect(r.status).toBe(201);
    expect(responses).toHaveLength(1);
  });

  test('unknown template 404s before anything is stored', async () => {
    const r = await as(nurse).post('/responses').send({ templateKey: 'nope', patientId: 'p1', values: {} });
    expect(r.status).toBe(404);
    expect(raiseAlert).not.toHaveBeenCalled();
  });

  test('GET /templates?locale=hi localizes template headers and fields with English fallback', async () => {
    const r = await as(nurse).get('/templates?locale=hi');
    expect(r.status).toBe(200);
    const t = r.body.templates.find((tpl) => tpl.key === 'news2');
    expect(t).toBeDefined();
    expect(t.title).toBe('न्यूज २ (वयस्क स्थिति गिरावट)');
    expect(t.definition.sections[0].title).toBe('मानदंड');
    expect(t.definition.sections[0].fields[0].label).toBe('श्वसन दर');
    expect(t.definition.sections[0].fields[0].options).toEqual(['३ - ८', '० - १२-२०']);
    // Fallback field
    expect(t.definition.sections[0].fields[1].label).toBe('Consciousness');
  });

  test('GET /templates/:idOrKey supports key lookup and honors locale parameter', async () => {
    const rHi = await as(nurse).get('/templates/news2?locale=hi');
    expect(rHi.status).toBe(200);
    expect(rHi.body.template.title).toBe('न्यूज २ (वयस्क स्थिति गिरावट)');

    const rEn = await as(nurse).get('/templates/news2');
    expect(rEn.status).toBe(200);
    expect(rEn.body.template.title).toBe('NEWS2 (adult deterioration)');
  });
});
