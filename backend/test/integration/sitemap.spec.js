import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock dependencies
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCities = [
  { name: 'Bhopal', state: 'Madhya Pradesh', isActive: true },
  { name: 'Indore', state: 'Madhya Pradesh', isActive: true },
];

const mockFacilities = [
  { slug: 'aiims-bhopal', type: 'hospital', city: 'Bhopal', name: 'AIIMS Bhopal', status: 'approved', updatedAt: new Date('2026-10-01') },
  { slug: 'city-hospital-bhopal', type: 'hospital', city: 'Bhopal', name: 'City Hospital', status: 'approved', updatedAt: new Date('2026-10-02') },
  { slug: 'care-clinic-bhopal', type: 'clinic', city: 'Bhopal', name: 'Care Dental Clinic', status: 'approved', updatedAt: new Date('2026-10-03') },
  { slug: 'apollo-pharmacy-bhopal', type: 'pharmacy', city: 'Bhopal', name: 'Apollo Pharmacy', status: 'approved', updatedAt: new Date('2026-10-04') },
];

const mockDoctors = [
  { doctorId: 'DOC-BHP-001', specialization: 'Cardiology', specialtyCode: 'cardiology', location: 'Bhopal', approved: true, updatedAt: new Date('2026-10-01') },
  { doctorId: 'DOC-BHP-002', specialization: 'Dentistry', specialtyCode: 'dentist', location: 'Bhopal', approved: true, updatedAt: new Date('2026-10-02') },
  { doctorId: 'DOC-BHP-003', specialization: 'Pediatrics', specialtyCode: 'pediatrics', location: 'Bhopal', approved: true, updatedAt: new Date('2026-10-03') },
];

const mockPackages = [
  { _id: 'pkg_1', name: 'Full Body Swasthya Checkup', category: 'Comprehensive', isActive: true, updatedAt: new Date('2026-10-05') },
];

jest.unstable_mockModule('../../src/models/City.js', () => ({
  default: {
    find: () => ({
      select: () => ({
        lean: () => Promise.resolve(mockCities),
      }),
    }),
  },
}));

jest.unstable_mockModule('../../src/models/ServiceCity.js', () => ({
  default: {
    find: () => ({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }),
  },
}));

jest.unstable_mockModule('../../src/models/Facility.js', () => ({
  default: {
    find: (filter = {}) => ({
      select: () => ({
        lean: () => Promise.resolve(mockFacilities.filter((f) => !filter.status || f.status === filter.status)),
      }),
      countDocuments: () => Promise.resolve(
        mockFacilities.filter((f) => (!filter.status || f.status === filter.status) && (!filter.city || filter.city.test(f.city))).length
      ),
    }),
  },
}));

jest.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    find: (filter = {}) => ({
      select: () => ({
        lean: () => Promise.resolve(mockDoctors.filter((d) => !filter.approved || d.approved === filter.approved)),
      }),
      countDocuments: () => Promise.resolve(
        mockDoctors.filter((d) => (!filter.approved || d.approved === filter.approved) && (!filter.location || filter.location.test(d.location))).length
      ),
    }),
  },
}));

jest.unstable_mockModule('../../src/models/HealthPackage.js', () => ({
  default: {
    find: () => ({
      select: () => ({
        lean: () => Promise.resolve(mockPackages),
      }),
    }),
  },
}));

process.env.PUBLIC_WEB_URL = 'https://findmedi.in';

const testApp = express();
testApp.use(express.json());

const { default: sitemapRoutes, clearSitemapCache } = await import('../../src/routes/sitemap.js');
testApp.use(sitemapRoutes);

describe('Document 21: Dynamic Sitemap, Robots.txt & Programmatic SEO Architecture', () => {
  beforeEach(() => {
    clearSitemapCache();
  });

  describe('GET /robots.txt', () => {
    it('returns 200 text/plain with disallowed sensitive routes and valid Sitemap directive', async () => {
      const res = await request(testApp).get('/robots.txt');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('User-agent: *');
      expect(res.text).toContain('Disallow: /patient/');
      expect(res.text).toContain('Disallow: /records/');
      expect(res.text).toContain('Disallow: /dashboard/');
      expect(res.text).toContain('Disallow: /checkout/');
      expect(res.text).toContain('Disallow: /auth/');
      expect(res.text).toContain('Disallow: /api/');
      expect(res.text).toContain('Allow: /');
      expect(res.text).toMatch(/Sitemap: https?:\/\/.*\/sitemap\.xml/);
    });
  });

  describe('GET /sitemap.xml', () => {
    it('returns 200 application/xml with XML schema declaration', async () => {
      const res = await request(testApp).get('/sitemap.xml?fresh=1');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/xml/);
      expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    });

    it('indexes core landing pages and active city hubs', async () => {
      const res = await request(testApp).get('/sitemap.xml?fresh=1');

      expect(res.text).toContain('<loc>https://findmedi.in/</loc>');
      expect(res.text).toContain('<loc>https://findmedi.in/about</loc>');
      expect(res.text).toContain('<loc>https://findmedi.in/terms</loc>');
      expect(res.text).toContain('<loc>https://findmedi.in/bhopal/</loc>');
      expect(res.text).toContain('<loc>https://findmedi.in/indore/</loc>');
    });

    it('indexes approved facilities, doctors, and health packages', async () => {
      const res = await request(testApp).get('/sitemap.xml?fresh=1');

      expect(res.text).toContain('/bhopal/doctors/aiims-bhopal');
      expect(res.text).toContain('/doctors/cardiology/bhopal/DOC-BHP-001');
      expect(res.text).toContain('/packages/full-body-swasthya-checkup');
    });

    it('filters out city-category combinations that do not meet the minimum quality threshold of 3 verified providers', async () => {
      const res = await request(testApp).get('/sitemap.xml?fresh=1');

      // In Bhopal: Doctors category has 7 providers (4 facilities + 3 doctors >= 3) -> INDEXED
      expect(res.text).toContain('/bhopal/doctors/');

      // In Indore: 0 facilities and 0 doctors (< 3) -> Must NOT be indexed as thin content
      expect(res.text).not.toContain('/indore/dentist/');
      expect(res.text).not.toContain('/indore/diagnostic-lab/');
    });
  });

  describe('GET /api/seo/sitemap-stats', () => {
    it('returns JSON summary of indexation stats and excluded thin pages', async () => {
      const res = await request(testApp).get('/api/seo/sitemap-stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalUrls).toBeGreaterThan(5);
      expect(res.body.stats.citiesIndexed).toBeGreaterThan(0);
      expect(res.body.stats.thinPagesExcluded).toBeGreaterThan(0);
    });
  });

  describe('GET /api/seo/metadata', () => {
    it('returns rich SEO metadata, canonical URLs, and Schema.org structured data', async () => {
      const res = await request(testApp).get('/api/seo/metadata?city=bhopal&category=doctors');

      expect(res.status).toBe(200);
      expect(res.body.title).toContain('Doctors in Bhopal');
      expect(res.body.canonicalUrl).toBe('/bhopal/doctors/');
      expect(res.body.qualityGate.meetsQualityGate).toBe(true);
      expect(res.body.qualityGate.indexable).toBe(true);
      expect(res.body.schemaOrg['@context']).toBe('https://schema.org');
      expect(res.body.schemaOrg['@type']).toBe('MedicalOrganization');
    });
  });
});
