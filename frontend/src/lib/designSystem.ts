/**
 * Document 11 — Design System (UI Kit Spec)
 * Central design tokens, category icon map, surface theming, and formatting helpers.
 * Covers all 24 canonical categories from rolesmd/FindMedi-Categories-Pruned.md.
 */

import React from 'react';
import {
  Stethoscope, Building2, Building, Smile, Eye, TestTube2, Scan, Pill,
  Activity, Apple, Brain, Leaf, Ambulance, Droplet, Waves, Baby,
  HeartHandshake, Sparkles, Syringe, UtensilsCrossed, Briefcase, Home,
  UserCheck, Cross, CalendarHeart, Landmark, Dumbbell, Flower2,
  Accessibility, LucideIcon
} from 'lucide-react';

/* ─── Standard Icon Configuration (Spec 11 §5) ───────────────────────────── */
export const ICON_DEFAULTS = {
  strokeWidth: 1.75,
  size: 20,
} as const;

/* ─── 24 Canonical Categories + Extensions (Spec 11 §5 & Pruned Taxonomy) ── */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Clinical Core
  doctor: Stethoscope,
  clinic: Building2,
  hospital: Building,
  dentist: Smile,
  eye_care: Eye,
  diagnostic_center: TestTube2,
  radiology: Scan,
  pharmacy: Pill,
  physiotherapy: Activity,
  dietitian: Apple,
  mental_health: Brain,
  ayush: Leaf,
  ambulance: Ambulance,
  blood_bank: Droplet,

  // Day-Care & Specialized Centers
  dialysis: Waves,
  ivf_fertility: Baby,
  elder_care: HeartHandshake,
  child_development: Sparkles,
  vaccination_center: Syringe,

  // Allied & Wellness Services
  diet_kitchen: UtensilsCrossed,
  corporate_wellness: Briefcase,
  home_service: Home,
  allied_therapist: UserCheck,
  specialty_center: Cross,

  // Extended Cross-Cutting Modules
  equipment_rental: Accessibility,
  wellness_event: CalendarHeart,
  govt_facility: Landmark,
  fitness_gym: Dumbbell,
  yoga_studio: Flower2,
};

/* ─── Category Cluster Accents (Spec 11 §2.3) ────────────────────────────── */
export type CategoryCluster =
  | 'clinical'
  | 'diagnostics'
  | 'pharmacy'
  | 'mind'
  | 'wellness'
  | 'elder'
  | 'govt'
  | 'events'
  | 'commerce';

export interface CategoryAccent {
  cluster: CategoryCluster;
  tokenVar: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export const CATEGORY_ACCENTS: Record<CategoryCluster, CategoryAccent> = {
  clinical: {
    cluster: 'clinical',
    tokenVar: 'var(--cat-clinical)',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-200 dark:border-teal-800',
    bgClass: 'bg-teal-50 dark:bg-teal-950/40',
  },
  diagnostics: {
    cluster: 'diagnostics',
    tokenVar: 'var(--cat-diagnostics)',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  pharmacy: {
    cluster: 'pharmacy',
    tokenVar: 'var(--cat-pharmacy)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  mind: {
    cluster: 'mind',
    tokenVar: 'var(--cat-mind)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40',
  },
  wellness: {
    cluster: 'wellness',
    tokenVar: 'var(--cat-wellness)',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-800',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40',
  },
  elder: {
    cluster: 'elder',
    tokenVar: 'var(--cat-home)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    textClass: 'text-amber-800 dark:text-amber-200',
    borderClass: 'border-amber-200 dark:border-amber-800',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
  },
  govt: {
    cluster: 'govt',
    tokenVar: 'var(--cat-govt)',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    borderClass: 'border-blue-200 dark:border-blue-800',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
  },
  events: {
    cluster: 'events',
    tokenVar: 'var(--cat-events)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
  },
  commerce: {
    cluster: 'commerce',
    tokenVar: 'var(--cat-commerce)',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-200 dark:border-slate-800',
    bgClass: 'bg-slate-50 dark:bg-slate-900/40',
  },
};

/* ─── Mapping Category Keys to Accent Clusters ───────────────────────────── */
export const CATEGORY_TO_CLUSTER: Record<string, CategoryCluster> = {
  doctor: 'clinical',
  clinic: 'clinical',
  hospital: 'clinical',
  dentist: 'clinical',
  eye_care: 'clinical',
  ayush: 'clinical',
  ambulance: 'clinical',
  blood_bank: 'clinical',
  dialysis: 'clinical',
  ivf_fertility: 'clinical',
  vaccination_center: 'clinical',
  specialty_center: 'clinical',

  diagnostic_center: 'diagnostics',
  radiology: 'diagnostics',

  pharmacy: 'pharmacy',

  mental_health: 'mind',

  physiotherapy: 'wellness',
  dietitian: 'wellness',
  diet_kitchen: 'wellness',
  corporate_wellness: 'wellness',
  fitness_gym: 'wellness',
  yoga_studio: 'wellness',

  elder_care: 'elder',
  child_development: 'elder',
  home_service: 'elder',
  allied_therapist: 'elder',

  govt_facility: 'govt',
  wellness_event: 'events',
  equipment_rental: 'commerce',
};

/* ─── Surface Theming Policies (Spec 11 §15) ─────────────────────────────── */
export type SurfaceType = 'patient' | 'provider' | 'ops' | 'wellness' | 'mind';

export interface SurfaceThemePolicy {
  surface: SurfaceType;
  density: 'comfortable' | 'compact' | 'dense';
  minTapTargetPx: number;
  discreetByDefault: boolean;
  maskPhiByDefault: boolean;
  allowMedicalClaims: boolean;
  accentCluster: CategoryCluster;
  description: string;
}

export const SURFACE_THEMES: Record<SurfaceType, SurfaceThemePolicy> = {
  patient: {
    surface: 'patient',
    density: 'comfortable',
    minTapTargetPx: 44,
    discreetByDefault: false,
    maskPhiByDefault: false,
    allowMedicalClaims: true,
    accentCluster: 'clinical',
    description: 'Light, airy layout with prominent touch targets and optional elder mode.',
  },
  provider: {
    surface: 'provider',
    density: 'compact',
    minTapTargetPx: 36,
    discreetByDefault: false,
    maskPhiByDefault: false,
    allowMedicalClaims: true,
    accentCluster: 'clinical',
    description: 'Productivity-focused dense workspace with rich tabular views and calendar grids.',
  },
  ops: {
    surface: 'ops',
    density: 'dense',
    minTapTargetPx: 32,
    discreetByDefault: false,
    maskPhiByDefault: true,
    allowMedicalClaims: true,
    accentCluster: 'govt',
    description: 'High-density operational console with masked PHI cells and capped exports.',
  },
  wellness: {
    surface: 'wellness',
    density: 'comfortable',
    minTapTargetPx: 44,
    discreetByDefault: false,
    maskPhiByDefault: false,
    allowMedicalClaims: false, // Strict: no medical claims on fitness/gym/yoga surfaces
    accentCluster: 'wellness',
    description: 'Warm lifestyle palette with zero unlicensed medical iconography.',
  },
  mind: {
    surface: 'mind',
    density: 'comfortable',
    minTapTargetPx: 44,
    discreetByDefault: true, // Confidentiality default
    maskPhiByDefault: true,
    allowMedicalClaims: true,
    accentCluster: 'mind',
    description: 'Calm, soft-toned sanctuary with discreet mode active and gentle alerts.',
  },
};

/* ─── Helper Functions ───────────────────────────────────────────────────── */

/** Get canonical icon for category code with safe fallback to Stethoscope */
export function getCategoryIcon(code: string): LucideIcon {
  const normalized = (code || '').toLowerCase().trim().replace(/[-\s]/g, '_');
  return CATEGORY_ICON_MAP[normalized] || Stethoscope;
}

/** Get styling accents for category code */
export function getCategoryAccent(code: string): CategoryAccent {
  const normalized = (code || '').toLowerCase().trim().replace(/[-\s]/g, '_');
  const cluster = CATEGORY_TO_CLUSTER[normalized] || 'clinical';
  return CATEGORY_ACCENTS[cluster];
}

/** Get surface policy */
export function getSurfaceTheme(surface: SurfaceType): SurfaceThemePolicy {
  return SURFACE_THEMES[surface] || SURFACE_THEMES.patient;
}

/** Format currency in Indian standard numbering with ₹ symbol */
export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2).replace(/\.?0+$/, '')} Lakh`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format count in Indian grouping (e.g. 1,50,000) */
export function formatIndianNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}
