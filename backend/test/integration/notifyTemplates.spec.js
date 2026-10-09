/**
 * File 22 P2-35: lint refusals, render guards, registry round-trip.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { extractVariables, lintTemplate, renderTemplate } from '../../src/lib/notifyTemplates.js';

describe('lintTemplate', () => {
  test('unknown variables fail loud', () => {
    const out = lintTemplate({ body: 'Hi {{name}}, pay {{amount}}', variables: ['name'], channel: 'sms' });
    expect(out.errors).toEqual(['unknown variable {{amount}}']);
  });

  test('unclosed braces fail', () => {
    expect(lintTemplate({ body: 'Hi {{name', variables: ['name'], channel: 'push' }).errors.length).toBeGreaterThan(0);
  });

  test('long SMS + missing DLT warn (not error)', () => {
    const out = lintTemplate({ body: `Hi {{name}} ${'x'.repeat(200)}`, variables: ['name'], channel: 'sms' });
    expect(out.errors).toEqual([]);
    expect(out.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('renderTemplate', () => {
  test('renders allowlisted vars; missing fail with names', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Ram' }, ['name'])).toBe('Hi Ram');
    try {
      renderTemplate('Hi {{name}} {{amount}}', { name: 'Ram' }, ['name', 'amount']);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('TEMPLATE_VARS_MISSING');
      expect(e.missing).toEqual(['amount']);
    }
  });

  test('unregistered vars in the body never render, even when supplied', () => {
    try {
      renderTemplate('Hi {{name}} {{evil}}', { name: 'Ram', evil: 'x' }, ['name']);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.missing).toEqual(['evil']);
    }
  });

  test('extra values for absent names are harmless', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Ram', evil: 'x' }, ['name'])).toBe('Hi Ram');
  });
});

const templates = [];
const { as } = await mountApp('notifyTemplates', {
  '../../src/models/NotifyTemplate.js': () => ({
    default: {
      find: () => query(templates),
      findOne: (f) => query(templates.find((t) => String(t._id) === String(f._id)) || null),
      findOneAndUpdate: async (filter, update, opts) => {
        const row = { _id: 't1', ...filter, ...update.$set };
        templates.push(row);
        return row;
      },
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const mgr = { _id: 'm1', id: 'm1', role: 'hospital_admin', hospitalId: 'h1' };

describe('registry routes', () => {
  test('lint failure blocks save with 422', async () => {
    const r = await as(mgr).post('/templates').send({
      key: 'pay-due', name: 'Pay due', channel: 'sms', body: 'Pay {{amount}} now',
      variables: ['ammount'], // typo in the allowlist → body var unknown
    });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('TEMPLATE_LINT');
  });

  test('clean template saves with extracted registry', async () => {
    const r = await as(mgr).post('/templates').send({
      key: 'appt', name: 'Reminder', channel: 'push', body: 'Hi {{name}}, token {{token}}',
    });
    expect(r.status).toBe(201);
  });

  test('preview renders samples without sending', async () => {
    const r = await as(mgr).post('/templates/t1/preview').send({ values: { name: 'Ram', token: 'A12' } });
    expect(r.status).toBe(200);
    expect(r.body.rendered).toBe('Hi Ram, token A12');
  });
});
