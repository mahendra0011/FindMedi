import { describe, it, expect } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const { as } = await mountApp('biometric');

describe('Biometric Device Sync & WebAuthn Punch Integration', () => {
  const staff = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    name: 'Anjali Sharma',
    role: 'nurse',
  };

  it('rejects empty logs array on device sync', async () => {
    await as()
      .post('/device-sync')
      .send({ deviceSerial: 'ZK-001', logs: [] })
      .expect(400);
  });

  it('ingests batch biometric punches from hardware time clock', async () => {
    const res = await as()
      .post('/device-sync')
      .send({
        deviceSerial: 'ZKTECO-U300',
        logs: [
          { staffCode: 'EMP-101', punchType: 'IN', timestamp: new Date().toISOString() },
          { staffCode: 'EMP-102', punchType: 'IN', timestamp: new Date().toISOString() },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.status).toBe('ACK_200');
  });

  it('generates WebAuthn registration challenge for staff member', async () => {
    const res = await as(staff)
      .post('/webauthn/register-challenge')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.user.id).toBe('507f191e810c19729de860ea');
  });

  it('records verified WebAuthn biometric punch event', async () => {
    const res = await as(staff)
      .post('/webauthn/verify-punch')
      .send({ punchType: 'OUT' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.punchRecord.punchType).toBe('OUT');
    expect(res.body.punchRecord.verifyType).toBe('WEBAUTHN_BIOMETRIC');
  });
});
