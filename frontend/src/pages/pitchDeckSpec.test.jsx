/**
 * Document 22 — Pitch / Investor Deck Outline (+ Q&A prep) Test Suite
 * Validating:
 * 1. 14-Slide Pitch Deck Structure (Vision, Problem, Timing, Solution, Proof, Traction, Market, Model, GTM, Moat, Trust, Roadmap, Team, Ask)
 * 2. 5-Step 3-Minute Quick Pitch & Hindi Elevator Narrative Script
 * 3. TAM / SAM / SOM Market Sizing Modeling ($110B TAM, $22B SAM, $18M SOM)
 * 4. Bottom-Up City Market Potential Math & Realtime Sensitivity Calculator
 * 5. Complete 13-Question Hard Investor Q&A Objection-Defense Matrix
 * 6. Due-Diligence Data Room Index (Corporate, Product, Compliance, Financials, Commercial)
 * 7. Funding Path Alternatives (Angel syndicates, Startup India, MP State policy, CSR, CVC)
 * 8. 3-Phase GTM Expansion Roadmap (Pilot → MP Cluster → Central India)
 * 9. ProjectsRoadmap UI Integration (Interactive Modal, 6 Tabs, Slide Navigator, Realtime Calculator, Q&A Selector)
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
} from '@/lib/pitchDeck';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-pitch-1',
            title: 'Seed Round Fundraising & Data Room Preparation',
            kind: 'initiative',
            phase: 'F1',
            status: 'in_progress',
            progress: 80,
            targetAt: '2026-12-31',
            externalRef: 'DECK-2026',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 22: Pitch / Investor Deck Outline Spec & Calculations', () => {
  it('defines the complete 14-slide Pitch Deck Outline with key takeaways', () => {
    expect(PITCH_DECK_SLIDES).toHaveLength(14);

    expect(PITCH_DECK_SLIDES[0].slideNumber).toBe(1);
    expect(PITCH_DECK_SLIDES[0].title).toContain('Healthcare for Bharat');
    expect(PITCH_DECK_SLIDES[0].category).toBe('Vision & Hook');

    expect(PITCH_DECK_SLIDES[1].slideNumber).toBe(2);
    expect(PITCH_DECK_SLIDES[1].title).toContain('The Problem');

    expect(PITCH_DECK_SLIDES[2].slideNumber).toBe(3);
    expect(PITCH_DECK_SLIDES[2].title).toContain('Why Now?');

    expect(PITCH_DECK_SLIDES[3].slideNumber).toBe(4);
    expect(PITCH_DECK_SLIDES[3].title).toContain('The Solution');

    expect(PITCH_DECK_SLIDES[6].slideNumber).toBe(7);
    expect(PITCH_DECK_SLIDES[6].title).toContain('Market Opportunity: TAM / SAM / SOM');

    expect(PITCH_DECK_SLIDES[13].slideNumber).toBe(14);
    expect(PITCH_DECK_SLIDES[13].title).toContain('The Ask');
    expect(PITCH_DECK_SLIDES[13].bullets[0]).toContain('$1.2M Seed Round');
  });

  it('defines 5-step 3-minute pitch and vernacular narrative script', () => {
    expect(THREE_MINUTE_PITCH).toHaveLength(5);
    expect(NARRATIVE_SCRIPT.hindiScript).toContain('Aapke ghar me kisi ko dard hota hai');
  });

  it('defines TAM / SAM / SOM market sizing parameters', () => {
    expect(MARKET_SIZING_FRAMEWORK.tam.valueUsd).toBe('$110 Billion');
    expect(MARKET_SIZING_FRAMEWORK.sam.valueUsd).toBe('$22 Billion');
    expect(MARKET_SIZING_FRAMEWORK.som.valueUsd).toBe('$18 Million');
  });

  it('provides robust objection-defense arguments for all 13 hard investor questions', () => {
    expect(INVESTOR_QA_MATRIX).toHaveLength(13);
    const ids = INVESTOR_QA_MATRIX.map((q) => q.id);
    expect(ids).toContain('QA-01'); // Competition
    expect(ids).toContain('QA-02'); // Disintermediation
    expect(ids).toContain('QA-03'); // Unit economics
    expect(ids).toContain('QA-04'); // Regulatory
    expect(ids).toContain('QA-05'); // Data Privacy
    expect(ids).toContain('QA-06'); // Supply quality
    expect(ids).toContain('QA-07'); // CAC & Scalability
    expect(ids).toContain('QA-08'); // Team
    expect(ids).toContain('QA-09'); // Moat
    expect(ids).toContain('QA-10'); // Exit path
    expect(ids).toContain('QA-11'); // Key risks
    expect(ids).toContain('QA-12'); // Data breach
    expect(ids).toContain('QA-13'); // AI usage

    const compQa = INVESTOR_QA_MATRIX.find((q) => q.id === 'QA-01');
    expect(compQa?.defensePoints).toEqual(
      expect.arrayContaining([expect.stringContaining('₹0 CAC via physical clinic reception QR stands')])
    );
  });

  it('defines Due-Diligence Data Room checklist and Funding Path alternatives', () => {
    expect(DUE_DILIGENCE_DATA_ROOM).toHaveLength(5);
    expect(FUNDING_PATH_ALTERNATIVES).toHaveLength(5);
  });

  it('defines the 3-Phase GTM Expansion Roadmap', () => {
    expect(GTM_THREE_PHASE_ROADMAP).toHaveLength(3);
    expect(GTM_THREE_PHASE_ROADMAP[0].phase).toContain('Phase 1: Pilot City Dominance');
    expect(GTM_THREE_PHASE_ROADMAP[1].phase).toContain('Phase 2: Regional Cluster Expansion');
    expect(GTM_THREE_PHASE_ROADMAP[2].phase).toContain('Phase 3: Multi-State Scale');
  });

  it('calculates bottom-up city market potential accurately', () => {
    const pot = calculateCityMarketPotential({
      cityPopulation: 1800000,
      averageHouseholdSize: 4.5,
      annualHouseholdHealthSpend: 30000,
      outpatientSharePercent: 60,
      digitalPenetrationPercent: 20,
      findmediTargetSharePercent: 25,
      takeRatePercent: 12,
    });

    // 1.8M / 4.5 = 400,000 households
    expect(pot.households).toBe(400000);
    // 400,000 * 30,000 = ₹1,200 Cr
    expect(pot.totalCityHealthSpendInr).toBe(12000000000);
    // 60% OPD = ₹720 Cr
    expect(pot.outpatientSpendInr).toBe(7200000000);
    // 20% digital = ₹144 Cr
    expect(pot.addressableDigitalSpendInr).toBe(1440000000);
    // 25% target GMV = ₹36 Cr
    expect(pot.findmediGmvInr).toBe(360000000);
    // 12% take rate = ₹4.32 Cr
    expect(pot.findmediRevenueInr).toBe(43200000);
    expect(pot.monthlyRevenueInr).toBe(3600000);
  });
});

describe('ProjectsRoadmap UI — Investor Pitch Deck Console Integration', () => {
  it('renders the Investor Pitch Deck button and opens modal with all 6 tabs and interactive controls', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    // Wait for button
    await waitFor(() => {
      expect(screen.getByTestId('pitch-deck-btn')).toBeInTheDocument();
    });

    // Open Investor Deck Modal
    fireEvent.click(screen.getByTestId('pitch-deck-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('pitch-deck-modal')).toBeInTheDocument();
    });

    // Verify all 6 tabs exist
    expect(screen.getByTestId('tab-pitch-slides')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pitch-threemin')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pitch-marketsize')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pitch-qa')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pitch-dataroom')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pitch-gtm')).toBeInTheDocument();

    // Verify slide navigator and default Slide 1
    expect(screen.getByTestId('slide-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('slide-btn-14')).toBeInTheDocument();
    expect(screen.getByTestId('active-slide-card')).toBeInTheDocument();
    expect(screen.getByText(/Healthcare for Bharat/i)).toBeInTheDocument();
  });
});
