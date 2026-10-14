import { mountApp } from '../helpers/appHarness.js';
import {
  PITCH_DECK_SLIDES,
  THREE_MINUTE_PITCH,
  NARRATIVE_SCRIPT,
  MARKET_SIZING_FRAMEWORK,
  INVESTOR_QA_MATRIX,
  DUE_DILIGENCE_DATA_ROOM,
  FUNDING_PATH_ALTERNATIVES,
  GTM_THREE_PHASE_ROADMAP,
  calculateCityMarketPotential,
} from '../../src/config/pitchDeck.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 22: Pitch / Investor Deck Outline (+ Q&A prep) Spec API', () => {
  test('Patients cannot access pitch-deck-spec (403)', async () => {
    await as(patient).get('/pitch-deck-spec').expect(403);
  });

  test('Superadmin receives full Pitch Deck specification (200)', async () => {
    const res = await as(superadmin).get('/pitch-deck-spec').expect(200);

    expect(res.body).toHaveProperty('pitchDeckSlides');
    expect(res.body).toHaveProperty('threeMinutePitch');
    expect(res.body).toHaveProperty('narrativeScript');
    expect(res.body).toHaveProperty('marketSizing');
    expect(res.body).toHaveProperty('investorQaMatrix');
    expect(res.body).toHaveProperty('dueDiligenceDataRoom');
    expect(res.body).toHaveProperty('fundingPathAlternatives');
    expect(res.body).toHaveProperty('gtmThreePhaseRoadmap');

    // Exactly 14 slides in investor outline
    expect(res.body.pitchDeckSlides).toHaveLength(14);
    expect(res.body.pitchDeckSlides[0].slideNumber).toBe(1);
    expect(res.body.pitchDeckSlides[0].title).toContain('Healthcare for Bharat');
    expect(res.body.pitchDeckSlides[13].slideNumber).toBe(14);
    expect(res.body.pitchDeckSlides[13].title).toContain('The Ask');

    // 3-minute pitch steps
    expect(res.body.threeMinutePitch).toHaveLength(5);

    // Narrative script in Hindi
    expect(res.body.narrativeScript.hindiScript).toContain('Aapke ghar me kisi ko dard hota hai');

    // Market sizing framework (TAM, SAM, SOM)
    expect(res.body.marketSizing.tam.valueUsd).toBe('$110 Billion');
    expect(res.body.marketSizing.sam.valueUsd).toBe('$22 Billion');
    expect(res.body.marketSizing.som.valueUsd).toBe('$18 Million');

    // Investor QA matrix contains all 13 key questions
    expect(res.body.investorQaMatrix).toHaveLength(13);
    const categories = res.body.investorQaMatrix.map((q) => q.category);
    expect(categories).toContain('Competition');
    expect(categories).toContain('Disintermediation');
    expect(categories).toContain('Unit Economics');
    expect(categories).toContain('Regulatory Compliance');
    expect(categories).toContain('Data Privacy & Security');
    expect(categories).toContain('Supply Quality');
    expect(categories).toContain('CAC & Scalability');
    expect(categories).toContain('Moat & Defensibility');
    expect(categories).toContain('Exit & Return Path');
    expect(categories).toContain('Incident & Data Breach');
    expect(categories).toContain('AI Usage & Guardrails');

    // Due diligence data room 5 categories
    expect(res.body.dueDiligenceDataRoom).toHaveLength(5);

    // Funding path alternatives
    expect(res.body.fundingPathAlternatives).toHaveLength(5);

    // 3-Phase GTM
    expect(res.body.gtmThreePhaseRoadmap).toHaveLength(3);
  });

  test('City manager with crm:read can access pitch-deck-spec (200)', async () => {
    await as(cityManager).get('/pitch-deck-spec').expect(200);
  });

  describe('Pitch Deck Helper Functions', () => {
    test('calculateCityMarketPotential correctly models city economics', () => {
      const result = calculateCityMarketPotential({
        cityPopulation: 1500000,
        averageHouseholdSize: 4.5,
        annualHouseholdHealthSpend: 25000,
        outpatientSharePercent: 60,
        digitalPenetrationPercent: 15,
        findmediTargetSharePercent: 20,
        takeRatePercent: 12,
      });

      // 1.5M / 4.5 = ~333,333 households
      expect(result.households).toBe(333333);

      // Total annual spend = 333,333 * 25,000 = ~₹8.33B (₹833 Cr)
      expect(result.totalCityHealthSpendInr).toBeGreaterThan(8000000000);

      // Outpatient 60% = ~₹500 Cr
      expect(result.outpatientSpendInr).toBeGreaterThan(4500000000);

      // Positive GMV and revenue
      expect(result.findmediGmvInr).toBeGreaterThan(0);
      expect(result.findmediRevenueInr).toBeGreaterThan(0);
      expect(result.monthlyRevenueInr).toBe(Math.round(result.findmediRevenueInr / 12));
    });
  });
});
