import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const mockStudies = [
  {
    _id: '507f191e810c19729de860r1',
    orderId: 'RAD-2026-001',
    studyUid: '1.2.840.113619.2.55.3.604688432',
    modality: 'CT',
    bodyPart: 'Chest',
    status: 'COMPLETED',
    imageUrls: ['https://storage.findmedi.in/dicom/img1.dcm'],
  },
];

const { as } = await mountApp('radiology', {
  '../../src/models/Radiology.js': () => ({
    default: {
      findById: (id) => ({
        select: () => Promise.resolve(mockStudies.find((s) => String(s._id) === String(id)) || null),
      }),
    },
  }),
});

describe('DICOM PACS Viewer URL & Study Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const radiologist = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'radiologist',
    permissions: ['radiology:read', 'radiology:write'],
  };

  it('rejects viewer URL request without studyUid parameter', async () => {
    await as(radiologist).get('/dicom/viewer-url').expect(400);
  });

  it('generates OHIF viewer URL when OHIF_URL environment variable is set', async () => {
    process.env.OHIF_URL = 'https://pacs.findmedi.in/ohif';
    const studyUid = '1.2.840.113619.2.55.3.604688432';

    const res = await as(radiologist)
      .get(`/dicom/viewer-url?studyUid=${studyUid}`)
      .expect(200);

    expect(res.body.viewer).toBe('ohif');
    expect(res.body.url).toBe(`https://pacs.findmedi.in/ohif/viewer?StudyInstanceUIDs=${studyUid}`);
  });

  it('falls back to Orthanc viewer URL when OHIF_URL is not configured', async () => {
    delete process.env.OHIF_URL;
    process.env.ORTHANC_HTTP_URL = 'http://localhost:8042';
    const studyUid = '1.2.840.113619.2.55.3.604688432';

    const res = await as(radiologist)
      .get(`/dicom/viewer-url?studyUid=${studyUid}`)
      .expect(200);

    expect(res.body.viewer).toBe('orthanc');
    expect(res.body.url).toContain('http://localhost:8042/viewer?StudyInstanceUID=');
  });

  it('fetches DICOM study metadata linked to radiology order', async () => {
    const res = await as(radiologist)
      .get('/dicom/studies?orderId=507f191e810c19729de860r1')
      .expect(200);

    expect(res.body.modality).toBe('CT');
    expect(res.body.studyUid).toBe('1.2.840.113619.2.55.3.604688432');
    expect(res.body.imageCount).toBe(1);
  });
});
