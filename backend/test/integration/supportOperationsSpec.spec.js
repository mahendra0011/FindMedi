import { mountApp } from '../helpers/appHarness.js';
import {
  OPERATING_MODEL,
  SUPPORT_CHANNELS_SLAS,
  TICKET_TAXONOMY,
  CORE_SOPS,
  ESCALATION_MATRIX,
  STAFFING_MODEL,
  COMMUNICATION_TEMPLATES,
  OPS_LAUNCH_CHECKLIST,
  getSopDetails,
  routeSupportTicket,
  renderCommunicationTemplate,
} from '../../src/config/supportOperations.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 20: Support & Operations Playbooks Spec API', () => {
  test('Patients cannot access support-operations-spec (403)', async () => {
    await as(patient).get('/support-operations-spec').expect(403);
  });

  test('Superadmin receives full Support & Operations specification (200)', async () => {
    const res = await as(superadmin).get('/support-operations-spec').expect(200);

    expect(res.body).toHaveProperty('operatingModel');
    expect(res.body).toHaveProperty('supportChannelsSlas');
    expect(res.body).toHaveProperty('ticketTaxonomy');
    expect(res.body).toHaveProperty('coreSops');
    expect(res.body).toHaveProperty('escalationMatrix');
    expect(res.body).toHaveProperty('staffingModel');
    expect(res.body).toHaveProperty('communicationTemplates');
    expect(res.body).toHaveProperty('opsLaunchChecklist');

    // Exactly 17 Core SOPs present
    expect(res.body.coreSops).toHaveLength(17);
    const sopIds = res.body.coreSops.map((s) => s.id);
    expect(sopIds).toContain('SOP-01');
    expect(sopIds).toContain('SOP-05'); // Home visit safety
    expect(sopIds).toContain('SOP-06'); // Mental health crisis
    expect(sopIds).toContain('SOP-12'); // DPDP DSR
    expect(sopIds).toContain('SOP-17'); // Outage degraded mode

    // 10 Ticket categories
    expect(res.body.ticketTaxonomy).toHaveLength(10);

    // Emergency channel SLA is immediate
    expect(res.body.supportChannelsSlas.safetyAndSos.firstResponseSla).toContain('Immediate');
  });

  test('City manager with crm:read can access support-operations-spec (200)', async () => {
    await as(cityManager).get('/support-operations-spec').expect(200);
  });

  describe('Support & Ops Helper Functions', () => {
    test('getSopDetails retrieves SOPs accurately by ID', () => {
      const sop1 = getSopDetails('SOP-01');
      expect(sop1.found).toBe(true);
      expect(sop1.sop.title).toContain('Provider No-Show');

      const sop6 = getSopDetails('sop-06');
      expect(sop6.found).toBe(true);
      expect(sop6.sop.title).toContain('Mental Health Crisis');

      const missing = getSopDetails('SOP-99');
      expect(missing.found).toBe(false);
    });

    test('routeSupportTicket routes emergencies with highest priority', () => {
      const emergency = routeSupportTicket('Booking issue', true);
      expect(emergency.severity).toBe('Sev-1');
      expect(emergency.isEmergency).toBe(true);
      expect(emergency.routingQueue).toContain('Trust & Safety');
      expect(emergency.targetSla).toContain('Immediate');
    });

    test('routeSupportTicket routes non-emergency categories to correct specialists', () => {
      const payments = routeSupportTicket('Payments & Refunds', false);
      expect(payments.routingQueue).toContain('Finance Operations');
      expect(payments.isEmergency).toBe(false);

      const general = routeSupportTicket('Unknown Category', false);
      expect(general.routingQueue).toBe('Tier 1 Frontline Support');
    });

    test('renderCommunicationTemplate replaces variables safely', () => {
      const res = renderCommunicationTemplate('providerNoShowApology', {
        patientName: 'Rohit Sharma',
        providerName: 'Dr. Verma',
        refundAmount: 500,
        paymentMethod: 'UPI',
        arnNumber: 'ARN998877',
        alternativeLink: 'https://findmedi.in/doctors/general-physician',
      });

      expect(res.success).toBe(true);
      expect(res.renderedText).toContain('Rohit Sharma');
      expect(res.renderedText).toContain('Dr. Verma');
      expect(res.renderedText).toContain('₹500');
      expect(res.renderedText).toContain('ARN998877');

      const missingTpl = renderCommunicationTemplate('nonExistentTemplate');
      expect(missingTpl.success).toBe(false);
    });
  });
});
