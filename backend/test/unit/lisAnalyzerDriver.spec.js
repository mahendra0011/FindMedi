import { describe, it, expect } from '@jest/globals';
import { parseAstmPacket, parseHl7OruR01Packet, processAnalyzerResultUpload } from '../../src/services/lisAnalyzerDriver.js';
import { parseAstmFrame } from '../../src/lib/astm.js';

describe('LIS Analyzer Driver: ASTM E1394 & HL7 Ingestion', () => {
  const SAMPLE_ASTM = [
    'H|\\^&|||ERBA^XL640||||||||1394-97',
    'P|1||||PATIENT^SAMPLE|||||||',
    'O|1|SAMP-9988||^^^GLU|R||||||A',
    'R|1|^^^GLU|105|mg/dL|70-99|H||F||||202610121100',
    'R|2|^^^CREAT|1.1|mg/dL|0.7-1.3|N||F||||202610121100',
    'L|1|N',
  ].join('\r');

  it('parses ASTM E1394 packet into structured sample results', () => {
    const res = parseAstmPacket(SAMPLE_ASTM);
    expect(res.protocol).toBe('ASTM_E1394');
    expect(res.sampleCount).toBe(1);
    expect(res.results).toHaveLength(2);

    const glu = res.results.find((r) => r.testCode === 'GLU');
    expect(glu).toBeDefined();
    expect(glu.sampleId).toBe('SAMP-9988');
    expect(glu.value).toBe(105);
    expect(glu.units).toBe('mg/dL');
    expect(glu.flag).toBe('H');
    expect(glu.status).toBe('CRITICAL_ABNORMAL');

    const creat = res.results.find((r) => r.testCode === 'CREAT');
    expect(creat.value).toBe(1.1);
    expect(creat.status).toBe('NORMAL');
  });

  const SAMPLE_HL7 = [
    'MSH|^~\\&|MINDRAY|BC6800|LIS|LAB|202610121200||ORU^R01|MSG001|P|2.5',
    'PID|1||PAT-123',
    'OBR|1||ACC-5544|CBC^Complete Blood Count',
    'OBX|1|NM|WBC^White Blood Count||12.5|10*3/uL|4.0-11.0|H|||F',
    'OBX|2|NM|HGB^Hemoglobin||14.0|g/dL|13.0-17.0|N|||F',
  ].join('\r');

  it('parses HL7 v2.5 ORU^R01 packet', () => {
    const res = parseHl7OruR01Packet(SAMPLE_HL7);
    expect(res.protocol).toBe('HL7_v2.5_ORU_R01');
    expect(res.sampleId).toBe('ACC-5544');
    expect(res.results).toHaveLength(2);

    expect(res.results[0].testCode).toBe('WBC');
    expect(res.results[0].value).toBe(12.5);
    expect(res.results[0].flag).toBe('H');
    expect(res.results[0].status).toBe('ABNORMAL');
  });

  it('processes unified analyzer upload driver', async () => {
    const uploadRes = await processAnalyzerResultUpload({
      analyzerId: 'analyz-01',
      model: 'Mindray BC-6800',
      rawPayload: SAMPLE_HL7,
      protocol: 'HL7',
    });
    expect(uploadRes.parsedRecords).toBe(2);
    expect(uploadRes.data.sampleId).toBe('ACC-5544');
    expect(uploadRes.analyzerId).toBe('analyz-01');
  });

  it('correctly handles ASTM low-level framing checks', () => {
    const STX = '\x02';
    const ETX = '\x03';
    const CR = '\r';
    const LF = '\n';
    const frame = `${STX}1H|\\^&|||SENDER\rO|1|ACC-101|^^^WBC\rR|1|^^^WBC|8.0${ETX}3A${CR}${LF}`;

    const parsed = parseAstmFrame(frame);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.orders[0].sampleId).toBe('ACC-101');
    expect(parsed.results[0].value).toBe('8.0');
  });
});
