import { expandSearchQuery } from '../../src/config/searchTaxonomy.js';

describe('Search Taxonomy & Multilingual Engine', () => {
  it('identifies emergency triggers (e.g. chest pain, seene me dard)', () => {
    const res1 = expandSearchQuery('severe chest pain since morning');
    expect(res1.isEmergency).toBe(true);
    expect(res1.emergencyMessage).toContain('108');

    const res2 = expandSearchQuery('seene me dard ho raha hai');
    expect(res2.isEmergency).toBe(true);
    expect(res2.emergencyMessage).toContain('108');
  });

  it('identifies sensitive mental health triggers and returns crisis helpline', () => {
    const res1 = expandSearchQuery('feeling depression and extreme sadness');
    expect(res1.isSensitive).toBe(true);
    expect(res1.crisisHotline).toContain('14416');

    const res2 = expandSearchQuery('bahut tanav hai aur anxiety');
    expect(res2.isSensitive).toBe(true);
    expect(res2.crisisHotline).toContain('Tele-MANAS');
  });

  it('maps colloquial symptoms to specialty and suggested query', () => {
    const res = expandSearchQuery('daant dard ho raha hai');
    expect(res.matchedTaxonomy).not.toBeNull();
    expect(res.matchedTaxonomy.specialty).toBe('Dentistry');
    expect(res.matchedTaxonomy.category).toBe('dental_clinic');

    const res2 = expandSearchQuery('hadda ka doctor');
    expect(res2.matchedTaxonomy).not.toBeNull();
    expect(res2.matchedTaxonomy.specialty).toBe('Orthopaedics');

    const res3 = expandSearchQuery('sugar check blood test');
    expect(res3.matchedTaxonomy).not.toBeNull();
  });

  it('maps the newer colloquial entries (uro/pulmo/ent/neuro)', () => {
    expect(expandSearchQuery('peshab me jalan ho rahi hai').matchedTaxonomy.specialty).toBe('Urology');
    expect(expandSearchQuery('saans phool rahi hai').matchedTaxonomy.specialty).toBe('Pulmonology');
    expect(expandSearchQuery('kaan dukh raha hai morning se').matchedTaxonomy.specialty).toBe('ENT');
    expect(expandSearchQuery('baari baari chakkar aate hain').matchedTaxonomy.specialty).toBe('Neurology');
  });

  it('handles empty or clean strings gracefully', () => {
    const res = expandSearchQuery('');
    expect(res.isEmergency).toBe(false);
    expect(res.isSensitive).toBe(false);
    expect(res.matchedTaxonomy).toBeNull();
  });
});
