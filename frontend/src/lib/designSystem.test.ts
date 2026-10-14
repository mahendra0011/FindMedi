import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ICON_MAP,
  CATEGORY_ACCENTS,
  SURFACE_THEMES,
  getCategoryIcon,
  getCategoryAccent,
  getSurfaceTheme,
  formatIndianCurrency,
  formatIndianNumber,
  ICON_DEFAULTS,
} from './designSystem';
import { Stethoscope, Smile, Pill, Brain, Dumbbell } from 'lucide-react';

describe('Document 11 — Design System (UI Kit Spec)', () => {
  describe('Standard Icon Configuration (Spec 11 §5)', () => {
    it('defines stroke width 1.75 and default size 20', () => {
      expect(ICON_DEFAULTS.strokeWidth).toBe(1.75);
      expect(ICON_DEFAULTS.size).toBe(20);
    });
  });

  describe('Canonical Category Icon Mapping (Spec 11 §5 & Pruned Taxonomy)', () => {
    const canonicalCategories = [
      'doctor', 'clinic', 'hospital', 'dentist', 'eye_care',
      'diagnostic_center', 'radiology', 'pharmacy', 'physiotherapy',
      'dietitian', 'mental_health', 'ayush', 'ambulance', 'blood_bank',
      'dialysis', 'ivf_fertility', 'elder_care', 'child_development',
      'vaccination_center', 'diet_kitchen', 'corporate_wellness',
      'home_service', 'allied_therapist', 'specialty_center',
    ];

    it('has an icon mapping for each of the 24 canonical categories', () => {
      for (const cat of canonicalCategories) {
        const icon = CATEGORY_ICON_MAP[cat];
        expect(icon).toBeDefined();
        // Lucide components are React functional or forwardRef components
        expect(typeof icon === 'function' || typeof icon === 'object').toBe(true);
      }
    });

    it('resolves correct icons via getCategoryIcon()', () => {
      expect(getCategoryIcon('dentist')).toBe(Smile);
      expect(getCategoryIcon('pharmacy')).toBe(Pill);
      expect(getCategoryIcon('mental_health')).toBe(Brain);
      expect(getCategoryIcon('fitness_gym')).toBe(Dumbbell);
    });

    it('falls back to Stethoscope for unrecognized category codes', () => {
      expect(getCategoryIcon('unknown_specialty')).toBe(Stethoscope);
      expect(getCategoryIcon('')).toBe(Stethoscope);
    });

    it('handles kebab-case and case variations gracefully', () => {
      expect(getCategoryIcon('eye-care')).toBe(getCategoryIcon('eye_care'));
      expect(getCategoryIcon('Mental Health')).toBe(getCategoryIcon('mental_health'));
    });
  });

  describe('Category Accent Clusters (Spec 11 §2.3)', () => {
    it('defines all 9 core category clusters with WCAG compliant tokens', () => {
      const requiredClusters = [
        'clinical', 'diagnostics', 'pharmacy', 'mind', 'wellness',
        'elder', 'govt', 'events', 'commerce'
      ];

      for (const cluster of requiredClusters) {
        const accent = CATEGORY_ACCENTS[cluster as keyof typeof CATEGORY_ACCENTS];
        expect(accent).toBeDefined();
        expect(accent.tokenVar).toContain('--cat-');
        expect(accent.badgeClass).toContain('dark:');
        expect(accent.textClass).toBeDefined();
      }
    });

    it('returns appropriate cluster styling for categories', () => {
      const clinicAccent = getCategoryAccent('hospital');
      expect(clinicAccent.cluster).toBe('clinical');

      const mindAccent = getCategoryAccent('mental_health');
      expect(mindAccent.cluster).toBe('mind');

      const pharmacyAccent = getCategoryAccent('pharmacy');
      expect(pharmacyAccent.cluster).toBe('pharmacy');
    });
  });

  describe('Surface Theming Policies (Spec 11 §15)', () => {
    it('enforces patient surface accessibility (min 44px tap target)', () => {
      const patient = getSurfaceTheme('patient');
      expect(patient.minTapTargetPx).toBeGreaterThanOrEqual(44);
      expect(patient.density).toBe('comfortable');
    });

    it('enforces ops surface high-density and PHI masking', () => {
      const ops = getSurfaceTheme('ops');
      expect(ops.density).toBe('dense');
      expect(ops.maskPhiByDefault).toBe(true);
    });

    it('enforces discreet mode default on mind/counselling surface', () => {
      const mind = getSurfaceTheme('mind');
      expect(mind.discreetByDefault).toBe(true);
    });

    it('prohibits unlicensed medical claims on wellness surface', () => {
      const wellness = getSurfaceTheme('wellness');
      expect(wellness.allowMedicalClaims).toBe(false);
    });
  });

  describe('Indian Number & Currency Formatting (Spec 11 §12)', () => {
    it('formats standard Indian rupee amounts', () => {
      expect(formatIndianCurrency(500)).toContain('500');
      expect(formatIndianCurrency(1500)).toContain('1,500');
      expect(formatIndianCurrency(150000)).toBe('₹1.5 Lakh');
      expect(formatIndianCurrency(20000000)).toBe('₹2 Cr');
    });

    it('formats numbers using Indian grouping commas', () => {
      expect(formatIndianNumber(1000)).toBe('1,000');
      expect(formatIndianNumber(150000)).toBe('1,50,000');
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
    });
  });
});
