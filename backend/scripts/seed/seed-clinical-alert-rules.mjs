#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function seedClinicalAlertRules(hospitalId) {
  const { ALERT_ESCALATION } = await import('../src/lib/alerts.js');
  const { default: Rule } = await import('../src/models/Rule.js');
  const escalation = {
    afterMinutes: ALERT_ESCALATION.afterMinutes,
    backoffMinutes: ALERT_ESCALATION.backoffMinutes,
    maxLevels: ALERT_ESCALATION.maxLevels,
    notifyRoles: [...ALERT_ESCALATION.notifyRoles],
  };
  const defs = [
    {
      key: 'code-blue',
      name: 'Code blue (manual trigger)',
      dataset: 'ops_snapshot',
      groups: [[{ field: 'event', op: '=', value: 'code_blue' }]],
      cooldownMinutes: 0,
      actions: {
        type: 'alert', severity: 'critical', socket: 'dashboard:alert',
        event: 'clinical:code_blue', escalation,
      },
    },
    {
      key: 'lab-panic',
      name: 'Lab panic (manual trigger)',
      dataset: 'lab_critical',
      groups: [[{ field: 'tests.isCritical', op: '=', value: true }]],
      cooldownMinutes: 60,
      actions: {
        type: 'alert', severity: 'critical', socket: 'dashboard:alert',
        event: 'clinical:lab_panic', escalation,
      },
    },
    {
      key: 'mtp',
      name: 'MTP activation (manual trigger)',
      dataset: 'ops_snapshot',
      groups: [[{ field: 'event', op: '=', value: 'mtp' }]],
      cooldownMinutes: 0,
      actions: {
        type: 'alert', severity: 'critical', socket: 'dashboard:alert',
        event: 'clinical:mtp', escalation,
      },
    },
    {
      key: 'sofa-delta-2',
      name: 'SOFA acute deterioration (delta ≥ +2 in 24h)',
      dataset: 'icu_scores',
      groups: [[{ field: 'sofaDelta', op: '>=', value: 2 }]],
      cooldownMinutes: 1440,
      actions: {
        type: 'alert', severity: 'critical', socket: 'dashboard:alert',
        event: 'clinical:sofa_delta', escalation, roleQueue: 'doctor',
      },
    },
  ];
  const report = { hospitalId: String(hospitalId), created: [], updated: [], unchanged: [] };
  for (const def of defs) {
    const shape = {
      name: def.name,
      dataset: def.dataset,
      groups: def.groups,
      actions: def.actions,
      cooldownMinutes: def.cooldownMinutes,
    };
    const res = await Rule.updateOne(
      { hospitalId, key: def.key },
      { $set: shape, $setOnInsert: { enabled: false } },
      { upsert: true, timestamps: false },
    );
    if (res.upsertedCount > 0) report.created.push(def.key);
    else if (res.modifiedCount > 0) report.updated.push(def.key);
    else report.unchanged.push(def.key);
  }
  return report;
}

const invokedDirectly = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI is not set — refusing to run.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  mongoose.set('autoIndex', false);
  const argIndex = process.argv.indexOf('--hospital');
  const explicit = argIndex >= 0 ? process.argv[argIndex + 1] : process.env.HOSPITAL_ID;
  let hospitalIds;
  if (explicit) {
    hospitalIds = [explicit];
  } else {
    const { default: Hospital } = await import('../src/models/Hospital.js');
    hospitalIds = (await Hospital.find({}).select('_id').lean()).map((h) => String(h._id));
  }
  if (!hospitalIds.length) {
    console.log('No hospitals found — nothing to seed.');
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const id of hospitalIds) {
    const r = await seedClinicalAlertRules(id);
    created += r.created.length;
    updated += r.updated.length;
    unchanged += r.unchanged.length;
    console.log(`  ${id}: created ${r.created.length}, updated ${r.updated.length}, unchanged ${r.unchanged.length}`);
  }
  console.log(`clinical alert rules — created ${created}, updated ${updated}, unchanged ${unchanged}`);
  console.log('re-running is idempotent (upsert by hospitalId+key, 0 duplicates)');
  await mongoose.disconnect();
}
