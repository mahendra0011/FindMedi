/**
 * LIS Auto-Analyzer Driver Engine (ASTM E1381 / E1394 & HL7 v2.5 LIS Parser)
 * Connects to Biochemistry / Hematology / Immunoassay Analyzers via RS-232 / TCP Socket.
 * Emulates bidirectional communication:
 * 1. Queries LIS for test orders by Accession Number / Barcode
 * 2. Receives raw machine result packets and automatically parses them into structured lab results.
 */

const processedMessageIds = new Set();

export function resetProcessedMessages() {
  processedMessageIds.clear();
}

export function parseAstmPacket(rawAstmText, options = {}) {
  // ASTM E1394 Record Types:
  // H = Header, P = Patient, O = Order, R = Result, C = Comment, L = Terminator
  const lines = rawAstmText.split(/\r?\n|\r/);
  const results = [];
  let currentSampleId = '';

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = line.split('|');
    const recordType = fields[0]?.replace(/^\d+/, ''); // strip sequence digit if present

    if (recordType === 'O') {
      // Order Record: O|1|SampleBarcode|...
      currentSampleId = fields[2] || fields[3] || 'UNKNOWN_SAMPLE';
    } else if (recordType === 'R') {
      // Result Record: R|1|^^^TestCode|Value|Units|RefRange|AbnormalFlag|...
      const testIdent = fields[2] || '';
      const testCode = (testIdent.split('^').filter(Boolean).pop() || testIdent).trim();
      const value = fields[3] || '';
      const units = fields[4] || '';
      const refRange = fields[5] || '';
      const flag = fields[6] || 'N'; // N = Normal, H = High, L = Low, A = Abnormal

      const isUnknown = !testCode
        || testCode.toUpperCase().includes('UNKNOWN')
        || (options.knownTestCodes && !options.knownTestCodes.includes(testCode));

      const isQuarantined = Boolean(isUnknown && (options.quarantineUnknown ?? true));

      results.push({
        sampleId: currentSampleId,
        testCode,
        value: parseFloat(value) || value,
        units: units.trim(),
        referenceRange: refRange.trim(),
        flag: flag.trim(),
        status: isQuarantined
          ? 'QUARANTINE'
          : (flag === 'N' ? 'NORMAL' : 'CRITICAL_ABNORMAL'),
        isQuarantined,
        receivedAt: new Date().toISOString(),
      });
    }
  }

  return {
    protocol: 'ASTM_E1394',
    sampleCount: currentSampleId ? 1 : 0,
    results,
    quarantinedCount: results.filter((r) => r.isQuarantined).length,
  };
}

export function parseHl7OruR01Packet(rawHl7Text, options = {}) {
  // HL7 v2.5 ORU^R01 (Observation Result Unsolicited)
  const segments = rawHl7Text.split(/\r?\n|\r/);
  const results = [];
  let sampleId = '';

  for (const seg of segments) {
    if (seg.startsWith('OBR')) {
      const parts = seg.split('|');
      sampleId = parts[3] || parts[2] || '';
    } else if (seg.startsWith('OBX')) {
      // OBX|1|NM|WBC^White Blood Count^LN||8.5|10*3/uL|4.0-11.0|N|...
      const parts = seg.split('|');
      const testId = parts[3] || '';
      const rawCode = (testId.split('^')[0] || '').trim();
      const testName = testId.split('^')[1] || rawCode || 'Unknown';
      const value = parts[5] || '';
      const units = parts[6] || '';
      const ref = parts[7] || '';
      const flag = parts[8] || 'N';

      const isUnknown = !rawCode
        || rawCode.toUpperCase().includes('UNKNOWN')
        || (options.knownTestCodes && !options.knownTestCodes.includes(rawCode));

      const isQuarantined = Boolean(isUnknown && (options.quarantineUnknown ?? true));

      results.push({
        sampleId,
        testCode: rawCode,
        testName,
        value: parseFloat(value) || value,
        units,
        referenceRange: ref,
        flag,
        status: isQuarantined
          ? 'QUARANTINE'
          : (flag === 'N' ? 'NORMAL' : 'ABNORMAL'),
        isQuarantined,
        receivedAt: new Date().toISOString(),
      });
    }
  }

  return {
    protocol: 'HL7_v2.5_ORU_R01',
    sampleId,
    results,
    quarantinedCount: results.filter((r) => r.isQuarantined).length,
  };
}

export async function processAnalyzerResultUpload({
  analyzerId,
  model,
  rawPayload,
  protocol = 'ASTM',
  messageId,
  knownTestCodes,
  quarantineUnknown = true,
}) {
  if (messageId && processedMessageIds.has(messageId)) {
    return {
      duplicate: true,
      idempotent: true,
      messageId,
      analyzerId: analyzerId || 'BIOCHEM-XL-640',
      analyzerModel: model || 'Erba Lachema XL-640',
      parsedRecords: 0,
      data: { protocol, results: [], sampleCount: 0 },
      importedAt: new Date(),
    };
  }

  if (messageId) {
    processedMessageIds.add(messageId);
  }

  const parseOpts = { knownTestCodes, quarantineUnknown };
  let parsed;
  if (protocol.toUpperCase() === 'HL7') {
    parsed = parseHl7OruR01Packet(rawPayload, parseOpts);
  } else {
    parsed = parseAstmPacket(rawPayload, parseOpts);
  }

  return {
    analyzerId: analyzerId || 'BIOCHEM-XL-640',
    analyzerModel: model || 'Erba Lachema XL-640',
    messageId: messageId || null,
    duplicate: false,
    idempotent: false,
    parsedRecords: parsed.results.length,
    quarantinedRecords: parsed.quarantinedCount || 0,
    data: parsed,
    importedAt: new Date(),
  };
}
