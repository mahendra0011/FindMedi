import { mountApp } from '../helpers/appHarness.js';
import {
  BRAND_FOUNDATION,
  HEALTHCARE_MARKETING_PRINCIPLES,
  CHANNEL_STRATEGY,
  SEO_SITE_ARCHITECTURE,
  KEYWORD_CLUSTERS,
  HEALTH_CALENDAR_CAMPAIGNS,
  LIFECYCLE_CRM_JOURNEYS,
  PARTNERSHIP_PLAYBOOK,
  MARKETING_COMPLIANCE_CHECKLIST,
  NINETY_DAY_LAUNCH_PLAN,
  generateSchemaOrgJsonLd,
  validateMarketingClaim,
  getSeoUrlForListing,
} from '../../src/config/marketingSeo.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 21: Marketing, Brand & SEO Plan Spec API', () => {
  test('Patients cannot access marketing-seo-spec (403)', async () => {
    await as(patient).get('/marketing-seo-spec').expect(403);
  });

  test('Superadmin receives full Marketing & SEO specification (200)', async () => {
    const res = await as(superadmin).get('/marketing-seo-spec').expect(200);

    expect(res.body).toHaveProperty('brandFoundation');
    expect(res.body).toHaveProperty('principles');
    expect(res.body).toHaveProperty('channelStrategy');
    expect(res.body).toHaveProperty('seoSiteArchitecture');
    expect(res.body).toHaveProperty('keywordClusters');
    expect(res.body).toHaveProperty('healthCalendar');
    expect(res.body).toHaveProperty('lifecycleCrm');
    expect(res.body).toHaveProperty('partnershipPlaybook');
    expect(res.body).toHaveProperty('complianceChecklist');
    expect(res.body).toHaveProperty('ninetyDayLaunchPlan');

    // Brand foundation positioning and vernacular aliases
    expect(res.body.brandFoundation.positioning).toContain('Aapke shehar me bharosemand');
    expect(res.body.brandFoundation.vernacularTaxonomyAliases).toHaveProperty('Doctor');

    // Principles: Zero PHI ad targeting
    expect(res.body.principles).toEqual(
      expect.arrayContaining([expect.stringContaining('Zero health-data/PHI ad targeting')])
    );

    // Channel strategy includes P0 zero-CAC channels
    expect(res.body.channelStrategy.p0_coreZeroCac).toHaveLength(5);

    // SEO architecture quality gate
    expect(res.body.seoSiteArchitecture.qualityGateMinimumVerifiedProviders).toBe(3);
    expect(res.body.seoSiteArchitecture.neverIndexRoutes).toContain('/patient/*');

    // Keyword clusters contain English and Hinglish
    expect(res.body.keywordClusters.length).toBeGreaterThanOrEqual(7);

    // Health calendar campaigns
    expect(res.body.healthCalendar.length).toBeGreaterThanOrEqual(9);

    // 90-Day launch plan milestones
    expect(res.body.ninetyDayLaunchPlan).toHaveProperty('days_1_30');
    expect(res.body.ninetyDayLaunchPlan).toHaveProperty('days_31_60');
    expect(res.body.ninetyDayLaunchPlan).toHaveProperty('days_61_90');
  });

  test('City manager with crm:read can access marketing-seo-spec (200)', async () => {
    await as(cityManager).get('/marketing-seo-spec').expect(200);
  });

  describe('Marketing & SEO Helper Functions', () => {
    test('generateSchemaOrgJsonLd generates valid JSON-LD for Physician', () => {
      const jsonStr = generateSchemaOrgJsonLd('Physician', {
        name: 'Dr. Sharma Clinic',
        city: 'Jabalpur',
        specialty: 'Dentistry',
        phone: '+91-761-2400111',
        rating: 4.9,
      });

      const parsed = JSON.parse(jsonStr);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Physician');
      expect(parsed.name).toBe('Dr. Sharma Clinic');
      expect(parsed.address.addressLocality).toBe('Jabalpur');
      expect(parsed.aggregateRating.ratingValue).toBe(4.9);
    });

    test('generateSchemaOrgJsonLd generates valid FAQPage structure', () => {
      const jsonStr = generateSchemaOrgJsonLd('FAQPage', {
        faqs: [
          { question: 'What is consultation fee?', answer: 'Starting from ₹200.' },
          { question: 'Is home sample collection available?', answer: 'Yes across city limits.' },
        ],
      });

      const parsed = JSON.parse(jsonStr);
      expect(parsed['@type']).toBe('FAQPage');
      expect(parsed.mainEntity).toHaveLength(2);
      expect(parsed.mainEntity[0].name).toBe('What is consultation fee?');
      expect(parsed.mainEntity[0].acceptedAnswer.text).toBe('Starting from ₹200.');
    });

    test('validateMarketingClaim detects non-compliant claims under Drugs & Magic Remedies Act', () => {
      const violation1 = validateMarketingClaim('We offer 100% cure for arthritis without surgery');
      expect(violation1.isCompliant).toBe(false);
      expect(violation1.matchedViolations).toContain('100% cure');
      expect(violation1.recommendation).toContain('NON-COMPLIANT');

      const violation2 = validateMarketingClaim('Shartiya ilaj for diabetes guaranteed');
      expect(violation2.isCompliant).toBe(false);
      expect(violation2.matchedViolations).toContain('shartiya ilaj');
    });

    test('validateMarketingClaim approves compliant factual claims', () => {
      const approved = validateMarketingClaim('Book consultation with verified pediatricians in Jabalpur');
      expect(approved.isCompliant).toBe(true);
      expect(approved.matchedViolations).toHaveLength(0);
      expect(approved.recommendation).toContain('Claim compliant');
    });

    test('getSeoUrlForListing formats canonical URL properly with or without area', () => {
      const urlWithoutArea = getSeoUrlForListing('bhopal', 'dentist', 'dr-kumar-clinic');
      expect(urlWithoutArea).toBe('/bhopal/dentist/dr-kumar-clinic');

      const urlWithArea = getSeoUrlForListing('Jabalpur', 'Diagnostic Lab', 'aarogyam-pathology', 'Civic Center');
      expect(urlWithArea).toBe('/jabalpur/diagnostic-lab/civic-center/aarogyam-pathology');
    });
  });
});
