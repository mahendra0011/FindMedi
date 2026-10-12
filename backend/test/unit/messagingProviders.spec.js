import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sendSms } from '../../src/services/smsProvider.js';
import { sendWhatsApp } from '../../src/services/whatsappProvider.js';

describe('Wave 3 / T8: Messaging Providers Unit Tests (SMS & WhatsApp)', () => {
  const originalEnv = process.env;
  let originalFetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MSG91_AUTH_KEY;
    delete process.env.MSG91_SENDER_ID;
    delete process.env.MSG91_TEMPLATE_ID;
    delete process.env.MSG91_INTEGRATED_NUMBER;
    delete process.env.WHATSAPP_TEMPLATE_ID;

    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe('SMS Provider (sendSms)', () => {
    it('returns simulated/skipped receipt when MSG91_AUTH_KEY is missing (demo mode safe)', async () => {
      const result = await sendSms({
        to: '+91 98765 43210',
        text: 'Your appointment is confirmed for 10:00 AM.',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('skipped');
      expect(result.simulated).toBe(true);
      expect(result.reason).toContain('MSG91_AUTH_KEY not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('normalizes phone number and posts to Msg91 flow API when configured', async () => {
      process.env.MSG91_AUTH_KEY = 'test_sms_key_123';
      process.env.MSG91_TEMPLATE_ID = 'tmpl_flow_999';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ type: 'success', message: 'req-msg-7788' }),
      });

      const result = await sendSms({
        to: '+91-98765-43210',
        text: 'Prescription ready for pickup',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(result.messageId).toBe('req-msg-7788');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('https://control.msg91.com/api/v5/flow/');
      expect(options.headers.authkey).toBe('test_sms_key_123');

      const body = JSON.parse(options.body);
      expect(body.template_id).toBe('tmpl_flow_999');
      expect(body.recipients[0].mobiles).toBe('919876543210');
      expect(body.recipients[0].message).toBe('Prescription ready for pickup');
    });

    it('throws when Msg91 SMS returns an error response', async () => {
      process.env.MSG91_AUTH_KEY = 'test_sms_key_123';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ type: 'error', message: 'Invalid mobile number' }),
      });

      await expect(
        sendSms({ to: 'invalid_number', text: 'Test' })
      ).rejects.toThrow('Invalid mobile number');
    });
  });

  describe('WhatsApp Provider (sendWhatsApp)', () => {
    it('returns simulated/skipped receipt when MSG91_AUTH_KEY is missing', async () => {
      const result = await sendWhatsApp({
        to: '+919876543210',
        text: 'Appointment reminder',
        templateName: 'appointment_reminder',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('skipped');
      expect(result.simulated).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('formats template parameters and sends to WhatsApp outbound endpoint', async () => {
      process.env.MSG91_AUTH_KEY = 'test_wa_key_456';
      process.env.MSG91_INTEGRATED_NUMBER = '919000000000';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: [{ message_id: 'wa-msg-id-1002' }],
        }),
      });

      const result = await sendWhatsApp({
        to: '+91 98765 43210',
        templateName: 'lab_report_ready',
        variables: { patientName: 'Ramesh', testName: 'CBC' },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(result.messageId).toBe('wa-msg-id-1002');

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/');
      expect(options.headers.authkey).toBe('test_wa_key_456');

      const body = JSON.parse(options.body);
      expect(body.integrated_number).toBe('919000000000');
      expect(body.payload.to).toBe('919876543210');
      expect(body.payload.template.name).toBe('lab_report_ready');
      expect(body.payload.template.components[0].parameters).toEqual([
        { type: 'text', text: 'Ramesh' },
        { type: 'text', text: 'CBC' },
      ]);
    });

    it('graceful fallback flow: falls back to SMS when WhatsApp fails', async () => {
      process.env.MSG91_AUTH_KEY = 'test_key';
      process.env.MSG91_INTEGRATED_NUMBER = '919000000000';

      // WhatsApp API fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ status: 'error', message: 'WhatsApp gateway unavailable' }),
      });

      // SMS fallback succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ type: 'success', message: 'sms-fallback-99' }),
      });

      let sentVia = '';
      let messageId = '';
      try {
        const wa = await sendWhatsApp({ to: '919876543210', text: 'Test alert' });
        sentVia = 'whatsapp';
        messageId = wa.messageId;
      } catch (err) {
        // Fallback to SMS
        const sms = await sendSms({ to: '919876543210', text: 'Test alert' });
        sentVia = 'sms';
        messageId = sms.messageId;
      }

      expect(sentVia).toBe('sms');
      expect(messageId).toBe('sms-fallback-99');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
