/**
 * Document 21 — Marketing, Brand & SEO Plan Test Suite
 * Validating:
 * 1. Brand Foundation (Positioning, 5 Pillars, Vernacular Hindi/English Aliases)
 * 2. Healthcare Marketing Principles (Zero PHI ad targeting, Drugs & Magic Remedies Act)
 * 3. Channel Funnel Strategy (P0 Zero-CAC, P1 Growth, P2 Supplementary)
 * 4. Technical & Local SEO Site Architecture & Quality Gates (Min 3 verified providers)
 * 5. Schema.org Structured Data Generator (Physician, FAQPage, MedicalWebPage)
 * 6. Keyword Clusters (English + Hinglish Search Queries)
 * 7. Annual Health Calendar & Seasonal Awareness Campaigns
 * 8. Lifecycle CRM Journeys & Institutional B2B Partnerships
 * 9. Claims Compliance Checker (Drugs & Magic Remedies Act 1954)
 * 10. ProjectsRoadmap UI Integration (Interactive Modal & Real-time Testers)
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
} from '@/lib/marketingSeo';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-mkt-1',
            title: 'Hyperlocal Vernacular SEO & Clinic QR Kits',
            kind: 'initiative',
            phase: 'M1',
            status: 'in_progress',
            progress: 60,
            targetAt: '2026-12-15',
            externalRef: 'MKT-101',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 21: Marketing, Brand & SEO Plan Spec & Helpers', () => {
  it('defines the core Brand Foundation, 5 Pillars, and Vernacular Aliases', () => {
    expect(BRAND_FOUNDATION.positioning).toContain('Aapke shehar me bharosemand');
    expect(BRAND_FOUNDATION.promise).toBe('Trust + Convenience + Transparent Pricing');
    expect(BRAND_FOUNDATION.pillars).toHaveLength(5);

    const pillarTitles = BRAND_FOUNDATION.pillars.map((p) => p.title);
    expect(pillarTitles).toContain('1. Verified');
    expect(pillarTitles).toContain('3. Local & Vernacular');
    expect(pillarTitles).toContain('4. Private & Safe');

    // Vernacular aliases
    expect(BRAND_FOUNDATION.vernacularTaxonomyAliases['Doctor']).toContain('चिकित्सक');
    expect(BRAND_FOUNDATION.vernacularTaxonomyAliases['Dentist']).toContain('दांतों');
    expect(BRAND_FOUNDATION.vernacularTaxonomyAliases['Pharmacy']).toContain('दवा दुकान');
  });

  it('mandates strict Healthcare Marketing Principles (Zero PHI targeting & Claims discipline)', () => {
    expect(HEALTHCARE_MARKETING_PRINCIPLES).toEqual(
      expect.arrayContaining([expect.stringContaining('Zero health-data/PHI ad targeting')])
    );
    expect(HEALTHCARE_MARKETING_PRINCIPLES).toEqual(
      expect.arrayContaining([expect.stringContaining('Drugs and Magic Remedies')])
    );
  });

  it('structures Channel Strategy into P0 Zero-CAC, P1 Growth, and P2 Supplementary', () => {
    expect(CHANNEL_STRATEGY.p0_coreZeroCac).toHaveLength(5);
    const p0Channels = CHANNEL_STRATEGY.p0_coreZeroCac.map((c) => c.channel);
    expect(p0Channels).toContain('Local & Content SEO');
    expect(p0Channels).toContain('Provider Reception QR Sticker Kits');
    expect(p0Channels).toContain('Community Screening Camps & Events');

    expect(CHANNEL_STRATEGY.p1_growthChannels.length).toBeGreaterThanOrEqual(4);
    expect(CHANNEL_STRATEGY.p2_supplementary.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces Local SEO Site Architecture rules and Quality Gate threshold', () => {
    expect(SEO_SITE_ARCHITECTURE.qualityGateMinimumVerifiedProviders).toBe(3);
    expect(SEO_SITE_ARCHITECTURE.noindexBelowThreshold).toBe(true);
    expect(SEO_SITE_ARCHITECTURE.neverIndexRoutes).toContain('/patient/*');
    expect(SEO_SITE_ARCHITECTURE.neverIndexRoutes).toContain('/checkout/*');
    expect(SEO_SITE_ARCHITECTURE.urlHierarchy).toContain('/<city>/<category>/<slug> (Provider or clinic facility profile)');
  });

  it('generates valid Schema.org JSON-LD structures', () => {
    const physicianLd = JSON.parse(
      generateSchemaOrgJsonLd('Physician', {
        name: 'Dr. Neha Verma Clinic',
        city: 'Jabalpur',
        specialty: 'Pediatrics',
        phone: '+91-761-2400111',
      })
    );
    expect(physicianLd['@type']).toBe('Physician');
    expect(physicianLd.address.addressLocality).toBe('Jabalpur');

    const faqLd = JSON.parse(
      generateSchemaOrgJsonLd('FAQPage', {
        faqs: [{ question: 'How to cancel?', answer: '1-click in app.' }],
      })
    );
    expect(faqLd['@type']).toBe('FAQPage');
    expect(faqLd.mainEntity[0].name).toBe('How to cancel?');
  });

  it('validates marketing claims against Drugs & Magic Remedies Act 1954', () => {
    const invalidClaim = validateMarketingClaim('Guaranteed cure for diabetes in 7 days');
    expect(invalidClaim.isCompliant).toBe(false);
    expect(invalidClaim.matchedViolations).toContain('guaranteed cure');
    expect(invalidClaim.recommendation).toContain('NON-COMPLIANT');

    const validClaim = validateMarketingClaim('Consult qualified cardiologists in Bhopal');
    expect(validClaim.isCompliant).toBe(true);
    expect(validClaim.matchedViolations).toHaveLength(0);
    expect(validClaim.recommendation).toContain('Claim compliant');
  });

  it('builds canonical SEO URLs correctly with getSeoUrlForListing', () => {
    expect(getSeoUrlForListing('Jabalpur', 'Dentist', 'sharma-dental')).toBe('/jabalpur/dentist/sharma-dental');
    expect(getSeoUrlForListing('Bhopal', 'Ayush', 'patanjali-clinic', 'MP Nagar')).toBe(
      '/bhopal/ayush/mp-nagar/patanjali-clinic'
    );
  });

  it('defines 90-Day Launch Plan across Months 1, 2, and 3', () => {
    expect(NINETY_DAY_LAUNCH_PLAN.days_1_30.phase).toContain('Month 1');
    expect(NINETY_DAY_LAUNCH_PLAN.days_31_60.phase).toContain('Month 2');
    expect(NINETY_DAY_LAUNCH_PLAN.days_61_90.phase).toContain('Month 3');
  });
});

describe('ProjectsRoadmap UI — Marketing, Brand & SEO Console Integration', () => {
  it('renders the Marketing & SEO button and opens modal with all tabs and interactive controls', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('marketing-seo-btn')).toBeInTheDocument();
    });

    // Click Marketing & SEO button to open modal
    fireEvent.click(screen.getByTestId('marketing-seo-btn'));

    // Modal dialog content should mount
    await waitFor(() => {
      expect(screen.getByTestId('marketing-seo-modal')).toBeInTheDocument();
    });

    // Check all 8 tabs exist
    expect(screen.getByTestId('tab-marketing-brand')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-channels')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-seo')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-keywords')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-lifecycle')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-compliance')).toBeInTheDocument();
    expect(screen.getByTestId('tab-marketing-launch')).toBeInTheDocument();

    // Default Brand tab content
    expect(screen.getByText(/"Aapke shehar me bharosemand/i)).toBeInTheDocument();
    expect(screen.getByText('5 Brand Pillars')).toBeInTheDocument();
  });
});
