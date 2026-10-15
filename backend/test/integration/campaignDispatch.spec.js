/**
 * File 18 §18.1 + Phase-1 automation: the campaign DISPATCH engine.
 *
 * What it pins:
 *  - 404 on an unknown campaign; 409 when consent was never attested or the
 *    campaign is not in a dispatchable state (running/done);
 *  - 400 when the DLT template id is missing (India send rule), when the
 *    template text is broken (lint fails loud before any send), when the
 *    audience is empty or over the inline cap;
 *  - per-recipient consent chain: DND entries suppress (skipped, not failed),
 *    missing phones and provider failures count as failed, successes as sent;
 *  - the row ends `done` with queued/sent/failed stats and one audit row.
 */
import { jest as jestApi } from '@jest/globals';
import { query } from '../helpers/appHarness.js';

const auditLog = jestApi.fn();
const sendSms = jestApi.fn(async () => ({ success: true }));
const sendWhatsApp = jestApi.fn(async () => ({ success: true }));

let campaignRow = null;
let usersById = {};
let dndByPhone = {};

jestApi.unstable_mockModule('../../src/models/OutboundCampaign.js', () => ({
  default: { findById: () => query(campaignRow) },
}));
jestApi.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: (id) => query(usersById[String(id)] || null) },
}));
jestApi.unstable_mockModule('../../src/models/DndEntry.js', () => ({
  default: { findOne: (f) => query(dndByPhone[String(f?.phone)] || null) },
}));
jestApi.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendSms: (...args) => sendSms(...args),
  sendWhatsApp: (...args) => sendWhatsApp(...args),
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

// Dynamic import AFTER the mocks above: a static import would bind the real
// models before mock registration runs (ESM evaluation order).
const { dispatchCampaign, MAX_RECIPIENTS } = await import('../../src/services/campaignDispatch.js');

const makeCampaign = (over = {}) => {
  const row = {
    _id: 'cmp-1',
    hospitalId: 'hosp-1',
    status: 'draft',
    channel: 'whatsapp',
    template: 'Hi {{patientName}}, your camp is tomorrow.',
    audience: { userIds: ['u1', 'u2'] },
    consentChecked: true,
    stats: {},
    save: jestApi.fn(async function () { return row; }),
    ...over,
  };
  return row;
};

beforeEach(() => {
  campaignRow = null;
  usersById = {
    u1: { _id: 'u1', name: 'Ram', phone: '9811111111' },
    u2: { _id: 'u2', name: 'Shyam', phone: '9822222222' },
  };
  dndByPhone = {};
  auditLog.mockReset();
  sendSms.mockReset().mockResolvedValue({ success: true });
  sendWhatsApp.mockReset().mockResolvedValue({ success: true });
});

describe('dispatchCampaign gates', () => {
  it('404s an unknown campaign', async () => {
    await expect(dispatchCampaign('nope', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'CAMPAIGN_NOT_FOUND' });
  });

  it('409s without consent attestation and on non-dispatchable state', async () => {
    campaignRow = makeCampaign({ consentChecked: false });
    await expect(dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });

    campaignRow = makeCampaign({ status: 'running' });
    await expect(dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'BAD_STATE' });
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it('400s a missing DLT id, broken template, empty or oversized audience', async () => {
    campaignRow = makeCampaign();
    await expect(dispatchCampaign('cmp-1', {})).rejects.toMatchObject({ code: 'DLT_REQUIRED' });

    campaignRow = makeCampaign({ template: 'Hi {{name' });
    await expect(dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'TEMPLATE_INVALID' });

    campaignRow = makeCampaign({ audience: { userIds: [] } });
    await expect(dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'NO_AUDIENCE' });

    campaignRow = makeCampaign({ audience: { userIds: Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => `u${i}`) } });
    await expect(dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' })).rejects.toMatchObject({ code: 'AUDIENCE_TOO_LARGE' });
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });
});

describe('dispatchCampaign sending', () => {
  it('sends whatsapp, skips DND, ends done with stats + audit', async () => {
    campaignRow = makeCampaign();
    dndByPhone = { 9822222222: { phone: '9822222222', channel: 'whatsapp' } };
    const out = await dispatchCampaign('cmp-1', { actorId: 'op-1', dltTemplateId: 'DLT1', templateName: 'camp_reminder' });

    expect(sendWhatsApp).toHaveBeenCalledTimes(1);
    expect(sendWhatsApp).toHaveBeenCalledWith(expect.objectContaining({ to: '9811111111', templateName: 'camp_reminder' }));
    expect(out).toMatchObject({ status: 'done', queued: 2, sent: 1, failed: 0, skipped: 1 });
    expect(campaignRow.stats).toMatchObject({ queued: 2, sent: 1, failed: 0 });
    expect(auditLog).toHaveBeenCalledWith(
      'campaign_dispatched',
      'op-1',
      expect.objectContaining({ sent: 1, failed: 0, skipped: 1 }),
    );
  });

  it('sends sms with the dispatch-time DLT id', async () => {
    campaignRow = makeCampaign({ channel: 'sms', audience: { userIds: ['u1'] } });
    await dispatchCampaign('cmp-1', { dltTemplateId: 'DLT-SMS-9' });
    expect(sendSms).toHaveBeenCalledWith(expect.objectContaining({ to: '9811111111', templateId: 'DLT-SMS-9' }));
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it('counts missing phones and provider failures as failed', async () => {
    campaignRow = makeCampaign({ audience: { userIds: ['u1', 'ghost', 'u2'] } });
    sendWhatsApp.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false, error: 'gateway 500' });
    const out = await dispatchCampaign('cmp-1', { dltTemplateId: 'DLT1' });
    // u1 sent, ghost has no phone, u2 provider-failed.
    expect(out).toMatchObject({ queued: 3, sent: 1, failed: 2, skipped: 0 });
    expect(campaignRow.status).toBe('done');
  });
});
